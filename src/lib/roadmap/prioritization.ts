/**
 * AI Roadmap Prioritization Algorithm
 *
 * Multi-factor scoring system that analyzes feedback themes and generates
 * prioritized roadmap suggestions based on:
 * - Frequency (how many users mention it)
 * - Sentiment (negative sentiment = higher priority)
 * - Business Impact (urgency, keywords, velocity)
 * - Effort (lower effort = higher score for quick wins)
 * - Competitive Pressure (how many competitors have this)
 *
 * DATA PIPELINE FIXES (2025-11-23):
 * - Fixed sentiment fetching: Now queries sentiment_analysis table directly for accurate scores
 * - Added proxy urgency: Calculates urgency (1-5) from post engagement (vote_count + comment_count)
 * - Fixed category extraction: Uses posts.category field instead of non-existent classification array
 * - Improved accuracy: Priority scores now based on real data instead of empty arrays
 */

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { estimateFeatureEffort } from '@/lib/predictions/effort-estimation';

// =====================================================
// TYPES
// =====================================================

export interface ThemeData {
  theme_id: string;
  theme_name: string;
  mention_count: number;
  avg_sentiment: number;
  first_detected_at: string;
  business_impact_keywords: string[];
  urgency_scores: number[];
  competitor_count: number;
  estimated_effort: 'low' | 'medium' | 'high' | 'very_high';
}

export interface PriorityContext {
  maxMentions: number;
  totalCompetitors: number;
}

export interface ScoringBreakdown {
  frequency: number;
  sentiment: number;
  businessImpact: number;
  effort: number;
  competitive: number;
}

export interface PriorityScore {
  totalScore: number;
  breakdown: ScoringBreakdown;
}

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

// =====================================================
// SCORING WEIGHTS
// =====================================================

const WEIGHTS = {
  frequency: 0.30,      // 30% - How many users are asking for it
  sentiment: 0.25,      // 25% - How frustrated users are
  businessImpact: 0.25, // 25% - Urgency, churn risk, revenue impact
  effort: 0.10,         // 10% - Quick wins get bonus
  competitive: 0.10     // 10% - Competitive pressure
};

// =====================================================
// NORMALIZATION FUNCTIONS
// =====================================================

/**
 * Normalize frequency using logarithmic scale
 * Prevents super popular themes from dominating the score
 */
export function normalizeFrequency(mentionCount: number, maxMentions: number): number {
  if (maxMentions === 0) return 0;

  // Use log scale: log10(mentions + 1) / log10(max + 1)
  // This gives diminishing returns for very high mention counts
  return Math.log10(mentionCount + 1) / Math.log10(maxMentions + 1);
}

/**
 * Normalize sentiment score
 * IMPORTANT: Negative sentiment = HIGHER priority (pain points)
 * Positive sentiment = LOWER priority (nice-to-haves)
 */
export function normalizeSentiment(avgSentiment: number): number {
  // Sentiment is -1 to +1
  // Convert to 0-1 where:
  // - Very negative (-1.0) → 1.0 (highest priority)
  // - Neutral (0) → 0.5
  // - Very positive (+1.0) → 0 (lowest priority)

  if (avgSentiment < 0) {
    // Negative sentiment: -1.0 → 1.0, -0.5 → 0.75, 0 → 0.5
    return 0.5 + (Math.abs(avgSentiment) * 0.5);
  } else {
    // Positive sentiment: +0.5 → 0.25, +1.0 → 0 (wishlist items)
    return Math.max(0, 0.5 - (avgSentiment * 0.5));
  }
}

/**
 * Calculate business impact score
 * Factors:
 * - High-value keywords (churn, cancel, enterprise, deal)
 * - Urgency scores from AI Feedback Hunter
 * - Mention velocity (rapid growth = higher priority)
 */
export function calculateBusinessImpact(theme: ThemeData): number {
  let score = 0;

  // 1. Check for high-value business keywords (40% of score)
  const highValueKeywords = [
    'churn', 'cancel', 'leave', 'quit', 'unsubscribe',
    'enterprise', 'deal', 'contract', 'revenue', 'money',
    'competitor', 'switch', 'alternative', 'blocker', 'urgent'
  ];

  const hasHighValue = theme.business_impact_keywords.some(kw =>
    highValueKeywords.includes(kw.toLowerCase())
  );

  if (hasHighValue) score += 0.4;

  // 2. Average urgency from AI Feedback Hunter (30% of score)
  if (theme.urgency_scores && theme.urgency_scores.length > 0) {
    const avgUrgency = theme.urgency_scores.reduce((a, b) => a + b, 0) / theme.urgency_scores.length;
    // Urgency is 1-5 scale, normalize to 0-0.3
    score += (avgUrgency / 5) * 0.3;
  }

  // 3. Mention velocity - rapidly growing themes (30% of score)
  const daysOld = (Date.now() - new Date(theme.first_detected_at).getTime()) / (1000 * 60 * 60 * 24);

  if (daysOld < 7 && theme.mention_count > 20) {
    // Hot new theme with lots of mentions
    score += 0.3;
  } else if (daysOld < 30 && theme.mention_count > 10) {
    // Growing theme
    score += 0.15;
  }

  return Math.min(1.0, score);
}

