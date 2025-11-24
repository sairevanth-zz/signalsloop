/**
 * AI Reasoning System for Roadmap Suggestions
 *
 * Uses GPT-4 to generate strategic reasoning for each roadmap suggestion:
 * - Why this matters now
 * - Business impact analysis
 * - User segments affected
 * - Implementation strategy
 * - Risks & dependencies
 * - Trade-offs
 * - Final recommendation
 */

import OpenAI from 'openai';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { estimateFeatureEffort } from '@/lib/predictions/effort-estimation';

// =====================================================
// TYPES
// =====================================================

interface FeedbackSample {
  content: string;
  sentiment: number;
  platform: string;
  urgency_score?: number;
  classification?: string[];
}

interface CompetitiveContext {
  competitors_with_feature: string[];
  total_competitors: number;
}

interface RelatedTheme {
  name: string;
  relationship: string;
}

interface ThemeInfo {
  name: string;
  mention_count: number;
  avg_sentiment: number;
  priority_score: number;
  priority_level: string;
  first_detected_at: string;
  estimated_effort: string;
}

export interface ReasoningInput {
  theme: ThemeInfo;
  feedback_samples: FeedbackSample[];
  competitive_context: CompetitiveContext;
  related_themes: RelatedTheme[];
}

interface ReasoningSections {
  whyMatters: string;
  businessImpact: string;
  userSegments: string;
  implementation: string;
  risks: string;
  tradeOffs: string;
  recommendation: string;
}

// =====================================================
// OPENAI CLIENT
// =====================================================

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// =====================================================
// PROMPT GENERATION
// =====================================================

function buildReasoningPrompt(input: ReasoningInput): string {
  const { theme, feedback_samples, competitive_context, related_themes } = input;

  const prompt = `You are a product strategy AI helping prioritize a product roadmap based on user feedback analysis.

Analyze the following feedback theme and provide comprehensive strategic reasoning.

=== THEME OVERVIEW ===
Theme: ${theme.name}
Priority Score: ${theme.priority_score}/100 (${theme.priority_level.toUpperCase()})
Mentions: ${theme.mention_count} users
Average Sentiment: ${theme.avg_sentiment.toFixed(2)} (-1 = very negative, +1 = very positive)
Estimated Effort: ${theme.estimated_effort}
First Detected: ${new Date(theme.first_detected_at).toLocaleDateString()}

=== USER FEEDBACK SAMPLES ===
${feedback_samples.slice(0, 5).map((f, i) => `
${i + 1}. "${f.content}"
   Platform: ${f.platform}
   Sentiment: ${f.sentiment.toFixed(2)}${f.urgency_score ? `\n   Urgency: ${f.urgency_score}/5` : ''}${f.classification?.length ? `\n   Categories: ${f.classification.join(', ')}` : ''}
`).join('\n')}

=== COMPETITIVE CONTEXT ===
${competitive_context.competitors_with_feature.length > 0
    ? `Competitors with this feature: ${competitive_context.competitors_with_feature.join(', ')}`
    : 'None of your tracked competitors have this feature yet'
  }
Total competitors tracked: ${competitive_context.total_competitors}

${related_themes.length > 0 ? `=== RELATED THEMES ===
${related_themes.map(rt => `- ${rt.name} (${rt.relationship})`).join('\n')}
` : ''}

=== REQUIRED ANALYSIS ===

Provide detailed strategic analysis with the following sections:

**1. WHY THIS MATTERS NOW**
Explain why this theme should be addressed now. Consider timing, user pain, and market conditions.

**2. BUSINESS IMPACT**
Analyze the potential business impact:
- Revenue impact (positive or negative)
- User retention/churn risk
- Market positioning
- Customer acquisition
- Quantify impact where possible

**3. USER SEGMENTS AFFECTED**
Identify which user segments are most affected:
- Enterprise vs SMB vs individual users
- Power users vs casual users
- New users vs existing users
- Geographic or industry-specific segments

**4. IMPLEMENTATION STRATEGY**
Recommend an implementation approach:
- Phased rollout vs all-at-once
- MVP scope vs full feature
- Technical approach considerations
- Resource requirements

**5. RISKS & DEPENDENCIES**
Identify potential risks and dependencies:
- Technical risks
- Resource constraints
- External dependencies
- Regulatory/compliance considerations
- Timeline risks

**6. TRADE-OFFS**
Analyze what you're trading off by prioritizing this:
- Other features that might be delayed
- Technical debt considerations
- Opportunity cost
- Complexity vs simplicity trade-offs

**7. RECOMMENDATION**
Provide a clear, actionable recommendation:
- Build now / Build later / Don't build (with reasoning)
- Suggested priority adjustments if any
- Key success metrics to track

Keep your analysis concise but insightful. Focus on actionable insights that help product teams make informed decisions.`;

  return prompt;
}

// =====================================================
// SECTION PARSING
// =====================================================

