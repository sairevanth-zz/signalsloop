/**
 * Competitive Intelligence - Competitor Extractor
 * Automatically identifies and extracts competitor mentions from discovered feedback
 * Uses GPT-4o-mini for cost-effective extraction (~$0.002 per feedback item)
 */

import OpenAI from 'openai';
import { getSupabaseServiceRoleClient } from '../supabase-client';
import { withCache } from '../ai-cache-manager';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODELS = {
  EXTRACTION: process.env.COMPETITOR_EXTRACTION_MODEL || 'gpt-4o-mini',
};

// Type definitions
export interface CompetitorMention {
  competitor_name: string;
  mention_type: 'comparison' | 'switch_to' | 'switch_from' | 'feature_comparison' | 'general';
  context: string;
  sentiment_vs_us: number; // -1 to +1
  sentiment_about_competitor: number; // -1 to +1
  key_points: string[];
}

export interface ExtractionResult {
  mentions: CompetitorMention[];
  hasCompetitors: boolean;
  extractedAt: string;
}

export interface Competitor {
  id: string;
  project_id: string;
  name: string;
  auto_detected: boolean;
  status: 'active' | 'monitoring' | 'dismissed';
  total_mentions: number;
}

/**
 * System prompt for competitor extraction
 */
const COMPETITOR_EXTRACTION_PROMPT = `You are an expert at identifying competitor product mentions in customer feedback.

Your task is to analyze feedback text and extract ALL competitor product mentions, even if they're subtle.

For each competitor mentioned, identify:

1. **competitor_name**: The exact product/company name mentioned
2. **mention_type**:
   - "comparison": User is comparing products (e.g., "YourApp vs Asana")
   - "switch_to": User switched FROM this competitor TO the product being discussed (positive for us)
   - "switch_from": User switched FROM the product TO this competitor (negative for us)
   - "feature_comparison": User wants a feature that competitor has (e.g., "needs dark mode like Notion")
   - "general": General mention without clear context

3. **context**: The specific sentence where the competitor was mentioned (extract verbatim)

4. **sentiment_vs_us**: How does the user compare US to the competitor?
   - +1.0: Strongly favors us ("switched from Linear to YourApp - so much better!")
   - +0.5: Somewhat favors us ("YourApp is easier than Asana")
   - 0.0: Neutral comparison
   - -0.5: Somewhat favors them ("Notion has better formatting")
   - -1.0: Strongly favors them ("Moving to Airtable, YourApp lacks features")

5. **sentiment_about_competitor**: User's general feeling about the competitor (independent of us)
   - +1.0: Very positive about competitor
   - 0.0: Neutral
   - -1.0: Very negative about competitor

6. **key_points**: Array of specific insights (what they said about the competitor or comparison)

**Examples:**

Input: "I switched from Linear to YourApp because the pricing was too high. Love YourApp so far!"
Output:
{
  "competitor_name": "Linear",
  "mention_type": "switch_from",
  "context": "I switched from Linear to YourApp because the pricing was too high.",
  "sentiment_vs_us": 0.8,
  "sentiment_about_competitor": -0.3,
  "key_points": ["User left Linear due to high pricing", "User is happy with YourApp"]
}

Input: "YourApp needs dark mode like Notion has. That's the only thing missing."
Output:
{
  "competitor_name": "Notion",
  "mention_type": "feature_comparison",
  "context": "YourApp needs dark mode like Notion has.",
  "sentiment_vs_us": -0.4,
  "sentiment_about_competitor": 0.6,
  "key_points": ["Notion has dark mode feature", "User wants YourApp to have it", "Otherwise satisfied"]
}

Input: "Considering YourApp vs Asana for our team. Both look good."
Output:
{
  "competitor_name": "Asana",
  "mention_type": "comparison",
  "context": "Considering YourApp vs Asana for our team.",
  "sentiment_vs_us": 0.0,
  "sentiment_about_competitor": 0.5,
  "key_points": ["User evaluating both products", "Considering for team use"]
}

Input: "Moving to Airtable. YourApp doesn't have the database features we need."
Output:
{
  "competitor_name": "Airtable",
  "mention_type": "switch_to",
  "context": "Moving to Airtable. YourApp doesn't have the database features we need.",
  "sentiment_vs_us": -0.9,
  "sentiment_about_competitor": 0.7,
  "key_points": ["Switching to Airtable", "YourApp lacks database features", "User is churning"]
}

**Important:**
- Handle variations (e.g., "Linear", "@linear", "Linear app" = same competitor)
- Extract ALL mentions, even if multiple competitors in one feedback
- Be generous with detection - if it seems like a competitor mention, extract it
- If no competitors mentioned, return empty array

Return JSON object with this structure:
{
  "mentions": [
    {
      "competitor_name": "string",
      "mention_type": "comparison|switch_to|switch_from|feature_comparison|general",
      "context": "string",
      "sentiment_vs_us": number (-1 to 1),
      "sentiment_about_competitor": number (-1 to 1),
      "key_points": ["string", "string"]
    }
  ]
}`;

