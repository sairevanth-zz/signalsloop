/**
 * Outcome Metrics Update Cron Job
 *
 * Updates post-ship metrics for all active outcome monitors.
 * Runs daily to aggregate feedback data for features that have shipped.
 *
 * Called via the orchestrator at 9 AM daily.
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateAllActiveMonitors } from '@/lib/outcome-attribution';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[OutcomeMetrics] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[OutcomeMetrics] Starting daily metrics update');
    const startTime = Date.now();

    // Update all active monitors
    const result = await updateAllActiveMonitors();

    const duration = Date.now() - startTime;

    console.log('[OutcomeMetrics] Completed in', duration, 'ms');
    console.log('[OutcomeMetrics] Results:', {
      processed: result.processed,
      failed: result.failed,
    });

    return NextResponse.json({
      success: result.success,
      message: `Updated ${result.processed} outcome monitors`,
      duration,
      processed: result.processed,
      failed: result.failed,
      results: result.results,
    });
  } catch (error) {
    console.error('[OutcomeMetrics] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update outcome metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
