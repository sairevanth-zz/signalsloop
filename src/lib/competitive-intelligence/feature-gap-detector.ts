/**
 * Competitive Intelligence - Feature Gap Detector
 * Identifies features that competitors have which users are requesting
 * Uses GPT-4 for higher quality clustering and analysis
 */

import { getOpenAI } from '@/lib/openai-client';
import { getSupabaseServiceRoleClient } from '../supabase-client';


const MODELS = {
  FEATURE_GAPS: process.env.FEATURE_GAP_MODEL || 'gpt-4o',
};

// Type definitions
export interface FeatureGap {
  feature_name: string;
  description: string;
  mention_count: number;
  competitors_with_feature: string[];
  user_quotes: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimated_revenue_impact: string;
  urgency_score: number;
  reasoning: string;
}

export interface CompetitiveMentionWithContext {
  id: string;
  feedback_id: string;
  competitor_name: string;
  mention_type: string;
  context_snippet: string;
  sentiment_vs_you: number;
  feedback_content: string;
  feedback_platform: string;
  created_at: string;
}

/**
 * System prompt for feature gap analysis
 */
const FEATURE_GAP_ANALYSIS_PROMPT = `You are a product strategist analyzing competitive intelligence to identify feature gaps.

You'll receive customer feedback mentions where users compare your product to competitors or mention features they want.

Your task is to:
1. Identify DISTINCT feature gaps (features competitors have that users want)
2. Group similar requests together (e.g., "Zapier integration" + "API connectors" = "Third-party Integrations")
3. Assess business priority and revenue impact

For each feature gap, provide:

**feature_name**: Short, clear name (2-4 words)
**description**: What the feature does (1-2 sentences)
**mention_count**: How many users mentioned this (count similar requests)
**competitors_with_feature**: Array of competitor names that have this feature
**user_quotes**: Array of 2-3 most representative user quotes
**priority**: critical | high | medium | low
  - critical: Core functionality missing, users churning over this, >10 mentions
  - high: Significant differentiation, 5-10 mentions, impacts sales
  - medium: Nice to have, 2-4 mentions, competitive parity
  - low: Edge case, 1-2 mentions, minor enhancement

**estimated_revenue_impact**: Specific business impact description
  Examples:
  - "Losing 3 enterprise deals per month due to missing SSO (est. $50K MRR)"
  - "15% of trial users mention this in churn surveys"
  - "Top requested feature on competitor comparison searches"
  - "Would enable expansion into enterprise segment"

**urgency_score**: 0-100 based on:
  - Mention frequency (higher = more urgent)
  - Sentiment severity (users very frustrated = more urgent)
  - Competitive threat (switching risk = more urgent)
  - Revenue at risk (higher = more urgent)

**reasoning**: 2-3 sentences explaining WHY this gap matters and what the data shows

**Important:**
- Group semantically similar requests (dark mode + theme customization = "Dark Mode/Theming")
- Focus on features competitors HAVE that users explicitly want
- Be specific with revenue impact (use actual data from mentions)
- Don't invent features not mentioned in the data

Return JSON object with this structure:
{
  "feature_gaps": [
    {
      "feature_name": "string",
      "description": "string",
      "mention_count": number,
      "competitors_with_feature": ["string"],
      "user_quotes": ["string", "string"],
      "priority": "critical|high|medium|low",
      "estimated_revenue_impact": "string",
      "urgency_score": number,
      "reasoning": "string"
    }
  ]
}`;

/**
 * Detect feature gaps from competitive mentions
 */