function parseReasoningSections(reasoning: string): ReasoningSections {
  const sections: ReasoningSections = {
    whyMatters: '',
    businessImpact: '',
    userSegments: '',
    implementation: '',
    risks: '',
    tradeOffs: '',
    recommendation: ''
  };

  // Extract sections using regex
  const extractSection = (pattern: RegExp): string => {
    const match = reasoning.match(pattern);
    return match ? match[1].trim() : '';
  };

  sections.whyMatters = extractSection(
    /\*\*1\.\s*WHY THIS MATTERS NOW\*\*\s*([\s\S]*?)(?=\*\*2\.|$)/i
  );

  sections.businessImpact = extractSection(
    /\*\*2\.\s*BUSINESS IMPACT\*\*\s*([\s\S]*?)(?=\*\*3\.|$)/i
  );

  sections.userSegments = extractSection(
    /\*\*3\.\s*USER SEGMENTS AFFECTED\*\*\s*([\s\S]*?)(?=\*\*4\.|$)/i
  );

  sections.implementation = extractSection(
    /\*\*4\.\s*IMPLEMENTATION STRATEGY\*\*\s*([\s\S]*?)(?=\*\*5\.|$)/i
  );

  sections.risks = extractSection(
    /\*\*5\.\s*RISKS & DEPENDENCIES\*\*\s*([\s\S]*?)(?=\*\*6\.|$)/i
  );

  sections.tradeOffs = extractSection(
    /\*\*6\.\s*TRADE-OFFS\*\*\s*([\s\S]*?)(?=\*\*7\.|$)/i
  );

  sections.recommendation = extractSection(
    /\*\*7\.\s*RECOMMENDATION\*\*\s*([\s\S]*?)$/i
  );

  return sections;
}

// =====================================================
// AI REASONING GENERATION
// =====================================================

/**
 * Generate AI reasoning for a single roadmap suggestion
 */