/**
 * Calculate effort score
 * Lower effort = higher score (prioritize quick wins)
 */
export function calculateEffortScore(estimatedEffort: string): number {
  const effortMap: Record<string, number> = {
    'low': 0.9,        // < 1 week
    'medium': 0.5,     // 1-3 weeks
    'high': 0.3,       // 3-6 weeks
    'very_high': 0.1   // 6+ weeks
  };

  return effortMap[estimatedEffort] || 0.5;
}

/**
 * Calculate competitive score
 * More competitors have it = higher pressure to build
 */
export function calculateCompetitiveScore(
  competitorCount: number,
  totalCompetitors: number = 5
): number {
  if (totalCompetitors === 0) return 0.5; // Default if no competitors tracked
  return competitorCount / totalCompetitors;
}

// =====================================================
// MAIN PRIORITIZATION FUNCTION
// =====================================================

/**
 * Calculate overall priority score for a theme
 * Returns score 0-100 with breakdown of individual factors
 */
export function calculatePriorityScore(
  theme: ThemeData,
  context: PriorityContext
): PriorityScore {
  // Calculate individual normalized scores (0-1 scale)
  const scores: ScoringBreakdown = {
    frequency: normalizeFrequency(theme.mention_count, context.maxMentions),
    sentiment: normalizeSentiment(theme.avg_sentiment),
    businessImpact: calculateBusinessImpact(theme),
    effort: calculateEffortScore(theme.estimated_effort),
    competitive: calculateCompetitiveScore(theme.competitor_count, context.totalCompetitors)
  };

  // Calculate weighted total score
  const totalScore = (
    scores.frequency * WEIGHTS.frequency +
    scores.sentiment * WEIGHTS.sentiment +
    scores.businessImpact * WEIGHTS.businessImpact +
    scores.effort * WEIGHTS.effort +
    scores.competitive * WEIGHTS.competitive
  ) * 100; // Scale to 0-100

  return {
    totalScore: Math.round(totalScore * 100) / 100, // Round to 2 decimals
    breakdown: scores
  };
}

/**
 * Assign priority level based on score
 */
export function assignPriorityLevel(score: number): PriorityLevel {
  if (score >= 75) return 'critical'; // P0 - Critical
  if (score >= 60) return 'high';     // P1 - High
  if (score >= 40) return 'medium';   // P2 - Medium
  return 'low';                       // P3 - Low
}

// =====================================================
// ROADMAP GENERATION
// =====================================================

/**
 * Generate roadmap suggestions for all themes in a project
 * This is the main entry point for roadmap generation
 */
