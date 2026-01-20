/**
 * Generate Outcome Report
 *
 * Generates a comprehensive report for a feature outcome.
 * Includes metrics analysis, insights, and recommendations.
 */

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import {
  FeatureOutcomeDetailed,
  OutcomeReport,
  MetricTrend,
  calculateTrend,
} from '@/types/outcome-attribution';

/**
 * Generate insights based on the outcome data
 */
function generateInsights(outcome: FeatureOutcomeDetailed): string[] {
  const insights: string[] = [];

  // Sentiment insights
  if (outcome.sentiment_delta !== null) {
    if (outcome.sentiment_delta > 0.1) {
      insights.push(
        `User sentiment improved significantly by ${(outcome.sentiment_delta * 100).toFixed(1)}% after launch.`
      );
    } else if (outcome.sentiment_delta < -0.1) {
      insights.push(
        `User sentiment decreased by ${Math.abs(outcome.sentiment_delta * 100).toFixed(1)}% after launch. Consider investigating root causes.`
      );
    } else {
      insights.push('User sentiment remained relatively stable after launch.');
    }
  }

  // Volume insights
  if (outcome.theme_volume_delta !== null) {
    if (outcome.theme_volume_delta < -5) {
      insights.push(
        `Related feedback volume decreased by ${Math.abs(outcome.theme_volume_delta)} mentions, suggesting the feature addressed user needs.`
      );
    } else if (outcome.theme_volume_delta > 5) {
      insights.push(
        `Related feedback volume increased by ${outcome.theme_volume_delta} mentions. This could indicate the feature generated new interest or uncovered related issues.`
      );
    }
  }

  // Classification-based insights
  switch (outcome.outcome_classification) {
    case 'success':
      insights.push(
        'This feature launch was successful based on quantitative metrics. Consider using it as a template for future launches.'
      );
      break;
    case 'partial_success':
      insights.push(
        'The feature showed mixed results. Review the classification reasoning to identify areas for improvement.'
      );
      break;
    case 'no_impact':
      insights.push(
        'The feature did not show measurable impact. Consider whether the problem was correctly identified or if users need more time to adopt.'
      );
      break;
    case 'negative_impact':
      insights.push(
        'The feature showed negative impact. Prioritize root cause analysis and consider rollback or iteration.'
      );
      break;
  }

  // Priority insights
  if (outcome.priority_level === 'critical' && outcome.outcome_classification === 'success') {
    insights.push(
      'Successfully addressing a critical-priority issue will have significant positive impact on user satisfaction.'
    );
  }

  return insights;
}

/**
 * Generate recommendations based on the outcome
 */
function generateRecommendations(outcome: FeatureOutcomeDetailed): string[] {
  const recommendations: string[] = [];

  // Get AI-generated recommendations if available
  if (outcome.classification_reasoning?.recommendations) {
    recommendations.push(...outcome.classification_reasoning.recommendations);
  }

  // Add default recommendations based on classification
  switch (outcome.outcome_classification) {
    case 'success':
      if (!recommendations.some(r => r && r.toLowerCase().includes('document'))) {
        recommendations.push('Document the approach used for this feature as a playbook for future launches.');
      }
      if (!recommendations.some(r => r && r.toLowerCase().includes('share'))) {
        recommendations.push('Share the success metrics with stakeholders to build confidence in the product strategy.');
      }
      break;
    case 'partial_success':
      if (!recommendations.some(r => r && r.toLowerCase().includes('iterate'))) {
        recommendations.push('Plan a follow-up iteration to address gaps identified in the launch.');
      }
      if (!recommendations.some(r => r && r.toLowerCase().includes('feedback'))) {
        recommendations.push('Collect targeted feedback from power users to understand what could be improved.');
      }
      break;
    case 'no_impact':
      if (!recommendations.some(r => r && r.toLowerCase().includes('hypothesis'))) {
        recommendations.push('Revisit the original hypothesis and validate with user interviews.');
      }
      if (!recommendations.some(r => r && r.toLowerCase().includes('adoption'))) {
        recommendations.push('Check feature discoverability and consider adding user education.');
      }
      break;
    case 'negative_impact':
      if (!recommendations.some(r => r && r.toLowerCase().includes('analysis'))) {
        recommendations.push('Conduct immediate root cause analysis to understand what went wrong.');
      }
      if (!recommendations.some(r => r && r.toLowerCase().includes('rollback'))) {
        recommendations.push('Consider partial or full rollback if negative impact persists.');
      }
      break;
  }

  return recommendations.slice(0, 5); // Limit to 5 recommendations
}

/**
 * Calculate trend for a metric
 */
