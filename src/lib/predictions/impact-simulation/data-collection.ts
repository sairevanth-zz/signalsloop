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
import { publishEvent } from '@/lib/events/publisher';
import { EventType, AggregateType } from '@/lib/events/types';
import { getFeatureAdoptionRate, getChurnRate, getNPS } from '@/lib/analytics';

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

  // Publish feature launch event
  try {
    await publishEvent({
      type: EventType.FEATURE_LAUNCHED,
      aggregate_type: AggregateType.FEATURE_IMPACT,
      aggregate_id: record.id,
      payload: {
        feature_name: data.featureName,
        feature_category: data.featureCategory,
        suggestion_id: data.suggestionId,
        effort_estimate: data.effortEstimate,
        actual_effort_days: data.actualEffortDays,
        pre_metrics: preLaunchMetrics,
      },
      metadata: {
        project_id: data.projectId,
        source: 'feature_tracking',
      },
      version: 1,
    });
  } catch (eventError) {
    console.error('[Data Collection] Failed to publish feature launch event:', eventError);
    // Don't fail the entire operation if event publishing fails
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

  // Publish metrics collection event
  try {
    await publishEvent({
      type: EventType.FEATURE_METRICS_COLLECTED,
      aggregate_type: AggregateType.FEATURE_IMPACT,
      aggregate_id: featureHistoryId,
      payload: {
        feature_name: feature.feature_name,
        post_metrics: postLaunchMetrics,
        adoption_rate: adoptionRate,
        days_since_launch: Math.floor(
          (Date.now() - new Date(feature.launched_at).getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
      metadata: {
        project_id: feature.project_id,
        source: 'metrics_collection',
      },
      version: 1,
    });
  } catch (eventError) {
    console.error('[Data Collection] Failed to publish metrics collection event:', eventError);
    // Don't fail the entire operation if event publishing fails
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

  // Get feature record for event payload
  const { data: feature } = await supabase
    .from('feature_impact_history')
    .select('project_id, feature_name')
    .eq('id', featureHistoryId)
    .single();

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

  // Publish retrospective event
  if (feature) {
    try {
      await publishEvent({
        type: EventType.FEATURE_RETROSPECTIVE_RECORDED,
        aggregate_type: AggregateType.FEATURE_IMPACT,
        aggregate_id: featureHistoryId,
        payload: {
          feature_name: feature.feature_name,
          success_rating: successRating,
          lessons_learned: lessonsLearned,
          revenue_impact_estimate: revenueImpactEstimate,
        },
        metadata: {
          project_id: feature.project_id,
          source: 'retrospective',
        },
        version: 1,
      });
    } catch (eventError) {
      console.error('[Data Collection] Failed to publish retrospective event:', eventError);
      // Don't fail the entire operation if event publishing fails
    }
  }

  console.log(`[Data Collection] Retrospective recorded for feature ID: ${featureHistoryId}`);
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Collect current metrics snapshot for a project
 * If suggestionId is provided, metrics are filtered to posts related to that theme
 */
async function collectCurrentMetrics(
  projectId: string,
  suggestionId?: string
): Promise<MetricsSnapshot> {
  const supabase = getServiceRoleClient();

  // Calculate date range (last 7 days for weekly metrics)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Get theme_id from suggestion if provided
  let themeId: string | null = null;
  if (suggestionId) {
    const { data: suggestion } = await supabase
      .from('roadmap_suggestions')
      .select('theme_id')
      .eq('id', suggestionId)
      .single();

    themeId = suggestion?.theme_id || null;
  }

  // Get post IDs related to this theme (if theme filtering is enabled)
  let relevantPostIds: string[] | null = null;
  if (themeId) {
    const { data: feedbackThemes } = await supabase
      .from('feedback_themes')
      .select('feedback_id')
      .eq('theme_id', themeId);

    relevantPostIds = feedbackThemes ? feedbackThemes.map(ft => ft.feedback_id) : [];

    // If no posts found for this theme, return empty metrics
    if (relevantPostIds.length === 0) {
      return {
        sentimentAvg: 0,
        feedbackVolumeWeekly: 0,
        churnRate: null,
        npsScore: null
      };
    }
  }

  // Build sentiment query with optional post filtering
  let sentimentQuery = supabase
    .from('sentiment_analysis')
    .select('sentiment_score, post_id')
    .gte('created_at', weekAgo.toISOString());

  // Filter by relevant posts if theme-specific
  if (relevantPostIds && relevantPostIds.length > 0) {
    sentimentQuery = sentimentQuery.in('post_id', relevantPostIds);
  } else if (!themeId) {
    // If no theme filtering, filter by project
    // Join through posts table to filter by project_id
    const { data: projectPosts } = await supabase
      .from('posts')
      .select('id')
      .eq('project_id', projectId)
      .gte('created_at', weekAgo.toISOString());

    const projectPostIds = projectPosts ? projectPosts.map(p => p.id) : [];
    if (projectPostIds.length > 0) {
      sentimentQuery = sentimentQuery.in('post_id', projectPostIds);
    }
  }

  const { data: sentimentData } = await sentimentQuery;

  const avgSentiment = sentimentData && sentimentData.length > 0
    ? sentimentData.reduce((sum, s) => sum + s.sentiment_score, 0) / sentimentData.length
    : 0;

  // Build feedback volume query with optional post filtering
  let feedbackQuery = supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .gte('created_at', weekAgo.toISOString());

  // Filter by relevant posts if theme-specific
  if (relevantPostIds && relevantPostIds.length > 0) {
    feedbackQuery = feedbackQuery.in('id', relevantPostIds);
  }

  const { count: feedbackCount } = await feedbackQuery;

  // Integrate with analytics platform for churn and NPS
  // These require external analytics/subscription platforms to be configured
  let churnRate: number | null = null;
  let npsScore: number | null = null;

  try {
    // Get churn rate from analytics platform (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    churnRate = await getChurnRate(thirtyDaysAgo, new Date());

    // Get NPS score from analytics platform (last 30 days)
    npsScore = await getNPS(thirtyDaysAgo, new Date());

    if (churnRate !== null) {
      console.log(`[Data Collection] Churn rate: ${(churnRate * 100).toFixed(1)}%`);
    }

    if (npsScore !== null) {
      console.log(`[Data Collection] NPS score: ${npsScore}`);
    }
  } catch (error) {
    console.error('[Data Collection] Error fetching churn/NPS metrics:', error);
    // Leave as null if analytics unavailable
  }

  return {
    sentimentAvg: Number(avgSentiment.toFixed(2)),
    feedbackVolumeWeekly: feedbackCount || 0,
    churnRate,
    npsScore,
  };
}

/**
 * Estimate adoption rate (placeholder - requires usage tracking integration)
 */
async function estimateAdoptionRate(
  projectId: string,
  featureName: string
): Promise<number | null> {
  // Integrate with configured analytics platform to track actual feature usage
  // Supported platforms: Amplitude, Mixpanel, PostHog, Segment, Custom
  //
  // Setup: Set environment variables in .env.local:
  // - ANALYTICS_PROVIDER=amplitude|mixpanel|posthog|segment|custom
  // - ANALYTICS_ENABLED=true
  // - ANALYTICS_API_KEY=your_api_key
  // - ANALYTICS_API_SECRET=your_api_secret (if required)

  try {
    // Calculate 30-day post-launch window
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Get adoption rate from analytics platform
    const adoptionRate = await getFeatureAdoptionRate(featureName, startDate, endDate);

    if (adoptionRate !== null) {
      console.log(
        `[Data Collection] Adoption rate for ${featureName}: ${(adoptionRate * 100).toFixed(1)}%`
      );
      return adoptionRate;
    }

    console.log(
      `[Data Collection] Analytics not configured - adoption rate unavailable for: ${featureName}`
    );
    return null;
  } catch (error) {
    console.error(`[Data Collection] Error fetching adoption rate for ${featureName}:`, error);
    return null;
  }
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
 * Returns the count of features successfully collected
 */
export async function batchCollectPostLaunchMetrics(projectId: string): Promise<number> {
  const features = await findFeaturesNeedingPostLaunchCollection(projectId);

  console.log(
    `[Data Collection] Found ${features.length} features needing post-launch collection`
  );

  let successCount = 0;

  for (const feature of features) {
    try {
      await collectPostLaunchMetrics(feature.id);
      console.log(`[Data Collection] ✓ Collected metrics for: ${feature.feature_name}`);
      successCount++;
    } catch (error) {
      console.error(
        `[Data Collection] ✗ Failed to collect metrics for: ${feature.feature_name}`,
        error
      );
    }
  }

  return successCount;
}
