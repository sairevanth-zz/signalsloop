/**
 * Effort Estimation Module
 *
 * Estimates development effort for features based on:
 * - Historical data from similar features
 * - Theme complexity
 * - Feature category patterns
 * - Feedback volume as proxy for scope
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';

export type EffortLevel = 'low' | 'medium' | 'high';

interface EffortEstimate {
  effort: EffortLevel;
  confidence: number; // 0-1
  reasoning: string;
  historicalSamples?: number;
}

/**
 * Estimate effort for a feature based on historical data and theme characteristics
 */
export async function estimateFeatureEffort(
  projectId: string,
  themeName: string,
  themeId: string,
  feedbackCount: number
): Promise<EffortEstimate> {
  const supabase = getServiceRoleClient();

  // 1. Try to find similar features in history
  const similarFeatures = await findSimilarHistoricalFeatures(projectId, themeName);

  if (similarFeatures.length > 0) {
    // Use historical data
    const avgEffortDays = similarFeatures.reduce((sum, f) => sum + (f.actual_effort_days || 0), 0) / similarFeatures.length;

    let effort: EffortLevel;
    if (avgEffortDays <= 5) {
      effort = 'low';
    } else if (avgEffortDays <= 15) {
      effort = 'medium';
    } else {
      effort = 'high';
    }

    return {
      effort,
      confidence: Math.min(0.9, 0.6 + (similarFeatures.length * 0.1)), // Max 90% confidence
      reasoning: `Based on ${similarFeatures.length} similar feature(s) averaging ${avgEffortDays.toFixed(1)} days`,
      historicalSamples: similarFeatures.length,
    };
  }

  // 2. Fallback: Use feedback volume as proxy for complexity
  let effort: EffortLevel;
  let reasoning: string;

  if (feedbackCount >= 50) {
    effort = 'high';
    reasoning = `High feedback volume (${feedbackCount} posts) suggests complex, high-impact feature`;
  } else if (feedbackCount >= 15) {
    effort = 'medium';
    reasoning = `Moderate feedback volume (${feedbackCount} posts) suggests medium complexity`;
  } else {
    effort = 'low';
    reasoning = `Low feedback volume (${feedbackCount} posts) suggests smaller scope`;
  }

  // 3. Adjust based on theme name keywords
  const effortKeywords = {
    high: ['integration', 'migration', 'architecture', 'infrastructure', 'refactor', 'redesign', 'overhaul'],
    low: ['ui', 'text', 'copy', 'button', 'label', 'color', 'icon', 'tooltip'],
  };

  const lowerTheme = themeName.toLowerCase();

  if (effortKeywords.high.some(keyword => lowerTheme.includes(keyword))) {
    if (effort === 'low') effort = 'medium';
    if (effort === 'medium') effort = 'high';
    reasoning += '; Theme suggests architectural complexity';
  }

  if (effortKeywords.low.some(keyword => lowerTheme.includes(keyword))) {
    if (effort === 'high') effort = 'medium';
    if (effort === 'medium') effort = 'low';
    reasoning += '; Theme suggests UI/polish work';
  }

  return {
    effort,
    confidence: 0.4, // Lower confidence without historical data
    reasoning,
  };
}

/**
 * Find similar features in history based on name similarity
 */
async function findSimilarHistoricalFeatures(
  projectId: string,
  featureName: string
): Promise<Array<{ feature_name: string; actual_effort_days: number | null }>> {
  const supabase = getServiceRoleClient();

  // Get all features with actual effort data
  const { data: features } = await supabase
    .from('feature_impact_history')
    .select('feature_name, actual_effort_days')
    .eq('project_id', projectId)
    .not('actual_effort_days', 'is', null);

  if (!features || features.length === 0) {
    return [];
  }

  // Simple keyword-based matching
  // Extract keywords from feature name
  const keywords = extractKeywords(featureName);

  // Find features with matching keywords
  const similar = features.filter(f => {
    const featureKeywords = extractKeywords(f.feature_name);
    const matches = keywords.filter(k => featureKeywords.includes(k));
    return matches.length > 0; // At least one matching keyword
  });

  return similar;
}

/**
 * Extract meaningful keywords from feature name
 */
function extractKeywords(text: string): string[] {
  // Common stop words to ignore
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be']);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Convert effort days to effort level
 */
export function effortDaysToLevel(days: number): EffortLevel {
  if (days <= 5) return 'low';
  if (days <= 15) return 'medium';
  return 'high';
}

/**
 * Convert effort level to estimated days (midpoint of range)
 */
export function effortLevelToDays(level: EffortLevel): number {
  switch (level) {
    case 'low':
      return 3; // 1-5 days
    case 'medium':
      return 10; // 6-15 days
    case 'high':
      return 25; // 16+ days
  }
}
