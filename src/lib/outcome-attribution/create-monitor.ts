/**
 * Create Outcome Monitor
 *
 * Creates an outcome monitoring record when a feature (roadmap suggestion) ships.
 * Captures pre-ship metrics for later comparison with post-ship performance.
 */

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import {
  FeatureOutcome,
  PreShipMetrics,
  SampleFeedback,
  CreateOutcomeMonitorSchema,
} from '@/types/outcome-attribution';

/**
 * Calculate pre-ship metrics for a feature based on its related theme
 */
async function calculatePreShipMetrics(
  projectId: string,
  themeName: string
): Promise<PreShipMetrics> {
  const supabase = getSupabaseServiceRoleClient();

  // Get posts related to this theme from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Query posts with sentiment analysis
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      description,
      category,
      created_at,
      sentiment_analysis!left (
        sentiment_score,
        sentiment_category
      )
    `)
    .eq('project_id', projectId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .or(`category.ilike.%${themeName}%,title.ilike.%${themeName}%,description.ilike.%${themeName}%`)
    .order('created_at', { ascending: false });

  if (postsError) {
    console.error('Error fetching posts for pre-ship metrics:', postsError);
    throw new Error(`Failed to fetch related posts: ${postsError.message}`);
  }

  const relatedPosts = posts || [];

  // Calculate average sentiment
  const sentimentScores = relatedPosts
    .filter(p => p.sentiment_analysis?.[0]?.sentiment_score !== null)
    .map(p => p.sentiment_analysis[0].sentiment_score);

  const avgSentiment = sentimentScores.length > 0
    ? sentimentScores.reduce((sum, s) => sum + s, 0) / sentimentScores.length
    : 0;

  // Extract sample feedback (up to 10 items)
  const sampleFeedback: SampleFeedback[] = relatedPosts.slice(0, 10).map(p => ({
    id: p.id,
    title: p.title,
    description: p.description?.substring(0, 500) || '',
    sentiment_score: p.sentiment_analysis?.[0]?.sentiment_score || null,
    created_at: p.created_at,
  }));

  // Get related themes from posts
  const relatedThemes = [...new Set(
    relatedPosts
      .filter(p => p.category)
      .map(p => p.category)
  )].slice(0, 10);

  return {
    sentiment: avgSentiment,
    themeVolume: relatedPosts.length,
    churnRisk: 0, // Placeholder - can be enhanced with actual churn correlation data
    relatedThemes,
    relatedFeedbackIds: relatedPosts.map(p => p.id),
    sampleFeedback,
  };
}

/**
 * Create an outcome monitor for a shipped feature
 *
 * @param suggestionId - The roadmap suggestion ID that was shipped
 * @param projectId - The project ID
 * @returns The created feature outcome record
 */
export async function createOutcomeMonitor(
  suggestionId: string,
  projectId: string
): Promise<FeatureOutcome> {
  // Validate inputs
  const validation = CreateOutcomeMonitorSchema.safeParse({ suggestionId, projectId });
  if (!validation.success) {
    throw new Error(`Invalid input: ${validation.error.message}`);
  }

  const supabase = getSupabaseServiceRoleClient();

  // 1. Verify the suggestion exists and get its details
  const { data: suggestion, error: suggestionError } = await supabase
    .from('roadmap_suggestions')
    .select(`
      id,
      project_id,
      status,
      theme_id,
      themes!inner (
        theme_name
      )
    `)
    .eq('id', suggestionId)
    .single();

  if (suggestionError || !suggestion) {
    throw new Error(`Suggestion not found: ${suggestionError?.message || 'No data'}`);
  }

  // 2. Verify project matches
  if (suggestion.project_id !== projectId) {
    throw new Error('Project ID does not match suggestion');
  }

  // 3. Check if outcome already exists
  const { data: existingOutcome } = await supabase
    .from('feature_outcomes')
    .select('id')
    .eq('suggestion_id', suggestionId)
    .single();

  if (existingOutcome) {
    throw new Error('Outcome monitor already exists for this suggestion');
  }

  // 4. Calculate pre-ship metrics
  const themeName = suggestion.themes?.theme_name || '';
  console.log(`[OutcomeAttribution] Calculating pre-ship metrics for theme: ${themeName}`);

  const preShipMetrics = await calculatePreShipMetrics(projectId, themeName);

  // 5. Create the outcome record
  const monitorEnd = new Date();
  monitorEnd.setDate(monitorEnd.getDate() + 30); // 30 day monitoring window

  const outcomeData = {
    project_id: projectId,
    suggestion_id: suggestionId,
    shipped_at: new Date().toISOString(),
    monitor_start: new Date().toISOString(),
    monitor_end: monitorEnd.toISOString(),
    pre_ship_sentiment: preShipMetrics.sentiment,
    pre_ship_theme_volume: preShipMetrics.themeVolume,
    pre_ship_churn_risk: preShipMetrics.churnRisk,
    related_themes: preShipMetrics.relatedThemes,
    related_feedback_ids: preShipMetrics.relatedFeedbackIds,
    sample_feedback: preShipMetrics.sampleFeedback,
    status: 'monitoring',
    outcome_classification: 'pending',
  };

  const { data: outcome, error: insertError } = await supabase
    .from('feature_outcomes')
    .insert(outcomeData)
    .select()
    .single();

  if (insertError) {
    console.error('[OutcomeAttribution] Failed to create outcome:', insertError);
    throw new Error(`Failed to create outcome monitor: ${insertError.message}`);
  }

  console.log(`[OutcomeAttribution] Created outcome monitor: ${outcome.id}`);
  console.log(`[OutcomeAttribution] Pre-ship metrics:`, {
    sentiment: preShipMetrics.sentiment,
    themeVolume: preShipMetrics.themeVolume,
    relatedThemes: preShipMetrics.relatedThemes.length,
  });

  return outcome as FeatureOutcome;
}

/**
 * Ship a feature and create its outcome monitor
 *
 * This is a convenience function that both updates the suggestion status
 * and creates the outcome monitor in one operation.
 *
 * @param suggestionId - The roadmap suggestion ID to ship
 * @param projectId - The project ID
 * @returns The created feature outcome record
 */
export async function shipFeatureAndCreateMonitor(
  suggestionId: string,
  projectId: string
): Promise<FeatureOutcome> {
  const supabase = getSupabaseServiceRoleClient();

  // 1. Update suggestion status to 'completed'
  const { error: updateError } = await supabase
    .from('roadmap_suggestions')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', suggestionId)
    .eq('project_id', projectId);

  if (updateError) {
    throw new Error(`Failed to update suggestion status: ${updateError.message}`);
  }

  // 2. Create the outcome monitor
  return createOutcomeMonitor(suggestionId, projectId);
}
