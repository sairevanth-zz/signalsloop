/**
 * Update Outcome Metrics
 *
 * Updates post-ship metrics for active outcome monitors.
 * Runs daily via cron job to aggregate feedback data.
 */

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import {
  FeatureOutcome,
  PostShipMetrics,
  MetricsUpdateResult,
} from '@/types/outcome-attribution';

/**
 * Calculate post-ship metrics for a feature outcome
 */
async function calculatePostShipMetrics(
  projectId: string,
  relatedThemes: string[],
  monitorStart: Date
): Promise<PostShipMetrics> {
  const supabase = getSupabaseServiceRoleClient();

  // Build theme matching conditions
  const themeConditions = relatedThemes.map(theme =>
    `category.ilike.%${theme}%,title.ilike.%${theme}%,description.ilike.%${theme}%`
  ).join(',');

  // Query posts since monitor started
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select(`
      id,
      category,
      created_at,
      sentiment_analysis!left (
        sentiment_score
      )
    `)
    .eq('project_id', projectId)
    .gte('created_at', monitorStart.toISOString())
    .or(themeConditions);

  if (postsError) {
    console.error('[UpdateMetrics] Error fetching posts:', postsError);
    throw new Error(`Failed to fetch posts: ${postsError.message}`);
  }

  const relatedPosts = posts || [];

  // Calculate average sentiment
  const sentimentScores = relatedPosts
    .filter(p => p.sentiment_analysis?.[0]?.sentiment_score !== null)
    .map(p => p.sentiment_analysis[0].sentiment_score);

  const avgSentiment = sentimentScores.length > 0
    ? sentimentScores.reduce((sum, s) => sum + s, 0) / sentimentScores.length
    : 0;

  return {
    sentiment: avgSentiment,
    themeVolume: relatedPosts.length,
    churnRisk: 0, // Placeholder - can be enhanced with actual churn correlation data
  };
}

/**
 * Update metrics for a single outcome monitor
 *
 * @param outcomeId - The outcome ID to update
 * @returns Updated outcome record
 */
export async function updateOutcomeMetrics(
  outcomeId: string
): Promise<FeatureOutcome> {
  const supabase = getSupabaseServiceRoleClient();

  // 1. Fetch the outcome record
  const { data: outcome, error: fetchError } = await supabase
    .from('feature_outcomes')
    .select('*')
    .eq('id', outcomeId)
    .single();

  if (fetchError || !outcome) {
    throw new Error(`Outcome not found: ${fetchError?.message || 'No data'}`);
  }

  // 2. Check if still in monitoring status
  if (outcome.status !== 'monitoring') {
    console.log(`[UpdateMetrics] Outcome ${outcomeId} is not in monitoring status, skipping`);
    return outcome as FeatureOutcome;
  }

  // 3. Calculate post-ship metrics
  const postShipMetrics = await calculatePostShipMetrics(
    outcome.project_id,
    outcome.related_themes || [],
    new Date(outcome.monitor_start)
  );

  // 4. Update the outcome record
  const { data: updatedOutcome, error: updateError } = await supabase
    .from('feature_outcomes')
    .update({
      post_ship_sentiment: postShipMetrics.sentiment,
      post_ship_theme_volume: postShipMetrics.themeVolume,
      post_ship_churn_risk: postShipMetrics.churnRisk,
      updated_at: new Date().toISOString(),
    })
    .eq('id', outcomeId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to update outcome: ${updateError.message}`);
  }

  console.log(`[UpdateMetrics] Updated outcome ${outcomeId}:`, {
    sentiment: postShipMetrics.sentiment,
    themeVolume: postShipMetrics.themeVolume,
  });

  return updatedOutcome as FeatureOutcome;
}

/**
 * Update metrics for all active outcome monitors
 *
 * This is called by the daily cron job.
 *
 * @returns Summary of the update operation
 */
export async function updateAllActiveMonitors(): Promise<MetricsUpdateResult> {
  const supabase = getSupabaseServiceRoleClient();

  console.log('[UpdateMetrics] Starting daily metrics update for all active monitors');

  // 1. Fetch all active monitors (status = 'monitoring' and monitor_end > now)
  const { data: activeMonitors, error: fetchError } = await supabase
    .from('feature_outcomes')
    .select('id, project_id, related_themes, monitor_start, monitor_end')
    .eq('status', 'monitoring')
    .gt('monitor_end', new Date().toISOString());

  if (fetchError) {
    console.error('[UpdateMetrics] Failed to fetch active monitors:', fetchError);
    return {
      success: false,
      processed: 0,
      failed: 0,
      results: [],
    };
  }

  const monitors = activeMonitors || [];
  console.log(`[UpdateMetrics] Found ${monitors.length} active monitors`);

  const results: MetricsUpdateResult['results'] = [];
  let processed = 0;
  let failed = 0;

  // 2. Update each monitor
  for (const monitor of monitors) {
    try {
      await updateOutcomeMetrics(monitor.id);
      results.push({
        outcomeId: monitor.id,
        success: true,
      });
      processed++;
    } catch (error) {
      console.error(`[UpdateMetrics] Failed to update monitor ${monitor.id}:`, error);
      results.push({
        outcomeId: monitor.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      failed++;
    }
  }

  console.log(`[UpdateMetrics] Completed: ${processed} processed, ${failed} failed`);

  return {
    success: failed === 0,
    processed,
    failed,
    results,
  };
}

/**
 * Check for monitors that have expired and need classification
 *
 * @returns Array of outcome IDs that need classification
 */
export async function getExpiredMonitorsForClassification(): Promise<string[]> {
  const supabase = getSupabaseServiceRoleClient();

  const { data: expiredMonitors, error } = await supabase
    .from('feature_outcomes')
    .select('id')
    .eq('status', 'monitoring')
    .lte('monitor_end', new Date().toISOString())
    .is('outcome_classification', null)
    .or('outcome_classification.eq.pending');

  if (error) {
    console.error('[UpdateMetrics] Failed to fetch expired monitors:', error);
    return [];
  }

  return (expiredMonitors || []).map(m => m.id);
}