export async function detectFeatureGaps(projectId: string, daysBack: number = 90): Promise<{
  success: boolean;
  gapsDetected: number;
  gaps?: FeatureGap[];
  error?: string;
}> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return { success: false, gapsDetected: 0, error: 'Supabase client not available' };
  }

  try {
    // 1. Get all competitive mentions of type feature_comparison from last N days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const { data: mentions, error: mentionsError } = await supabase
      .from('competitive_mentions')
      .select(
        `
        id,
        feedback_id,
        mention_type,
        context_snippet,
        sentiment_vs_you,
        key_points,
        created_at,
        competitor:competitors(name),
        feedback:discovered_feedback(content, platform)
      `,
      )
      .eq('mention_type', 'feature_comparison')
      .gte('created_at', cutoffDate.toISOString())
      .limit(500); // Limit to avoid token overflow

    if (mentionsError) {
      console.error('[FEATURE_GAP_DETECTOR] Error fetching mentions:', mentionsError);
      return { success: false, gapsDetected: 0, error: mentionsError.message };
    }

    if (!mentions || mentions.length === 0) {
      console.log(`[FEATURE_GAP_DETECTOR] No feature comparison mentions found for project ${projectId}`);
      return { success: true, gapsDetected: 0 };
    }

    // 2. Format mentions for AI analysis
    const formattedMentions = mentions.map((m) => ({
      competitor: (m.competitor as { name?: string })?.name || 'Unknown',
      context: m.context_snippet,
      feedback: (m.feedback as { content?: string; platform?: string })?.content || '',
      platform: (m.feedback as { content?: string; platform?: string })?.platform || 'unknown',
      sentiment: m.sentiment_vs_you,
      date: m.created_at,
    }));

    // 3. Call GPT-4 to cluster and analyze feature gaps
    const userPrompt = `Analyze these ${mentions.length} customer feedback mentions about competitor features and identify distinct feature gaps.

Competitive Feature Mentions:
${JSON.stringify(formattedMentions, null, 2)}

Identify and prioritize feature gaps our product should address.`;

    const response = await getOpenAI().chat.completions.create({
      model: MODELS.FEATURE_GAPS,
      messages: [
        { role: 'system', content: FEATURE_GAP_ANALYSIS_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content);
    const gaps: FeatureGap[] = result.feature_gaps || [];

    // 4. Store or update feature gaps in database
    for (const gap of gaps) {
      // Get competitor IDs
      const { data: competitors } = await supabase
        .from('competitors')
        .select('id')
        .eq('project_id', projectId)
        .in('name', gap.competitors_with_feature);

      const competitorIds = competitors?.map((c) => c.id) || [];

      // Get related feedback IDs
      const relatedFeedbackIds = mentions
        .filter((m) => {
          const competitorName = (m.competitor as { name?: string })?.name || '';
          return gap.competitors_with_feature.includes(competitorName);
        })
        .map((m) => m.feedback_id);

      // Upsert feature gap
      const { error: upsertError } = await supabase.from('feature_gaps').upsert(
        {
          project_id: projectId,
          feature_name: gap.feature_name,
          description: gap.description,
          mention_count: gap.mention_count,
          competitor_ids: competitorIds,
          avg_sentiment: 0, // Could calculate from related mentions
          urgency_score: gap.urgency_score,
          estimated_revenue_impact: gap.estimated_revenue_impact,
          priority: gap.priority,
          status: 'identified',
          user_quotes: gap.user_quotes,
          feedback_ids: relatedFeedbackIds,
          last_updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'project_id,feature_name',
        },
      );

      if (upsertError) {
        console.error('[FEATURE_GAP_DETECTOR] Error upserting gap:', upsertError);
      }
    }

    console.log(`[FEATURE_GAP_DETECTOR] Detected ${gaps.length} feature gaps for project ${projectId}`);

    return {
      success: true,
      gapsDetected: gaps.length,
      gaps,
    };
  } catch (error) {
    console.error('[FEATURE_GAP_DETECTOR] Error detecting gaps:', error);
    return {
      success: false,
      gapsDetected: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get top feature gaps for a project
 */
export async function getTopFeatureGaps(
  projectId: string,
  limit: number = 10,
): Promise<{
  gaps: FeatureGap[];
  total: number;
}> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return { gaps: [], total: 0 };

  const { data: gaps, error } = await supabase
    .from('feature_gaps')
    .select('*')
    .eq('project_id', projectId)
    .neq('status', 'dismissed')
    .order('urgency_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[FEATURE_GAP_DETECTOR] Error fetching gaps:', error);
    return { gaps: [], total: 0 };
  }

  return {
    gaps: gaps as FeatureGap[],
    total: gaps.length,
  };
}

/**
 * Update feature gap status (e.g., mark as planned, building, shipped)
 */
export async function updateFeatureGapStatus(
  gapId: string,
  status: 'identified' | 'planned' | 'building' | 'shipped' | 'dismissed',
  assignedTo?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return { success: false, error: 'Supabase client not available' };
  }

  const updateData: {
    status: string;
    assigned_to?: string;
    shipped_at?: string;
    last_updated_at: string;
  } = {
    status,
    last_updated_at: new Date().toISOString(),
  };

  if (assignedTo) {
    updateData.assigned_to = assignedTo;
  }

  if (status === 'shipped') {
    updateData.shipped_at = new Date().toISOString();
  }

  const { error } = await supabase.from('feature_gaps').update(updateData).eq('id', gapId);

  if (error) {
    console.error('[FEATURE_GAP_DETECTOR] Error updating gap status:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Refresh feature gap analysis (re-run detection)
 */
export async function refreshFeatureGaps(projectId: string): Promise<{
  success: boolean;
  gapsUpdated: number;
  error?: string;
}> {
  // Run detection for last 90 days
  const result = await detectFeatureGaps(projectId, 90);

  if (!result.success) {
    return {
      success: false,
      gapsUpdated: 0,
      error: result.error,
    };
  }

  return {
    success: true,
    gapsUpdated: result.gapsDetected,
  };
}

/**
 * Get feature gap with full details including related feedback
 */
export async function getFeatureGapDetails(gapId: string): Promise<{
  gap: FeatureGap | null;
  relatedFeedback: Array<{
    id: string;
    content: string;
    platform: string;
    discovered_at: string;
  }>;
  competitors: Array<{
    id: string;
    name: string;
  }>;
}> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return { gap: null, relatedFeedback: [], competitors: [] };
  }

  // Get gap
  const { data: gap } = await supabase.from('feature_gaps').select('*').eq('id', gapId).single();

  if (!gap) {
    return { gap: null, relatedFeedback: [], competitors: [] };
  }

  // Get related feedback
  const feedbackIds = gap.feedback_ids || [];
  const { data: feedback } = await supabase
    .from('discovered_feedback')
    .select('id, content, platform, discovered_at')
    .in('id', feedbackIds)
    .limit(20);

  // Get competitors
  const competitorIds = gap.competitor_ids || [];
  const { data: competitors } = await supabase
    .from('competitors')
    .select('id, name')
    .in('id', competitorIds);

  return {
    gap: gap as FeatureGap,
    relatedFeedback: feedback || [],
    competitors: competitors || [],
  };
}
