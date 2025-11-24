/**
 * Experiment Sync Cron Job
 * Automatically syncs running experiments from LaunchDarkly/Optimizely
 * Runs every 15 minutes (configurable per experiment)
 */

import { NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { getFeatureFlagIntegration } from '@/lib/experiments/feature-flags';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function GET() {
  const startTime = Date.now();
  console.log('[Cron: Sync Experiments] Starting...');

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    // Get experiments that need syncing
    const { data: experiments, error } = await supabase.rpc('get_experiments_needing_sync');

    if (error) {
      console.error('[Cron: Sync Experiments] Failed to get experiments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!experiments || experiments.length === 0) {
      console.log('[Cron: Sync Experiments] No experiments need syncing');
      return NextResponse.json({
        status: 'success',
        experiments_synced: 0,
        duration_ms: Date.now() - startTime,
      });
    }

    console.log(`[Cron: Sync Experiments] Found ${experiments.length} experiments to sync`);

    const results = {
      total: experiments.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Sync each experiment
    for (const exp of experiments) {
      try {
        console.log(`[Cron: Sync Experiments] Syncing experiment ${exp.id} (${exp.name})`);

        const provider = exp.feature_flag_provider;
        const integration = getFeatureFlagIntegration(provider);

        let metrics;
        if (provider === 'launchdarkly') {
          // Get experiment details to get metric keys
          const { data: experimentDetails } = await supabase
            .from('experiments')
            .select('primary_metric, secondary_metrics')
            .eq('id', exp.id)
            .single();

          const metricKeys = [
            experimentDetails?.primary_metric,
            ...(experimentDetails?.secondary_metrics || []),
          ].filter(Boolean);

          metrics = await integration.fetchExperimentMetrics(exp.feature_flag_key, metricKeys);
        } else if (provider === 'optimizely') {
          metrics = await integration.fetchExperimentMetrics(exp.feature_flag_key);
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }

        // Store results
        let resultsSynced = 0;
        for (const [metricName, metricResults] of Object.entries(metrics.metrics)) {
          for (const result of metricResults) {
            const { error: insertError } = await supabase
              .from('experiment_results')
              .upsert(
                {
                  experiment_id: exp.id,
                  metric_name: metricName,
                  variant: result.variant,
                  sample_size: result.sampleSize,
                  mean_value: result.mean,
                  std_dev: result.stdDev,
                  conversion_rate: result.conversionRate,
                  p_value: result.pValue,
                  statistical_significance: result.isSignificant,
                  confidence_interval: result.credibleInterval,
                  measured_at: new Date().toISOString(),
                },
                {
                  onConflict: 'experiment_id,metric_name,variant,measured_at',
                }
              );

            if (!insertError) {
              resultsSynced++;
            }
          }
        }

        // Record successful sync
        await supabase.rpc('record_experiment_sync', {
          p_experiment_id: exp.id,
          p_sync_type: 'scheduled',
          p_provider: provider,
          p_status: 'success',
          p_results_synced: resultsSynced,
        });

        results.success++;
        console.log(`[Cron: Sync Experiments] ✓ Synced ${resultsSynced} results for ${exp.name}`);
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${exp.name}: ${errorMsg}`);

        console.error(`[Cron: Sync Experiments] ✗ Failed to sync ${exp.name}:`, error);

        // Record failed sync
        await supabase.rpc('record_experiment_sync', {
          p_experiment_id: exp.id,
          p_sync_type: 'scheduled',
          p_provider: exp.feature_flag_provider,
          p_status: 'failed',
          p_error_message: errorMsg,
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Cron: Sync Experiments] Completed in ${duration}ms - ${results.success} success, ${results.failed} failed`
    );

    return NextResponse.json({
      status: 'success',
      ...results,
      duration_ms: duration,
    });
  } catch (error) {
    console.error('[Cron: Sync Experiments] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Sync job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
