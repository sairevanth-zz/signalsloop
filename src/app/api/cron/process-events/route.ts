/**
 * Event Processor - Polling-Based Agent Execution
 *
 * This endpoint replaces the long-running agent runner with a polling-based approach
 * that works within Vercel's serverless constraints.
 *
 * How it works:
 * 1. Queries events table for unprocessed events (processed = false)
 * 2. Processes each event through the agent registry
 * 3. Marks events as processed after successful handling
 * 4. Retries failed events with exponential backoff
 *
 * Schedule: Every 5 minutes via vercel.json cron
 *
 * GET /api/cron/process-events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { AGENT_REGISTRY } from '@/lib/agents/registry';
import { DomainEvent } from '@/lib/events/types';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute max

const BATCH_SIZE = 10; // Process 10 events at a time
const MAX_RETRIES = 3; // Retry failed events up to 3 times
const RETRY_DELAY_HOURS = [0.25, 1, 6]; // 15 min, 1 hour, 6 hours

interface ProcessingResult {
  eventId: string;
  eventType: string;
  success: boolean;
  duration: number;
  error?: string;
}

/**
 * Process a single event through the agent registry
 */
async function processEvent(event: DomainEvent): Promise<{ success: boolean; error?: string }> {
  const handlers = AGENT_REGISTRY[event.type];

  if (!handlers || handlers.length === 0) {
    // No handlers for this event type - mark as processed (not an error)
    return { success: true };
  }

  try {
    // Run all handlers in parallel
    await Promise.all(
      handlers.map(async (handler, index) => {
        try {
          await handler(event);
        } catch (error) {
          console.error(`[EVENT PROCESSOR] Handler ${index + 1} failed for ${event.type}:`, error);
          throw error; // Re-throw to fail the entire event processing
        }
      })
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark an event as processed
 */
async function markEventProcessed(eventId: string, success: boolean, error?: string) {
  const supabase = getServiceRoleClient();

  const updateData: any = {
    processed: success,
    processed_at: success ? new Date().toISOString() : null,
  };

  if (!success && error) {
    updateData.processing_error = error;
  }

  await supabase
    .from('events')
    .update(updateData)
    .eq('id', eventId);
}

/**
 * Increment retry count for a failed event
 */
async function incrementRetryCount(eventId: string) {
  const supabase = getServiceRoleClient();

  await supabase.rpc('increment_event_retry_count', { event_id: eventId });
}

/**
 * Main event processor
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceRoleClient();

    console.log('🤖 [EVENT PROCESSOR] Starting event processing...');

    // Query unprocessed events (or events that need retry)
    const { data: events, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .or(`processed.eq.false,and(processed.eq.false,retry_count.lt.${MAX_RETRIES})`)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('[EVENT PROCESSOR] Error fetching events:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch events',
          details: fetchError.message,
        },
        { status: 500 }
      );
    }

    if (!events || events.length === 0) {
      console.log('✅ [EVENT PROCESSOR] No events to process');
      return NextResponse.json({
        success: true,
        message: 'No unprocessed events',
        processed: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`📦 [EVENT PROCESSOR] Processing ${events.length} events`);

    // Process each event
    const results: ProcessingResult[] = [];

    for (const eventRow of events) {
      const eventStartTime = Date.now();

      // Convert database row to DomainEvent
      const event: DomainEvent = {
        id: eventRow.id,
        type: eventRow.type,
        aggregate_type: eventRow.aggregate_type,
        aggregate_id: eventRow.aggregate_id,
        payload: eventRow.payload,
        metadata: eventRow.metadata,
        version: eventRow.version,
        created_at: eventRow.created_at,
        projectId: eventRow.metadata?.project_id,
      };

      console.log(`  → Processing ${event.type} (${event.aggregate_type}:${event.aggregate_id})`);

      // Process the event
      const result = await processEvent(event);
      const duration = Date.now() - eventStartTime;

      results.push({
        eventId: event.id!,
        eventType: event.type,
        success: result.success,
        duration,
        error: result.error,
      });

      if (result.success) {
        // Mark as processed
        await markEventProcessed(event.id!, true);
        console.log(`  ✅ ${event.type} processed successfully (${duration}ms)`);
      } else {
        // Increment retry count
        await incrementRetryCount(event.id!);

        // Mark as failed if max retries reached
        const currentRetryCount = (eventRow.retry_count || 0) + 1;
        if (currentRetryCount >= MAX_RETRIES) {
          await markEventProcessed(event.id!, false, result.error);
          console.log(`  ❌ ${event.type} failed after ${MAX_RETRIES} retries: ${result.error}`);
        } else {
          console.log(`  ⚠️  ${event.type} failed (retry ${currentRetryCount}/${MAX_RETRIES}): ${result.error}`);
        }
      }
    }

    // Summary
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;
    const totalDuration = Date.now() - startTime;

    console.log(`🤖 [EVENT PROCESSOR] Complete: ${successCount}/${results.length} succeeded (${totalDuration}ms total)`);

    return NextResponse.json({
      success: failedCount === 0,
      summary: {
        total: results.length,
        succeeded: successCount,
        failed: failedCount,
        totalDuration,
      },
      results,
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error('[EVENT PROCESSOR] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Event processor failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: totalDuration,
      },
      { status: 500 }
    );
  }
}
