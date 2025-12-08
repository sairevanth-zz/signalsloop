/**
 * Competitive Intelligence - Strategic Analyzer
 * Generates strategic recommendations based on competitive intelligence data
 * Uses GPT-4 for high-quality strategic analysis
 */

import { getOpenAI } from '@/lib/openai-client';
import { getSupabaseServiceRoleClient } from '../supabase-client';


const MODELS = {
  STRATEGIC: process.env.STRATEGIC_ANALYSIS_MODEL || 'gpt-4o',
};

// Type definitions
export interface StrategicRecommendation {
  recommendation_type: 'attack' | 'defend' | 'react' | 'ignore';
  title: string;
  description: string;
  reasoning: string;
  estimated_impact: string;
  estimated_cost: string;
  roi_estimate: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  related_competitor_ids?: string[];
  related_feature_gap_ids?: string[];
  related_feedback_ids?: string[];
}

export interface CompetitiveIntelligenceSummary {
  competitors: Array<{
    id: string;
    name: string;
    total_mentions: number;
    avg_sentiment_vs_you: number;
    switches_to_you: number;
    switches_from_you: number;
    category?: string;
  }>;
  feature_gaps: Array<{
    id: string;
    feature_name: string;
    description: string;
    mention_count: number;
    priority: string;
    urgency_score: number;
    estimated_revenue_impact?: string;
  }>;
  recent_mentions: Array<{
    id: string;
    competitor_name: string;
    mention_type: string;
    context_snippet: string;
    sentiment_vs_you: number;
    created_at: string;
  }>;
  metrics: {
    total_mentions: number;
    net_switches: number;
    avg_sentiment: number;
  };
}

/**
 * System prompt for strategic analysis
 */
const STRATEGIC_ANALYSIS_PROMPT = `You are a seasoned business strategist and competitive intelligence analyst.

Your task is to analyze competitive intelligence data and generate actionable strategic recommendations.

For each recommendation, classify it as one of these types:

**ATTACK**: Exploit a competitor weakness or opportunity
- Example: "Competitor X has expensive pricing. Launch aggressive pricing campaign targeting their customers."
- When: You have a clear advantage, competitor vulnerability detected, opportunity to gain market share

**DEFEND**: Protect against a competitor strength or threat
- Example: "Competitor Y just launched AI features. Fast-track our AI roadmap to maintain parity."
- When: Competitor has advantage, users switching away, feature gap is critical

**REACT**: Respond to a market shift or emerging trend
- Example: "3 new competitors entered the space. Strengthen differentiation messaging."
- When: Market dynamics changing, new competitive pressure, positioning needs adjustment

**IGNORE**: Acknowledge but don't act on this
- Example: "Competitor Z's enterprise focus doesn't overlap with our SMB market. Monitor but don't act."
- When: Low impact, outside target market, resource drain vs. benefit

For each recommendation provide:

**title**: Clear, action-oriented (5-8 words)
**description**: What to do specifically (2-3 sentences)
**reasoning**: WHY this matters based on the data (2-3 sentences with specific metrics)
**estimated_impact**: Quantified business impact
  - Examples: "Could recover 20% of churned users", "Unlock $500K ARR from blocked deals", "Reduce competitive churn by 30%"
**estimated_cost**: Resource requirement
  - Examples: "2 engineer-weeks", "1 month marketing campaign ($10K)", "Minimal - messaging update only"
**roi_estimate**: Expected return vs investment
  - Examples: "High ROI - $300K revenue for $50K investment", "Medium ROI - defensive move, prevents churn", "Low ROI - strategic positioning"
**priority**: critical | high | medium | low

**Analysis Guidelines:**
- Be data-driven: Reference specific numbers from the intelligence
- Be realistic: Don't over-promise outcomes
- Be specific: Avoid generic advice
- Prioritize high-impact, low-effort wins
- Consider timing: Some moves are urgent, others can wait
- Think holistically: Product, marketing, sales, positioning

Generate 3-7 recommendations, prioritized by potential impact.

Return JSON object with this structure:
{
  "recommendations": [
    {
      "recommendation_type": "attack|defend|react|ignore",
      "title": "string",
      "description": "string",
      "reasoning": "string",
      "estimated_impact": "string",
      "estimated_cost": "string",
      "roi_estimate": "string",
      "priority": "critical|high|medium|low"
    }
  ],
  "executive_summary": "2-3 sentence overview of competitive landscape and key insights"
}`;

/**
 * Gather competitive intelligence summary
 */