/**
 * Extract competitor mentions from feedback text (internal, uncached)
 */
async function extractCompetitorMentionsInternal(
  feedbackText: string,
  productName: string,
  knownCompetitorNames: string[],
): Promise<ExtractionResult> {
  const userPrompt = `Product being discussed: ${productName}

${knownCompetitorNames.length > 0 ? `Known competitors: ${knownCompetitorNames.join(', ')}\n` : ''}
Feedback text:
${feedbackText}

Extract ALL competitor mentions from this feedback.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODELS.EXTRACTION,
      messages: [
        { role: 'system', content: COMPETITOR_EXTRACTION_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2, // Low temperature for consistent extraction
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content);

    // Validate and sanitize
    const mentions = (result.mentions || []).map((mention: CompetitorMention) => ({
      ...mention,
      sentiment_vs_us: Math.max(-1, Math.min(1, mention.sentiment_vs_us || 0)),
      sentiment_about_competitor: Math.max(-1, Math.min(1, mention.sentiment_about_competitor || 0)),
      key_points: Array.isArray(mention.key_points) ? mention.key_points : [],
    }));

    return {
      mentions,
      hasCompetitors: mentions.length > 0,
      extractedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[COMPETITOR_EXTRACTOR] Extraction failed:', error);
    throw error;
  }
}

/**
 * Extract competitor mentions with caching
 */
export const extractCompetitorMentionsCached = withCache(
  extractCompetitorMentionsInternal,
  'competitor-extraction',
  (feedbackText: string, productName: string) => {
    return `${productName}:${feedbackText.slice(0, 200)}`;
  },
);

/**
 * Get or create competitor in database
 */
async function getOrCreateCompetitor(
  projectId: string,
  competitorName: string,
): Promise<Competitor> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) throw new Error('Supabase client not available');

  // Check if exists (case-insensitive)
  const { data: existing, error: selectError } = await supabase
    .from('competitors')
    .select('*')
    .eq('project_id', projectId)
    .ilike('name', competitorName)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('[COMPETITOR_EXTRACTOR] Error checking competitor:', selectError);
  }

  if (existing) {
    return existing as Competitor;
  }

  // Create new competitor (auto-detected)
  const { data: newCompetitor, error: insertError } = await supabase
    .from('competitors')
    .insert({
      project_id: projectId,
      name: competitorName,
      auto_detected: true,
      status: 'monitoring',
      first_mentioned_at: new Date().toISOString(),
      total_mentions: 0,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[COMPETITOR_EXTRACTOR] Error creating competitor:', insertError);
    throw new Error(`Failed to create competitor: ${insertError.message}`);
  }

  console.log(`[COMPETITOR_EXTRACTOR] Auto-detected new competitor: ${competitorName} for project ${projectId}`);

  return newCompetitor as Competitor;
}

/**
 * Store competitive mention in database
 */
async function storeCompetitiveMention(
  feedbackId: string,
  competitorId: string,
  mention: CompetitorMention,
): Promise<void> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) throw new Error('Supabase client not available');

  const { error } = await supabase.from('competitive_mentions').upsert(
    {
      feedback_id: feedbackId,
      competitor_id: competitorId,
      mention_type: mention.mention_type,
      context_snippet: mention.context,
      sentiment_vs_you: mention.sentiment_vs_us,
      sentiment_about_competitor: mention.sentiment_about_competitor,
      key_points: mention.key_points,
      extracted_at: new Date().toISOString(),
    },
    {
      onConflict: 'feedback_id,competitor_id',
    },
  );

  if (error) {
    console.error('[COMPETITOR_EXTRACTOR] Error storing mention:', error);
    throw new Error(`Failed to store mention: ${error.message}`);
  }
}

/**
 * Main function: Extract and store competitor mentions from discovered feedback
 * This is called automatically when new feedback is discovered
 */
export async function extractCompetitorMentions(feedbackId: string): Promise<{
  success: boolean;
  mentionsFound: number;
  competitorsDetected: string[];
  error?: string;
}> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return { success: false, mentionsFound: 0, competitorsDetected: [], error: 'Supabase client not available' };
  }

  try {
    // 1. Get feedback content
    const { data: feedback, error: feedbackError } = await supabase
      .from('discovered_feedback')
      .select('*, projects(name)')
      .eq('id', feedbackId)
      .single();

    if (feedbackError || !feedback) {
      console.error('[COMPETITOR_EXTRACTOR] Feedback not found:', feedbackError);
      return { success: false, mentionsFound: 0, competitorsDetected: [], error: 'Feedback not found' };
    }

    // 2. Get project's known competitors
    const { data: knownCompetitors } = await supabase
      .from('competitors')
      .select('name')
      .eq('project_id', feedback.project_id)
      .eq('status', 'active');

    const knownCompetitorNames = knownCompetitors?.map((c) => c.name) || [];

    // 3. Extract competitor mentions using AI
    const productName = (feedback.projects as { name?: string })?.name || 'this product';
    const extractionResult = await extractCompetitorMentionsCached(
      feedback.content,
      productName,
      knownCompetitorNames,
    );

    if (!extractionResult.hasCompetitors) {
      console.log(`[COMPETITOR_EXTRACTOR] No competitors found in feedback ${feedbackId}`);
      return { success: true, mentionsFound: 0, competitorsDetected: [] };
    }

    // 4. Store each mention
    const competitorsDetected: string[] = [];

    for (const mention of extractionResult.mentions) {
      // Get or create competitor
      const competitor = await getOrCreateCompetitor(feedback.project_id, mention.competitor_name);

      // Store mention
      await storeCompetitiveMention(feedbackId, competitor.id, mention);

      // Increment competitor mention count
      await supabase.rpc('increment_competitor_mentions', {
        p_competitor_id: competitor.id,
      });

      competitorsDetected.push(competitor.name);
    }

    console.log(
      `[COMPETITOR_EXTRACTOR] Extracted ${extractionResult.mentions.length} competitive mentions from feedback ${feedbackId}`,
    );

    return {
      success: true,
      mentionsFound: extractionResult.mentions.length,
      competitorsDetected: [...new Set(competitorsDetected)], // Deduplicate
    };
  } catch (error) {
    console.error('[COMPETITOR_EXTRACTOR] Error processing feedback:', error);
    return {
      success: false,
      mentionsFound: 0,
      competitorsDetected: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch process multiple feedback items
 */
export async function extractCompetitorMentionsBatch(feedbackIds: string[]): Promise<{
  processed: number;
  successful: number;
  failed: number;
  totalMentions: number;
}> {
  let successful = 0;
  let failed = 0;
  let totalMentions = 0;

  for (const feedbackId of feedbackIds) {
    try {
      const result = await extractCompetitorMentions(feedbackId);
      if (result.success) {
        successful++;
        totalMentions += result.mentionsFound;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`[COMPETITOR_EXTRACTOR] Failed to process ${feedbackId}:`, error);
      failed++;
    }

    // Small delay to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return {
    processed: feedbackIds.length,
    successful,
    failed,
    totalMentions,
  };
}

/**
 * Get unprocessed feedback items that need competitive extraction
 */
export async function getPendingFeedbackForExtraction(projectId: string, limit: number = 50): Promise<string[]> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return [];

  // Get feedback items that haven't been analyzed for competitors yet
  const { data: feedback } = await supabase
    .from('discovered_feedback')
    .select('id')
    .eq('project_id', projectId)
    .is('is_duplicate', false)
    .is('is_archived', false)
    .limit(limit)
    .order('discovered_at', { ascending: false });

  if (!feedback) return [];

  // Filter out items that already have competitive mentions
  const feedbackIds = feedback.map((f) => f.id);

  const { data: existingMentions } = await supabase
    .from('competitive_mentions')
    .select('feedback_id')
    .in('feedback_id', feedbackIds);

  const processedIds = new Set(existingMentions?.map((m) => m.feedback_id) || []);

  return feedbackIds.filter((id) => !processedIds.has(id));
}
