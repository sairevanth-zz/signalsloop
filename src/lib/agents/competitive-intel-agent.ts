/**
 * Competitive Intelligence Agent (Phase 3)
 *
 * Listens to: feedback.created
 * Actions: Extracts competitor mentions and tracks competitive threats
 * Triggers: competitor.mentioned event
 *
 * This agent automatically detects when users mention competitors
 * and helps track competitive landscape
 */

import { DomainEvent } from '@/lib/events/types';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { publishEvent } from '@/lib/events/publisher';
import { EventType, AggregateType } from '@/lib/events/types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Common competitor keywords to quickly filter
const COMPETITOR_KEYWORDS = [
  'competitor', 'alternative', 'instead', 'switch', 'migrate',
  'better than', 'compared to', 'like', 'similar to',
];

/**
 * Handle feedback.created event
 * Extract competitor mentions and analyze competitive threats
 */
export async function handleCompetitorExtraction(event: DomainEvent): Promise<void> {
  const startTime = Date.now();
  const { payload, metadata } = event;

  const text = `${payload.title} ${payload.content || ''}`.toLowerCase();

  // Quick keyword filter before expensive AI call
  const hasCompetitorKeyword = COMPETITOR_KEYWORDS.some(keyword => text.includes(keyword));

  if (!hasCompetitorKeyword) {
    // No obvious competitor mention - skip AI analysis
    return;
  }

  console.log(`[COMPETITIVE INTEL AGENT] 📨 Potential competitor mention detected`);

  try {
    const supabase = getServiceRoleClient();

    // Get full post for context
    const { data: post } = await supabase
      .from('posts')
      .select('id, title, content, category, project_id, user_id')
      .eq('id', event.aggregate_id)
      .single();

    if (!post) return;

    // Use AI to extract competitor mentions and features
    const analysis = await extractCompetitorMentions(
      post.title,
      post.content || ''
    );

    if (analysis.competitors.length === 0) {
      console.log('[COMPETITIVE INTEL AGENT] ⏭️  No actual competitors mentioned after AI analysis');
      return;
    }

    console.log(`[COMPETITIVE INTEL AGENT] 🤖 Found ${analysis.competitors.length} competitor(s)`);

    // Store competitor mentions
    for (const competitor of analysis.competitors) {
      // Check if competitor already exists
      let { data: existingCompetitor } = await supabase
        .from('competitors')
        .select('id')
        .eq('project_id', post.project_id)
        .ilike('name', competitor.name)
        .single();

      let competitorId: string;

      if (existingCompetitor) {
        competitorId = existingCompetitor.id;

        // Increment mention count
        await supabase
          .from('competitors')
          .update({
            mention_count: supabase.sql`mention_count + 1`,
            last_mentioned_at: new Date().toISOString(),
          })
          .eq('id', competitorId);
      } else {
        // Create new competitor entry
        const { data: newCompetitor } = await supabase
          .from('competitors')
          .insert({
            project_id: post.project_id,
            name: competitor.name,
            mention_count: 1,
            last_mentioned_at: new Date().toISOString(),
            first_mentioned_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        competitorId = newCompetitor?.id;
      }

      if (competitorId) {
        // Store this specific mention with extracted features
        await supabase.from('competitor_mentions').insert({
          competitor_id: competitorId,
          post_id: post.id,
          mentioned_features: competitor.features || [],
          context: competitor.context || '',
          sentiment: competitor.sentiment || 'neutral',
        }).catch((error) => {
          console.log('[COMPETITIVE INTEL AGENT] Note: competitor_mentions table not found (optional)');
        });

        // Publish competitor.mentioned event
        await publishEvent({
          type: EventType.COMPETITOR_MENTIONED,
          aggregate_type: 'competitor' as any,
          aggregate_id: competitorId,
          payload: {
            competitor_name: competitor.name,
            post_id: post.id,
            features: competitor.features,
            sentiment: competitor.sentiment,
            context: competitor.context,
          },
          metadata: {
            project_id: post.project_id,
            user_id: post.user_id,
            source: 'competitive_intel_agent',
          },
          version: 1,
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[COMPETITIVE INTEL AGENT] ✅ Processed in ${duration}ms: ${analysis.competitors.map(c => c.name).join(', ')}`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[COMPETITIVE INTEL AGENT] ❌ Error after ${duration}ms:`, error);
  }
}

/**
 * Extract competitor mentions using AI
 */
async function extractCompetitorMentions(
  title: string,
  content: string
): Promise<{
  competitors: Array<{
    name: string;
    features?: string[];
    context?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
  }>;
}> {
  const prompt = `Analyze this user feedback and extract any competitor mentions.

Title: ${title}
Content: ${content}

Extract:
1. Competitor names mentioned
2. Features they mention about the competitor
3. Context of the mention (why are they mentioning it?)
4. Sentiment toward the competitor (positive/negative/neutral)

Return ONLY a JSON object with this structure (no markdown, no extra text):
{
  "competitors": [
    {
      "name": "Competitor Name",
      "features": ["feature 1", "feature 2"],
      "context": "User wants similar feature",
      "sentiment": "positive"
    }
  ]
}

If no competitors are mentioned, return: {"competitors": []}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at identifying competitor mentions in user feedback. Be precise and only extract actual competitor/product names.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"competitors": []}');
    return result;
  } catch (error) {
    console.error('[COMPETITIVE INTEL AGENT] AI extraction failed:', error);
    return { competitors: [] };
  }
}

/**
 * Get competitive intelligence summary for a project
 */
export async function getCompetitiveIntelligence(projectId: string): Promise<{
  topCompetitors: Array<{
    name: string;
    mentionCount: number;
    lastMentioned: string;
    topFeatures: string[];
  }>;
  recentThreats: Array<{
    competitor: string;
    reason: string;
    severity: string;
  }>;
}> {
  const supabase = getServiceRoleClient();

  // Get top competitors by mention count
  const { data: competitors } = await supabase
    .from('competitors')
    .select('id, name, mention_count, last_mentioned_at')
    .eq('project_id', projectId)
    .order('mention_count', { ascending: false })
    .limit(10);

  if (!competitors) {
    return { topCompetitors: [], recentThreats: [] };
  }

  // Get top features for each competitor
  const topCompetitors = await Promise.all(
    competitors.map(async (competitor) => {
      const { data: mentions } = await supabase
        .from('competitor_mentions')
        .select('mentioned_features')
        .eq('competitor_id', competitor.id)
        .limit(20);

      const allFeatures = mentions?.flatMap(m => m.mentioned_features || []) || [];
      const featureCount = allFeatures.reduce((acc, feature) => {
        acc[feature] = (acc[feature] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topFeatures = Object.entries(featureCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([feature]) => feature);

      return {
        name: competitor.name,
        mentionCount: competitor.mention_count,
        lastMentioned: competitor.last_mentioned_at,
        topFeatures,
      };
    })
  );

  // Identify recent competitive threats
  // (competitors mentioned 3+ times in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentThreats = topCompetitors
    .filter(c => new Date(c.lastMentioned) > sevenDaysAgo && c.mentionCount >= 3)
    .map(c => ({
      competitor: c.name,
      reason: `Mentioned ${c.mentionCount} times recently`,
      severity: c.mentionCount >= 10 ? 'high' : c.mentionCount >= 5 ? 'medium' : 'low',
    }));

  return { topCompetitors, recentThreats };
}