async function gatherCompetitiveIntelligence(projectId: string): Promise<CompetitiveIntelligenceSummary | null> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return null;

  try {
    // Get competitors
    const { data: competitors } = await supabase
      .from('competitors')
      .select('id, name, category, total_mentions, avg_sentiment_vs_you, switches_to_you, switches_from_you')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('total_mentions', { ascending: false })
      .limit(10);

    // Get feature gaps
    const { data: featureGaps } = await supabase
      .from('feature_gaps')
      .select('id, feature_name, description, mention_count, priority, urgency_score, estimated_revenue_impact')
      .eq('project_id', projectId)
      .neq('status', 'dismissed')
      .order('urgency_score', { ascending: false })
      .limit(15);

    // Get recent competitive mentions (last 30 days, sample of 50)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentMentions } = await supabase
      .from('competitive_mentions')
      .select(
        `
        id,
        mention_type,
        context_snippet,
        sentiment_vs_you,
        created_at,
        competitor:competitors(name)
      `,
      )
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    // Calculate aggregate metrics
    const totalMentions = competitors?.reduce((sum, c) => sum + (c.total_mentions || 0), 0) || 0;
    const netSwitches =
      competitors?.reduce((sum, c) => sum + ((c.switches_to_you || 0) - (c.switches_from_you || 0)), 0) || 0;
    const avgSentiment =
      competitors?.reduce((sum, c) => sum + (c.avg_sentiment_vs_you || 0), 0) / (competitors?.length || 1) || 0;

    return {
      competitors: competitors || [],
      feature_gaps: featureGaps || [],
      recent_mentions:
        recentMentions?.map((m) => ({
          id: m.id,
          competitor_name: (m.competitor as { name?: string })?.name || 'Unknown',
          mention_type: m.mention_type,
          context_snippet: m.context_snippet || '',
          sentiment_vs_you: m.sentiment_vs_you || 0,
          created_at: m.created_at,
        })) || [],
      metrics: {
        total_mentions: totalMentions,
        net_switches: netSwitches,
        avg_sentiment: avgSentiment,
      },
    };
  } catch (error) {
    console.error('[STRATEGIC_ANALYZER] Error gathering intelligence:', error);
    return null;
  }
}

/**
 * Generate strategic recommendations
 */
