/**
 * Feature Impact Data Collection Pipeline
 *
 * Automates the collection of pre/post launch metrics for features
 * to build historical data that improves simulation accuracy over time.
 *
 * Usage:
 * 1. Call recordFeatureLaunch() when a feature is deployed
 * 2. System automatically tracks pre-launch baseline metrics
 * 3. After 30 days, call collectPostLaunchMetrics() to measure impact
 * 4. Historical data feeds into impact simulation for future predictions
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';

// =====================================================
// TYPES
// =====================================================

export interface FeatureLaunchData {
  projectId: string;
  suggestionId?: string;
  featureName: string;
  featureCategory?: string;
  effortEstimate?: 'low' | 'medium' | 'high' | 'very_high';
  actualEffortDays?: number;
}

export interface MetricsSnapshot {
  sentimentAvg: number;
  feedbackVolumeWeekly: number;
  churnRate?: number;
  npsScore?: number;
}

// =====================================================
// MAIN FUNCTIONS
// =====================================================

/**
 * Record a feature launch and capture pre-launch baseline metrics
 */
export async function recordFeatureLaunch(data: FeatureLaunchData): Promise<string> {
  const supabase = getServiceRoleClient();

  // Collect pre-launch metrics
  const preLaunchMetrics = await collectCurrentMetrics(data.projectId, data.suggestionId);

  // Insert feature impact history record
  const { data: record, error } = await supabase
    .from('feature_impact_history')
    .insert({
      project_id: data.projectId,
      suggestion_id: data.suggestionId,
      feature_name: data.featureName,
      feature_category: data.featureCategory,
      launched_at: new Date().toISOString(),
      effort_estimate: data.effortEstimate,
      actual_effort_days: data.actualEffortDays,
      pre_sentiment_avg: preLaunchMetrics.sentimentAvg,
      pre_feedback_volume_weekly: preLaunchMetrics.feedbackVolumeWeekly,
      pre_churn_rate: preLaunchMetrics.churnRate,
      pre_nps_score: preLaunchMetrics.npsScore
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Data Collection] Error recording feature launch:', error);
    throw error;
  }

  console.log(`[Data Collection] Feature launch recorded: ${data.featureName} (ID: ${record.id})`);
  return record.id;
}

/**
 * Collect post-launch metrics (call 30 days after launch)
 */
export async function collectPostLaunchMetrics(featureHistoryId: string): Promise<void> {
  const supabase = getServiceRoleClient();

  // Get feature record
  const { data: feature, error: fetchError } = await supabase
    .from('feature_impact_history')
    .select('*')
    .eq('id', featureHistoryId)
    .single();

  if (fetchError || !feature) {
    throw new Error(`Feature not found: ${featureHistoryId}`);
  }

  // Collect post-launch metrics
  const postLaunchMetrics = await collectCurrentMetrics(
    feature.project_id,
    feature.suggestion_id
  );

  // Calculate adoption rate if possible
  const adoptionRate = await estimateAdoptionRate(feature.project_id, feature.feature_name);

  // Update record with post-launch data
  const { error: updateError } = await supabase
    .from('feature_impact_history')
    .update({
      post_sentiment_avg: postLaunchMetrics.sentimentAvg,
      post_feedback_volume_weekly: postLaunchMetrics.feedbackVolumeWeekly,
      post_churn_rate: postLaunchMetrics.churnRate,
      post_nps_score: postLaunchMetrics.npsScore,
      post_adoption_rate: adoptionRate,
      updated_at: new Date().toISOString()
    })
    .eq('id', featureHistoryId);

  if (updateError) {
    console.error('[Data Collection] Error updating post-launch metrics:', updateError);
    throw updateError;
  }

  console.log(`[Data Collection] Post-launch metrics collected for feature: ${feature.feature_name}`);
}

/**
 * Manually record a success rating and lessons learned
 */
export async function recordFeatureRetrospective(
  featureHistoryId: string,
  successRating: number,
  lessonsLearned: string,
  revenueImpactEstimate?: number
): Promise<void> {
  const supabase = getServiceRoleClient();

  const { error } = await supabase
    .from('feature_impact_history')
    .update({
      success_rating: successRating,
      lessons_learned: lessonsLearned,
      revenue_impact_estimate: revenueImpactEstimate,
      updated_at: new Date().toISOString()
    })
    .eq('id', featureHistoryId);

  if (error) {
    console.error('[Data Collection] Error recording retrospective:', error);
    throw error;
  }

  console.log(`[Data Collection] Retrospective recorded for feature ID: ${featureHistoryId}`);
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Collect current metrics snapshot for a project
 */
async function collectCurrentMetrics(
  projectId: string,
  suggestionId?: string
): Promise<MetricsSnapshot> {
  const supabase = getServiceRoleClient();

  // Calculate date range (last 7 days for weekly metrics)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Get sentiment data
  const { data: sentimentData } = await supabase
    .from('sentiment_analysis')
    .select('sentiment_score')
    .eq('project_id', projectId)
    .gte('created_at', weekAgo.toISOString());

  const avgSentiment = sentimentData && sentimentData.length > 0
    ? sentimentData.reduce((sum, s) => sum + s.sentiment_score, 0) / sentimentData.length
    : 0;

  // Get feedback volume (posts in last 7 days)
  const { count: feedbackCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .gte('created_at', weekAgo.toISOString());

  // TODO: Integrate with subscription/analytics platform for churn and NPS
  // For now, these will be null unless manually provided
  const churnRate = null;
  const npsScore = null;

  return {
    sentimentAvg: Number(avgSentiment.toFixed(2)),
    feedbackVolumeWeekly: feedbackCount || 0,
    churnRate: churnRate,
    npsScore: npsScore
  };
}

/**
 * Estimate adoption rate (placeholder - requires usage tracking integration)
 */
async function estimateAdoptionRate(
  projectId: string,
  featureName: string
): Promise<number | null> {
  // TODO: Integrate with analytics platform to track actual feature usage
  // For now, return null to indicate this metric needs manual collection

  // Example integration points:
  // - Amplitude: Track feature usage events
  // - Mixpanel: Query feature adoption funnel
  // - PostHog: Feature flag adoption rates
  // - Internal analytics: Custom usage tracking

  console.log(
    `[Data Collection] Adoption rate estimation not implemented yet for feature: ${featureName}`
  );

  return null;
}

// =====================================================
// AUTOMATED COLLECTION HELPERS
// =====================================================

/**
 * Find features that need post-launch metric collection
 * (Features launched 30+ days ago without post-launch data)
 */
export async function findFeaturesNeedingPostLaunchCollection(
  projectId: string
): Promise<any[]> {
  const supabase = getServiceRoleClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: features } = await supabase
    .from('feature_impact_history')
    .select('*')
    .eq('project_id', projectId)
    .not('launched_at', 'is', null)
    .is('post_sentiment_avg', null) // Not yet collected
    .lte('launched_at', thirtyDaysAgo.toISOString());

  return features || [];
}

/**
 * Batch collect post-launch metrics for all eligible features
 */
export async function batchCollectPostLaunchMetrics(projectId: string): Promise<void> {
  const features = await findFeaturesNeedingPostLaunchCollection(projectId);

  console.log(
    `[Data Collection] Found ${features.length} features needing post-launch collection`
  );

  for (const feature of features) {
    try {
      await collectPostLaunchMetrics(feature.id);
      console.log(`[Data Collection] ✓ Collected metrics for: ${feature.feature_name}`);
    } catch (error) {
      console.error(
        `[Data Collection] ✗ Failed to collect metrics for: ${feature.feature_name}`,
        error
      );
    }
  }
}
