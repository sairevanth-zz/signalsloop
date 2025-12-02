/**
 * Outcome Classification Cron Job
 *
 * Classifies feature outcomes after their 30-day monitoring period ends.
 * Uses GPT-4o to analyze pre/post metrics and determine success.
 *
 * Called via the orchestrator at 9 AM daily.
 */

import { NextRequest, NextResponse } from 'next/server';
import { classifyAllPendingOutcomes } from '@/lib/outcome-attribution';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes (classification uses GPT-4o)

/**
 * Send notification for classified outcomes
 */
async function sendClassificationNotifications(
  classifiedOutcomeIds: string[]
): Promise<void> {
  if (classifiedOutcomeIds.length === 0) return;

  const supabase = getSupabaseServiceRoleClient();

  // Fetch classified outcomes with project details
  const { data: outcomes, error } = await supabase
    .from('feature_outcomes_detailed')
    .select('*')
    .in('id', classifiedOutcomeIds);

  if (error || !outcomes) {
    console.error('[OutcomeClassify] Failed to fetch outcomes for notifications:', error);
    return;
  }

  // Mark notifications as sent
  // In production, this would also send emails via Resend
  for (const outcome of outcomes) {
    const { error: updateError } = await supabase
      .from('feature_outcomes')
      .update({
        notification_sent: true,
        notification_sent_at: new Date().toISOString(),
      })
      .eq('id', outcome.id);

    if (updateError) {
      console.error(`[OutcomeClassify] Failed to mark notification sent for ${outcome.id}:`, updateError);
    } else {
      console.log(`[OutcomeClassify] Notification marked for outcome ${outcome.id}:`, {
        theme: outcome.theme_name,
        classification: outcome.outcome_classification,
        project: outcome.project_name,
      });
    }
  }

  // TODO: Integrate with email service (Resend)
  // For now, just log that we would send notifications
  console.log(`[OutcomeClassify] Would send ${outcomes.length} notification emails`);
}

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[OutcomeClassify] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[OutcomeClassify] Starting outcome classification');
    const startTime = Date.now();

    // Classify all pending outcomes
    const result = await classifyAllPendingOutcomes();

    // Send notifications for successfully classified outcomes
    const classifiedIds = result.results
      .filter(r => r.success)
      .map(r => r.outcomeId);

    await sendClassificationNotifications(classifiedIds);

    const duration = Date.now() - startTime;

    console.log('[OutcomeClassify] Completed in', duration, 'ms');
    console.log('[OutcomeClassify] Results:', {
      classified: result.classified,
      failed: result.failed,
    });

    return NextResponse.json({
      success: result.success,
      message: `Classified ${result.classified} outcomes`,
      duration,
      classified: result.classified,
      failed: result.failed,
      results: result.results,
    });
  } catch (error) {
    console.error('[OutcomeClassify] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to classify outcomes',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