export async function generateStrategicRecommendations(projectId: string): Promise<{
  success: boolean;
  recommendationsGenerated: number;
  executiveSummary?: string;
  error?: string;
}> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return { success: false, recommendationsGenerated: 0, error: 'Supabase client not available' };
  }

  try {
    // 1. Gather competitive intelligence
    const intelligence = await gatherCompetitiveIntelligence(projectId);

    if (!intelligence) {
      return { success: false, recommendationsGenerated: 0, error: 'Failed to gather intelligence' };
    }

    // Check if there's enough data for meaningful recommendations
    if (
      intelligence.competitors.length === 0 &&
      intelligence.feature_gaps.length === 0 &&
      intelligence.recent_mentions.length === 0
    ) {
      console.log(`[STRATEGIC_ANALYZER] Insufficient data for project ${projectId}`);
      return { success: true, recommendationsGenerated: 0 };
    }

    // 2. Generate recommendations using GPT-4
    const userPrompt = `Analyze this competitive intelligence and generate strategic recommendations.

**Competitive Intelligence Summary:**

**Competitors (${intelligence.competitors.length} active):**
${JSON.stringify(intelligence.competitors, null, 2)}

**Feature Gaps (${intelligence.feature_gaps.length} identified):**
${JSON.stringify(intelligence.feature_gaps, null, 2)}

**Recent Competitive Mentions (Last 30 days, sample of ${intelligence.recent_mentions.length}):**
${JSON.stringify(intelligence.recent_mentions.slice(0, 30), null, 2)}

**Aggregate Metrics:**
- Total competitive mentions: ${intelligence.metrics.total_mentions}
- Net user switches: ${intelligence.metrics.net_switches > 0 ? '+' : ''}${intelligence.metrics.net_switches}
- Average sentiment vs competitors: ${intelligence.metrics.avg_sentiment.toFixed(2)}

Generate 3-7 prioritized strategic recommendations.`;

    const response = await getOpenAI().chat.completions.create({
      model: MODELS.STRATEGIC,
      messages: [
        { role: 'system', content: STRATEGIC_ANALYSIS_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4, // Slightly higher for creative strategic thinking
      max_tokens: 2500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content);
    const recommendations: StrategicRecommendation[] = result.recommendations || [];
    const executiveSummary: string = result.executive_summary || '';

    // 3. Store recommendations in database
    for (const rec of recommendations) {
      // Try to map recommendations to specific competitors/gaps
      const relatedCompetitorIds: string[] = [];
      const relatedFeatureGapIds: string[] = [];

      // Simple matching based on recommendation content
      intelligence.competitors.forEach((comp) => {
        if (
          rec.title.toLowerCase().includes(comp.name.toLowerCase()) ||
          rec.description.toLowerCase().includes(comp.name.toLowerCase())
        ) {
          relatedCompetitorIds.push(comp.id);
        }
      });

      intelligence.feature_gaps.forEach((gap) => {
        if (
          rec.title.toLowerCase().includes(gap.feature_name.toLowerCase()) ||
          rec.description.toLowerCase().includes(gap.feature_name.toLowerCase())
        ) {
          relatedFeatureGapIds.push(gap.id);
        }
      });

      // Insert recommendation
      const { error: insertError } = await supabase.from('strategic_recommendations').insert({
        project_id: projectId,
        recommendation_type: rec.recommendation_type,
        title: rec.title,
        description: rec.description,
        reasoning: rec.reasoning,
        estimated_impact: rec.estimated_impact,
        estimated_cost: rec.estimated_cost,
        roi_estimate: rec.roi_estimate,
        priority: rec.priority,
        status: 'pending',
        related_competitor_ids: relatedCompetitorIds.length > 0 ? relatedCompetitorIds : null,
        related_feature_gap_ids: relatedFeatureGapIds.length > 0 ? relatedFeatureGapIds : null,
      });

      if (insertError) {
        console.error('[STRATEGIC_ANALYZER] Error inserting recommendation:', insertError);
      }
    }

    console.log(`[STRATEGIC_ANALYZER] Generated ${recommendations.length} recommendations for project ${projectId}`);

    return {
      success: true,
      recommendationsGenerated: recommendations.length,
      executiveSummary,
    };
  } catch (error) {
    console.error('[STRATEGIC_ANALYZER] Error generating recommendations:', error);
    return {
      success: false,
      recommendationsGenerated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get strategic recommendations for a project
 */
export async function getStrategicRecommendations(
  projectId: string,
  status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'dismissed',
): Promise<StrategicRecommendation[]> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return [];

  let query = supabase
    .from('strategic_recommendations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: recommendations, error } = await query;

  if (error) {
    console.error('[STRATEGIC_ANALYZER] Error fetching recommendations:', error);
    return [];
  }

  return recommendations as StrategicRecommendation[];
}

/**
 * Update recommendation status
 */
export async function updateRecommendationStatus(
  recommendationId: string,
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'dismissed',
  userId?: string,
  outcomeNotes?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return { success: false, error: 'Supabase client not available' };
  }

  const updateData: {
    status: string;
    assigned_to?: string;
    accepted_at?: string;
    completed_at?: string;
    dismissed_at?: string;
    outcome_notes?: string;
  } = {
    status,
  };

  if (userId) {
    updateData.assigned_to = userId;
  }

  if (outcomeNotes) {
    updateData.outcome_notes = outcomeNotes;
  }

  // Set timestamps based on status
  if (status === 'accepted') {
    updateData.accepted_at = new Date().toISOString();
  } else if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  } else if (status === 'dismissed') {
    updateData.dismissed_at = new Date().toISOString();
  }

  const { error } = await supabase.from('strategic_recommendations').update(updateData).eq('id', recommendationId);

  if (error) {
    console.error('[STRATEGIC_ANALYZER] Error updating recommendation:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Refresh strategic recommendations (regenerate them)
 */
export async function refreshStrategicRecommendations(projectId: string): Promise<{
  success: boolean;
  newRecommendations: number;
  error?: string;
}> {
  // Archive old pending recommendations
  const supabase = getSupabaseServiceRoleClient();
  if (supabase) {
    await supabase
      .from('strategic_recommendations')
      .update({ status: 'dismissed', dismissal_reason: 'Replaced by newer analysis' })
      .eq('project_id', projectId)
      .eq('status', 'pending');
  }

  // Generate new recommendations
  const result = await generateStrategicRecommendations(projectId);

  return {
    success: result.success,
    newRecommendations: result.recommendationsGenerated,
    error: result.error,
  };
}

/**
 * Get recommendation with full context
 */
export async function getRecommendationDetails(recommendationId: string): Promise<{
  recommendation: StrategicRecommendation | null;
  relatedCompetitors: Array<{ id: string; name: string }>;
  relatedFeatureGaps: Array<{ id: string; feature_name: string; priority: string }>;
}> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return { recommendation: null, relatedCompetitors: [], relatedFeatureGaps: [] };
  }

  // Get recommendation
  const { data: rec } = await supabase.from('strategic_recommendations').select('*').eq('id', recommendationId).single();

  if (!rec) {
    return { recommendation: null, relatedCompetitors: [], relatedFeatureGaps: [] };
  }

  // Get related competitors
  const competitorIds = rec.related_competitor_ids || [];
  const { data: competitors } = await supabase.from('competitors').select('id, name').in('id', competitorIds);

  // Get related feature gaps
  const gapIds = rec.related_feature_gap_ids || [];
  const { data: gaps } = await supabase
    .from('feature_gaps')
    .select('id, feature_name, priority')
    .in('id', gapIds);

  return {
    recommendation: rec as StrategicRecommendation,
    relatedCompetitors: competitors || [],
    relatedFeatureGaps: gaps || [],
  };
}