export async function generateRoadmapSuggestions(projectId: string) {
  const startTime = Date.now();
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    throw new Error('Failed to initialize Supabase client');
  }

  try {
    // 1. Fetch all themes for project with related feedback data
    const { data: themes, error: themesError} = await supabase
      .from('themes')
      .select(`
        id,
        theme_name,
        frequency,
        avg_sentiment,
        first_seen,
        feedback_themes (
          feedback_id,
          posts (
            id,
            category,
            vote_count,
            comment_count,
            sentiment_analysis (
              sentiment_score
            )
          )
        )
      `)
      .eq('project_id', projectId)
      .order('frequency', { ascending: false });

    if (themesError) {
      throw new Error(`Error fetching themes: ${themesError.message}`);
    }

    if (!themes || themes.length === 0) {
      console.log(`No themes found for project ${projectId}`);
      return [];
    }

    // 2. Get competitive context
    const { data: competitiveFeatures } = await supabase
      .from('competitive_features')
      .select('feature_name, competitor_id')
      .eq('project_id', projectId);

    // Map theme names to competitor counts
    const competitorMap = new Map<string, number>();
    competitiveFeatures?.forEach(cf => {
      const count = competitorMap.get(cf.feature_name) || 0;
      competitorMap.set(cf.feature_name, count + 1);
    });

    const totalCompetitors = new Set(
      competitiveFeatures?.map(cf => cf.competitor_id) || []
    ).size || 5; // Default to 5 if no competitors

    // 3. Calculate max mentions for normalization
    const maxMentions = Math.max(...themes.map(t => t.frequency || 0), 1);

    // 4. Score each theme
    const suggestions = [];

    for (const theme of themes) {
      // Calculate proxy urgency scores from post engagement metrics
      // Higher votes + comments = higher urgency signal from users
      const urgencyScores = theme.feedback_themes
        ?.map((ft: any) => {
          const post = ft.posts;
          if (!post) return null;

          // Calculate urgency proxy (1-5 scale) based on engagement
          const voteCount = post.vote_count || 0;
          const commentCount = post.comment_count || 0;
          const engagementScore = voteCount + (commentCount * 2); // Comments weighted higher

          // Map engagement to 1-5 urgency scale
          if (engagementScore >= 50) return 5;
          if (engagementScore >= 20) return 4;
          if (engagementScore >= 10) return 3;
          if (engagementScore >= 5) return 2;
          return 1;
        })
        .filter((score: number | null | undefined): score is number =>
          score !== null && score !== undefined
        ) || [];

      // Extract business impact keywords from post categories and sentiment
      const businessImpactKeywords = theme.feedback_themes
        ?.map((ft: any) => ft.posts?.category)
        .filter(Boolean) || [];

      // Get estimated effort based on historical data and theme characteristics
      const effortEstimate = await estimateFeatureEffort(
        projectId,
        theme.theme_name,
        theme.id,
        theme.frequency || 0
      );
      const estimatedEffort = effortEstimate.effort;

      // Calculate average sentiment from individual posts when available
      const sentimentScores = theme.feedback_themes
        ?.map((ft: any) => ft.posts?.sentiment_analysis?.[0]?.sentiment_score)
        .filter((score: number | null | undefined): score is number =>
          score !== null && score !== undefined
        ) || [];

      const avgSentiment = sentimentScores.length > 0
        ? sentimentScores.reduce((a, b) => a + Number(b), 0) / sentimentScores.length
        : Number(theme.avg_sentiment) || 0;

      const themeData: ThemeData = {
        theme_id: theme.id,
        theme_name: theme.theme_name,
        mention_count: theme.frequency || 0,
        avg_sentiment: avgSentiment,
        first_detected_at: theme.first_seen,
        business_impact_keywords: businessImpactKeywords,
        urgency_scores: urgencyScores,
        competitor_count: competitorMap.get(theme.theme_name) || 0,
        estimated_effort: estimatedEffort
      };

      const { totalScore, breakdown } = calculatePriorityScore(themeData, {
        maxMentions,
        totalCompetitors
      });

      const priorityLevel = assignPriorityLevel(totalScore);

      suggestions.push({
        project_id: projectId,
        theme_id: theme.id,
        priority_score: totalScore,
        priority_level: priorityLevel,
        frequency_score: breakdown.frequency,
        sentiment_score: breakdown.sentiment,
        business_impact_score: breakdown.businessImpact,
        effort_score: breakdown.effort,
        competitive_score: breakdown.competitive,
        generated_at: new Date().toISOString()
      });
    }

    // 5. Upsert suggestions into database
    const { data: inserted, error: insertError } = await supabase
      .from('roadmap_suggestions')
      .upsert(suggestions, {
        onConflict: 'project_id,theme_id',
        ignoreDuplicates: false
      })
      .select();

    if (insertError) {
      throw new Error(`Error inserting suggestions: ${insertError.message}`);
    }

    // 6. Log generation metrics
    const generationTimeMs = Date.now() - startTime;

    await supabase.from('roadmap_generation_logs').insert({
      project_id: projectId,
      themes_analyzed: themes.length,
      suggestions_generated: suggestions.length,
      generation_time_ms: generationTimeMs,
      gpt4_api_calls: 0, // Will be updated by AI reasoning generation
      gpt4_tokens_used: 0,
      success: true
    });

    console.log(
      `Generated ${suggestions.length} roadmap suggestions for project ${projectId} ` +
      `in ${generationTimeMs}ms`
    );

    return inserted;

  } catch (error) {
    // Log error
    await supabase?.from('roadmap_generation_logs').insert({
      project_id: projectId,
      themes_analyzed: 0,
      suggestions_generated: 0,
      generation_time_ms: Date.now() - startTime,
      success: false,
      error_message: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

/**
 * Regenerate suggestions for a single theme
 * Useful when theme data changes significantly
 */
export async function regenerateSuggestionForTheme(
  projectId: string,
  themeId: string
): Promise<void> {
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    throw new Error('Failed to initialize Supabase client');
  }

  // Just regenerate for entire project for simplicity
  // In production, you could optimize this to update just one theme
  await generateRoadmapSuggestions(projectId);
}
