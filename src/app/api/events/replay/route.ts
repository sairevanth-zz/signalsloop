/**
 * Event Replay API
 *
 * POST /api/events/replay
 *
 * Replays an event by re-publishing it to trigger agents again
 * Useful for:
 * - Reprocessing failed events
 * - Testing agent behavior
 * - Rebuilding projections
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { publishEvent } from '@/lib/events/publisher';

export const runtime = 'nodejs';

/**
 * Replay an event
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_id, correlation_id } = body;

    if (!event_id && !correlation_id) {
      return NextResponse.json(
        { error: 'event_id or correlation_id is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // If replaying a single event
    if (event_id) {
      // Fetch the original event
      const { data: originalEvent, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', event_id)
        .single();

      if (fetchError || !originalEvent) {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }

      // Re-publish the event with replay marker
      const replayedEvent = {
        type: originalEvent.type,
        aggregate_type: originalEvent.aggregate_type,
        aggregate_id: originalEvent.aggregate_id,
        payload: originalEvent.payload,
        metadata: {
          ...originalEvent.metadata,
          replayed: true,
          replayed_from: event_id,
          replayed_at: new Date().toISOString(),
        },
        version: originalEvent.version,
      };

      await publishEvent(replayedEvent);

      return NextResponse.json({
        success: true,
        message: 'Event replayed successfully',
        replayed_event_id: event_id,
        new_correlation_id: replayedEvent.metadata.correlation_id,
      });
    }

    // If replaying an entire event chain (by correlation_id)
    if (correlation_id) {
      // Fetch all events in the chain
      const { data: chainEvents, error: chainError } = await supabase
        .from('events')
        .select('*')
        .eq('metadata->>correlation_id', correlation_id)
        .order('created_at', { ascending: true });

      if (chainError || !chainEvents || chainEvents.length === 0) {
        return NextResponse.json(
          { error: 'Event chain not found' },
          { status: 404 }
        );
      }

      // Replay each event in order
      const newCorrelationId = `replay-${Date.now()}`;
      const replayedEvents = [];

      for (const event of chainEvents) {
        const replayedEvent = {
          type: event.type,
          aggregate_type: event.aggregate_type,
          aggregate_id: event.aggregate_id,
          payload: event.payload,
          metadata: {
            ...event.metadata,
            replayed: true,
            replayed_from: event.id,
            replayed_at: new Date().toISOString(),
            correlation_id: newCorrelationId,
          },
          version: event.version,
        };

        await publishEvent(replayedEvent);
        replayedEvents.push(replayedEvent);

        // Small delay to maintain order
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return NextResponse.json({
        success: true,
        message: `Event chain replayed successfully (${chainEvents.length} events)`,
        replayed_events_count: chainEvents.length,
        original_correlation_id: correlation_id,
        new_correlation_id: newCorrelationId,
      });
    }

    return NextResponse.json(
      { error: 'Invalid replay request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Error replaying event:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get replayable events (failed events)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Get failed events (events with error metadata)
    const { data: failedEvents, error } = await supabase
      .from('events')
      .select('*')
      .eq('metadata->>project_id', projectId)
      .or('metadata->>error.is.null.not,metadata->>failed.eq.true')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching failed events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch replayable events' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      failed_events: failedEvents || [],
      count: failedEvents?.length || 0,
    });
  } catch (error) {
    console.error('❌ Error getting replayable events:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