function getTrend(delta: number | null, threshold: number, invertForImprovement: boolean = false): MetricTrend {
  if (delta === null) return 'stable';
  return calculateTrend(delta, threshold, invertForImprovement);
}

/**
 * Generate a comprehensive outcome report
 *
 * @param outcomeId - The outcome ID to generate report for
 * @returns Outcome report with metrics analysis and recommendations
 */
export async function generateOutcomeReport(
  outcomeId: string
): Promise<OutcomeReport> {
  const supabase = getSupabaseServiceRoleClient();

  // Fetch detailed outcome data
  const { data: outcome, error: fetchError } = await supabase
    .from('feature_outcomes_detailed')
    .select('*')
    .eq('id', outcomeId)
    .single();

  if (fetchError || !outcome) {
    throw new Error(`Outcome not found: ${fetchError?.message || 'No data'}`);
  }

  const outcomeData = outcome as FeatureOutcomeDetailed;

  // Build metrics analysis
  const metrics: OutcomeReport['metrics'] = {
    sentimentChange: {
      before: outcomeData.pre_ship_sentiment ?? 0,
      after: outcomeData.post_ship_sentiment ?? 0,
      delta: outcomeData.sentiment_delta ?? 0,
      trend: getTrend(outcomeData.sentiment_delta, 0.05, false), // positive delta = improving
    },
    volumeChange: {
      before: outcomeData.pre_ship_theme_volume ?? 0,
      after: outcomeData.post_ship_theme_volume ?? 0,
      delta: outcomeData.theme_volume_delta ?? 0,
      trend: getTrend(outcomeData.theme_volume_delta, 3, true), // negative delta = improving (fewer complaints)
    },
    churnChange: {
      before: outcomeData.pre_ship_churn_risk ?? 0,
      after: outcomeData.post_ship_churn_risk ?? 0,
      delta: (outcomeData.post_ship_churn_risk ?? 0) - (outcomeData.pre_ship_churn_risk ?? 0),
      trend: getTrend(
        (outcomeData.post_ship_churn_risk ?? 0) - (outcomeData.pre_ship_churn_risk ?? 0),
        0.01,
        true // negative delta = improving (less churn risk)
      ),
    },
  };

  // Generate insights and recommendations
  const insights = generateInsights(outcomeData);
  const recommendations = generateRecommendations(outcomeData);

  const report: OutcomeReport = {
    outcome: outcomeData,
    metrics,
    insights,
    recommendations,
    generatedAt: new Date().toISOString(),
  };

  console.log(`[GenerateReport] Generated report for outcome ${outcomeId}:`, {
    classification: outcomeData.outcome_classification,
    insightsCount: insights.length,
    recommendationsCount: recommendations.length,
  });

  return report;
}

/**
 * Get a summary of all outcomes for a project
 */
export async function getProjectOutcomeSummary(
  projectId: string
): Promise<{
  total: number;
  byClassification: Record<string, number>;
  successRate: number;
  averageSentimentDelta: number;
  averageVolumeDelta: number;
}> {
  const supabase = getSupabaseServiceRoleClient();

  // Fetch all completed outcomes for the project
  const { data: outcomes, error } = await supabase
    .from('feature_outcomes')
    .select('outcome_classification, sentiment_delta, theme_volume_delta')
    .eq('project_id', projectId)
    .eq('status', 'completed');

  if (error) {
    throw new Error(`Failed to fetch outcomes: ${error.message}`);
  }

  const completedOutcomes = outcomes || [];

  // Calculate statistics
  const byClassification: Record<string, number> = {
    success: 0,
    partial_success: 0,
    no_impact: 0,
    negative_impact: 0,
  };

  let sentimentDeltaSum = 0;
  let volumeDeltaSum = 0;
  let sentimentCount = 0;
  let volumeCount = 0;

  for (const o of completedOutcomes) {
    if (o.outcome_classification && byClassification[o.outcome_classification] !== undefined) {
      byClassification[o.outcome_classification]++;
    }

    if (o.sentiment_delta !== null) {
      sentimentDeltaSum += o.sentiment_delta;
      sentimentCount++;
    }

    if (o.theme_volume_delta !== null) {
      volumeDeltaSum += o.theme_volume_delta;
      volumeCount++;
    }
  }

  const total = completedOutcomes.length;
  const successCount = byClassification.success + byClassification.partial_success;
  const successRate = total > 0 ? successCount / total : 0;

  return {
    total,
    byClassification,
    successRate,
    averageSentimentDelta: sentimentCount > 0 ? sentimentDeltaSum / sentimentCount : 0,
    averageVolumeDelta: volumeCount > 0 ? volumeDeltaSum / volumeCount : 0,
  };
}
