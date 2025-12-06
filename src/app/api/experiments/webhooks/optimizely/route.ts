/**
 * Optimizely Webhook Handler
 * Receives real-time notifications when experiments change or results update
 * https://docs.developers.optimizely.com/web/docs/webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { getFeatureFlagIntegration } from '@/lib/experiments/feature-flags';
import { verifyOptimizelySignature } from '@/lib/webhook-security';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    console.log('[Optimizely Webhook] Received event:', body.event_type || body.type);

    // Verify webhook signature (required if secret is configured)
    const signature = request.headers.get('x-optimizely-signature');
    const webhookSecret = process.env.OPTIMIZELY_WEBHOOK_SECRET;
    
    if (webhookSecret) {
      const verification = verifyOptimizelySignature(rawBody, signature, webhookSecret);
      if (!verification.valid) {
        console.error('[Optimizely Webhook] Signature verification failed:', verification.error);
        return NextResponse.json(
          { error: 'Invalid signature', details: verification.error },
          { status: 401 }
        );
      }
      console.log('[Optimizely Webhook] Signature verified');
    } else {
      console.warn('[Optimizely Webhook] No webhook secret configured - signature not verified');
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Handle different event types
    const eventType = body.event_type || body.type;

    switch (eventType) {
      case 'experiment.started':
        await handleExperimentStarted(supabase, body);
        break;

      case 'experiment.stopped':
      case 'experiment.paused':
        await handleExperimentStopped(supabase, body);
        break;

      case 'experiment.results_updated':
      case 'experiment.winner_declared':
        await syncExperimentResults(supabase, body);
        break;

      default:
        console.log(`[Optimizely Webhook] Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (error) {
    console.error('[Optimizely Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleExperimentStarted(supabase: any, event: any) {
  const experimentId = event.data?.experiment_id || event.experiment_id;

  console.log(`[Optimizely] Experiment started: ${experimentId}`);

  const { error } = await supabase
    .from('experiments')
    .update({ status: 'running', start_date: new Date().toISOString() })
    .eq('external_experiment_id', experimentId)
    .eq('feature_flag_provider', 'optimizely');

  if (error) {
    console.error('[Optimizely] Failed to update experiment status:', error);
  }
}

async function handleExperimentStopped(supabase: any, event: any) {
  const experimentId = event.data?.experiment_id || event.experiment_id;
  const status = event.event_type === 'experiment.stopped' ? 'completed' : 'paused';

  console.log(`[Optimizely] Experiment ${status}: ${experimentId}`);

  const updateData: any = { status };
  if (status === 'completed') {
    updateData.actual_end_date = new Date().toISOString();
  }

  const { error } = await supabase
    .from('experiments')
    .update(updateData)
    .eq('external_experiment_id', experimentId)
    .eq('feature_flag_provider', 'optimizely');

  if (error) {
    console.error('[Optimizely] Failed to update experiment status:', error);
  }
}

async function syncExperimentResults(supabase: any, event: any) {
  const experimentId = event.data?.experiment_id || event.experiment_id;

  console.log(`[Optimizely] Syncing results for: ${experimentId}`);

  // Find experiment
  const { data: experiment } = await supabase
    .from('experiments')
    .select('id, project_id')
    .eq('external_experiment_id', experimentId)
    .eq('feature_flag_provider', 'optimizely')
    .single();

  if (!experiment) {
    console.log(`[Optimizely] No experiment found with ID: ${experimentId}`);
    return;
  }

  // Fetch latest metrics from Optimizely
  try {
    const integration = getFeatureFlagIntegration('optimizely');
    const metrics = await integration.fetchExperimentMetrics(experimentId);

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
      p_provider: 'optimizely',
      p_status: 'success',
      p_results_synced: Object.keys(metrics.metrics).length,
    });

    console.log(`[Optimizely] Successfully synced ${Object.keys(metrics.metrics).length} metrics`);
  } catch (error) {
    console.error('[Optimizely] Sync failed:', error);

    await supabase.rpc('record_experiment_sync', {
      p_experiment_id: experiment.id,
      p_sync_type: 'webhook',
      p_provider: 'optimizely',
      p_status: 'failed',
      p_error_message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