export async function generateAIReasoning(
  suggestionId: string,
  input: ReasoningInput
): Promise<void> {
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    throw new Error('Failed to initialize Supabase client');
  }

  const openai = getOpenAIClient();
  const startTime = Date.now();

  try {
    // Build the prompt
    const prompt = buildReasoningPrompt(input);

    // Call GPT-4 for strategic reasoning
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert product strategist who helps prioritize product roadmaps based on user feedback, business impact, and competitive landscape. Your analysis is data-driven, practical, and actionable.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const reasoning = completion.choices[0].message.content || '';

    if (!reasoning) {
      throw new Error('GPT-4 returned empty response');
    }

    // Parse reasoning into structured sections
    const sections = parseReasoningSections(reasoning);

    // Update suggestion with AI reasoning
    const { error: updateError } = await supabase
      .from('roadmap_suggestions')
      .update({
        reasoning_text: reasoning,
        why_matters: sections.whyMatters,
        business_impact_text: sections.businessImpact,
        user_segments_affected: sections.userSegments,
        implementation_strategy: sections.implementation,
        risks_dependencies: sections.risks,
        trade_offs: sections.tradeOffs,
        recommendation_text: sections.recommendation,
        regenerated_at: new Date().toISOString()
      })
      .eq('id', suggestionId);

    if (updateError) {
      throw new Error(`Error updating suggestion: ${updateError.message}`);
    }

    // Log token usage
    const tokensUsed = completion.usage?.total_tokens || 0;
    const generationTimeMs = Date.now() - startTime;

    // Get project_id for logging
    const { data: suggestion } = await supabase
      .from('roadmap_suggestions')
      .select('project_id')
      .eq('id', suggestionId)
      .single();

    if (suggestion) {
      await supabase.from('roadmap_generation_logs').insert({
        project_id: suggestion.project_id,
        themes_analyzed: 1,
        suggestions_generated: 1,
        generation_time_ms: generationTimeMs,
        gpt4_api_calls: 1,
        gpt4_tokens_used: tokensUsed,
        success: true
      });
    }

    console.log(
      `Generated AI reasoning for suggestion ${suggestionId} ` +
      `(${tokensUsed} tokens, ${generationTimeMs}ms)`
    );

  } catch (error) {
    console.error('Error generating AI reasoning:', error);

    // Log error
    const { data: suggestion } = await supabase
      .from('roadmap_suggestions')
      .select('project_id')
      .eq('id', suggestionId)
      .single();

    if (suggestion) {
      await supabase.from('roadmap_generation_logs').insert({
        project_id: suggestion.project_id,
        themes_analyzed: 1,
        suggestions_generated: 0,
        generation_time_ms: Date.now() - startTime,
        gpt4_api_calls: 1,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    throw error;
  }
}

// =====================================================
// BATCH REASONING GENERATION
// =====================================================

/**
 * Generate reasoning for all suggestions without reasoning in a project
 * Rate-limited to avoid OpenAI API limits
 */
export async function generateAllReasoning(projectId: string): Promise<void> {
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    throw new Error('Failed to initialize Supabase client');
  }

  // Fetch all suggestions without reasoning
  const { data: suggestions, error: suggestionsError } = await supabase
    .from('roadmap_suggestions')
    .select(`
      *,
      themes (
        id,
        theme_name,
        frequency,
        avg_sentiment,
        first_seen
      )
    `)
    .eq('project_id', projectId)
    .is('reasoning_text', null)
    .order('priority_score', { ascending: false });

  if (suggestionsError) {
    throw new Error(`Error fetching suggestions: ${suggestionsError.message}`);
  }

  if (!suggestions || suggestions.length === 0) {
    console.log('No suggestions need reasoning generation');
    return;
  }

  console.log(`Generating reasoning for ${suggestions.length} suggestions...`);

  // Process each suggestion with rate limiting
  for (const suggestion of suggestions) {
    try {
      // Fetch supporting feedback samples
      const { data: feedbackSamples } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          sentiment,
          platform,
          urgency_score,
          classification,
          feedback_themes!inner(theme_id)
        `)
        .eq('feedback_themes.theme_id', suggestion.theme_id)
        .order('urgency_score', { ascending: false })
        .limit(10);

      // Fetch competitive features
      const { data: competitiveFeatures } = await supabase
        .from('competitive_features')
        .select(`
          feature_name,
          competitor_id,
          competitors (name)
        `)
        .eq('project_id', projectId)
        .ilike('feature_name', `%${suggestion.themes.theme_name}%`);

      const competitorsWithFeature = competitiveFeatures?.map(
        (cf: any) => cf.competitors?.name
      ).filter(Boolean) || [];

      // Estimate effort based on historical data and theme characteristics
      const effortEstimate = await estimateFeatureEffort(
        projectId,
        suggestion.themes.theme_name,
        suggestion.theme_id,
        suggestion.themes.frequency || 0
      );

      // Build reasoning input
      const reasoningInput: ReasoningInput = {
        theme: {
          name: suggestion.themes.theme_name,
          mention_count: suggestion.themes.frequency,
          avg_sentiment: Number(suggestion.themes.avg_sentiment),
          priority_score: Number(suggestion.priority_score),
          priority_level: suggestion.priority_level,
          first_detected_at: suggestion.themes.first_seen,
          estimated_effort: effortEstimate.effort,
        },
        feedback_samples: (feedbackSamples || []).map((f: any) => ({
          content: f.content,
          sentiment: f.sentiment || 0,
          platform: f.platform,
          urgency_score: f.urgency_score,
          classification: f.classification
        })),
        competitive_context: {
          competitors_with_feature: competitorsWithFeature,
          total_competitors: 5 // TODO: Get from project settings
        },
        related_themes: [] // TODO: Implement theme relationship detection
      };

      // Generate reasoning
      await generateAIReasoning(suggestion.id, reasoningInput);

      // Rate limit: 1 request per second to avoid OpenAI limits
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(
        `Error generating reasoning for suggestion ${suggestion.id}:`,
        error
      );
      // Continue with next suggestion even if one fails
    }
  }

  console.log(`Completed reasoning generation for ${suggestions.length} suggestions`);
}

/**
 * Regenerate reasoning for a single suggestion
 * Useful when feedback data changes significantly
 */
export async function regenerateReasoningForSuggestion(
  suggestionId: string
): Promise<void> {
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    throw new Error('Failed to initialize Supabase client');
  }

  // Fetch suggestion with theme data
  const { data: suggestion, error } = await supabase
    .from('roadmap_suggestions')
    .select(`
      *,
      themes (
        id,
        theme_name,
        frequency,
        avg_sentiment,
        first_seen
      )
    `)
    .eq('id', suggestionId)
    .single();

  if (error || !suggestion) {
    throw new Error(`Error fetching suggestion: ${error?.message}`);
  }

  // Fetch supporting data
  const { data: feedbackSamples } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      sentiment,
      platform,
      urgency_score,
      classification,
      feedback_themes!inner(theme_id)
    `)
    .eq('feedback_themes.theme_id', suggestion.theme_id)
    .order('urgency_score', { ascending: false })
    .limit(10);

  const { data: competitiveFeatures } = await supabase
    .from('competitive_features')
    .select(`
      feature_name,
      competitor_id,
      competitors (name)
    `)
    .eq('project_id', suggestion.project_id)
    .ilike('feature_name', `%${suggestion.themes.theme_name}%`);

  const competitorsWithFeature = competitiveFeatures?.map(
    (cf: any) => cf.competitors?.name
  ).filter(Boolean) || [];

  // Build reasoning input
  const reasoningInput: ReasoningInput = {
    theme: {
      name: suggestion.themes.theme_name,
      mention_count: suggestion.themes.frequency,
      avg_sentiment: Number(suggestion.themes.avg_sentiment),
      priority_score: Number(suggestion.priority_score),
      priority_level: suggestion.priority_level,
      first_detected_at: suggestion.themes.first_seen,
      estimated_effort: 'medium'
    },
    feedback_samples: (feedbackSamples || []).map((f: any) => ({
      content: f.content,
      sentiment: f.sentiment || 0,
      platform: f.platform,
      urgency_score: f.urgency_score,
      classification: f.classification
    })),
    competitive_context: {
      competitors_with_feature: competitorsWithFeature,
      total_competitors: 5
    },
    related_themes: []
  };

  await generateAIReasoning(suggestionId, reasoningInput);
}
