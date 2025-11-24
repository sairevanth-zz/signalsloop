/**
 * Experiment Sync API
 * Manually or automatically sync experiment results from LaunchDarkly/Optimizely
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { getFeatureFlagIntegration } from '@/lib/experiments/feature-flags';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { experiment_id } = body;

    if (!experiment_id) {
      return NextResponse.json({ error: 'Missing experiment_id' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Get experiment details
    const { data: experiment, error: experimentError } = await supabase
      .from('experiments')
      .select('*')
      .eq('id', experiment_id)
      .single();

    if (experimentError || !experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    if (!experiment.feature_flag_key || !experiment.feature_flag_provider) {
      return NextResponse.json(
        { error: 'Experiment is not linked to a feature flag provider' },
        { status: 400 }
      );
    }

    // Sync the experiment
    const result = await syncExperiment(supabase, experiment);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Sync API] Error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Sync a single experiment from its provider
 */
async function syncExperiment(supabase: any, experiment: any) {
  const provider = experiment.feature_flag_provider;
  const flagKey = experiment.feature_flag_key;

  console.log(`[Sync] Syncing experiment ${experiment.id} from ${provider}`);

  try {
    const integration = getFeatureFlagIntegration(provider);

    let metrics;
    if (provider === 'launchdarkly') {
      const metricKeys = [experiment.primary_metric, ...(experiment.secondary_metrics || [])];
      metrics = await integration.fetchExperimentMetrics(flagKey, metricKeys);
    } else if (provider === 'optimizely') {
      const experimentId = experiment.external_experiment_id || flagKey;
      metrics = await integration.fetchExperimentMetrics(experimentId);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // Store results in database
    let resultsSynced = 0;

    for (const [metricName, metricResults] of Object.entries(metrics.metrics)) {
      for (const result of metricResults) {
        const { error } = await supabase.from('experiment_results').upsert(
          {
            experiment_id: experiment.id,
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

        if (!error) {
          resultsSynced++;
        }
      }
    }

    // Record sync log
    await supabase.rpc('record_experiment_sync', {
      p_experiment_id: experiment.id,
      p_sync_type: 'manual',
      p_provider: provider,
      p_status: 'success',
      p_results_synced: resultsSynced,
      p_raw_response: metrics,
    });

    return {
      success: true,
      experiment_id: experiment.id,
      results_synced: resultsSynced,
      metrics: metrics.metrics,
      last_updated: metrics.lastUpdated,
    };
  } catch (error) {
    console.error('[Sync] Failed:', error);

    // Record failed sync
    await supabase.rpc('record_experiment_sync', {
      p_experiment_id: experiment.id,
      p_sync_type: 'manual',
      p_provider: provider,
      p_status: 'failed',
      p_error_message: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}
