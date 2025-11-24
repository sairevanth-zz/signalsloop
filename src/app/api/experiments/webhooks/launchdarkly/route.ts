/**
 * LaunchDarkly Webhook Handler
 * Receives real-time notifications when flags change or experiments update
 * https://docs.launchdarkly.com/home/connecting/webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { getFeatureFlagIntegration } from '@/lib/experiments/feature-flags';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[LaunchDarkly Webhook] Received:', body);

    // Verify webhook signature (if configured)
    const signature = request.headers.get('x-ld-signature');
    if (signature && process.env.LAUNCHDARKLY_WEBHOOK_SECRET) {
      // TODO: Implement signature verification
      // const isValid = verifyWebhookSignature(body, signature);
      // if (!isValid) {
      //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      // }
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Handle different event types
    const eventKind = body.kind || body._eventType;

    switch (eventKind) {
      case 'flag-evaluated':
      case 'flag-config-change':
        // Flag configuration changed - sync experiment data
        await handleFlagChange(supabase, body);
        break;

      case 'experiment-started':
      case 'experiment-stopped':
        // Experiment status changed
        await handleExperimentStatusChange(supabase, body);
        break;

      case 'experiment-results-updated':
        // New experiment results available
        await syncExperimentResults(supabase, body);
        break;

      default:
        console.log(`[LaunchDarkly Webhook] Unhandled event type: ${eventKind}`);
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (error) {
    console.error('[LaunchDarkly Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleFlagChange(supabase: any, event: any) {
  const flagKey = event.data?.key || event.flagKey;
  if (!flagKey) return;

  console.log(`[LaunchDarkly] Flag changed: ${flagKey}`);

  // Find experiments using this flag
  const { data: experiments } = await supabase
    .from('experiments')
    .select('id, project_id, feature_flag_key')
    .eq('feature_flag_key', flagKey)
    .eq('feature_flag_provider', 'launchdarkly')
    .eq('status', 'running');

  if (experiments && experiments.length > 0) {
    for (const experiment of experiments) {
      console.log(`[LaunchDarkly] Triggering sync for experiment: ${experiment.id}`);
      // Trigger sync (will be handled by sync API)
      // For now, just log - actual sync will happen via scheduled job or manual trigger
    }
  }
}

async function handleExperimentStatusChange(supabase: any, event: any) {
  const flagKey = event.data?.key || event.flagKey;
  const newStatus = event.kind === 'experiment-started' ? 'running' : 'paused';

  console.log(`[LaunchDarkly] Experiment status changed: ${flagKey} -> ${newStatus}`);

  // Update experiment status
  const { error } = await supabase
    .from('experiments')
    .update({ status: newStatus })
    .eq('feature_flag_key', flagKey)
    .eq('feature_flag_provider', 'launchdarkly');

  if (error) {
    console.error('[LaunchDarkly] Failed to update experiment status:', error);
  }
}

async function syncExperimentResults(supabase: any, event: any) {
  const flagKey = event.data?.key || event.flagKey;

  console.log(`[LaunchDarkly] Syncing results for: ${flagKey}`);

  // Find experiment
  const { data: experiment } = await supabase
    .from('experiments')
    .select('id, project_id, primary_metric, secondary_metrics')
    .eq('feature_flag_key', flagKey)
    .eq('feature_flag_provider', 'launchdarkly')
    .single();

  if (!experiment) {
    console.log(`[LaunchDarkly] No experiment found for flag: ${flagKey}`);
    return;
  }

  // Fetch latest metrics from LaunchDarkly
  try {
    const integration = getFeatureFlagIntegration('launchdarkly');
    const metricKeys = [experiment.primary_metric, ...(experiment.secondary_metrics || [])];
    const metrics = await integration.fetchExperimentMetrics(flagKey, metricKeys);

    // Store results in database
    for (const [metricName, metricResults] of Object.entries(metrics.metrics)) {
      for (const result of metricResults) {
        await supabase.from('experiment_results').upsert({
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
        });
      }
    }

    // Record sync
    await supabase.rpc('record_experiment_sync', {
      p_experiment_id: experiment.id,
      p_sync_type: 'webhook',
      p_provider: 'launchdarkly',
      p_status: 'success',
      p_results_synced: Object.keys(metrics.metrics).length,
    });

    console.log(`[LaunchDarkly] Successfully synced ${Object.keys(metrics.metrics).length} metrics`);
  } catch (error) {
    console.error('[LaunchDarkly] Sync failed:', error);

    await supabase.rpc('record_experiment_sync', {
      p_experiment_id: experiment.id,
      p_sync_type: 'webhook',
      p_provider: 'launchdarkly',
      p_status: 'failed',
      p_error_message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
