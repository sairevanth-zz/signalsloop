/**
 * Experiment Event Tracking API
 *
 * POST /api/experiments/track - Track conversion events
 * Used by the JavaScript SDK to record conversions and goals
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'edge'; // Use edge runtime for low latency

interface TrackRequest {
    experimentId: string;
    visitorId: string;
    eventType: 'pageview' | 'click' | 'conversion' | 'revenue' | 'custom';
    eventName: string;
    eventValue?: number;
    properties?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
    try {
        const body: TrackRequest = await request.json();
        const { experimentId, visitorId, eventType, eventName, eventValue, properties } = body;

        if (!experimentId || !visitorId || !eventType || !eventName) {
            return NextResponse.json(
                { error: 'experimentId, visitorId, eventType, and eventName are required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database client not available' },
                { status: 500 }
            );
        }

        // Get the visitor's assignment to find their variant
        const { data: assignment, error: assignError } = await supabase
            .from('experiment_assignments')
            .select('id, variant_id')
            .eq('experiment_id', experimentId)
            .eq('visitor_id', visitorId)
            .single();

        if (assignError || !assignment) {
            return NextResponse.json(
                { error: 'Visitor not assigned to this experiment' },
                { status: 404 }
            );
        }

        // Record the event
        const { data: event, error: eventError } = await supabase
            .from('experiment_events')
            .insert({
                experiment_id: experimentId,
                variant_id: assignment.variant_id,
                assignment_id: assignment.id,
                visitor_id: visitorId,
                event_type: eventType,
                event_name: eventName,
                event_value: eventValue || null,
                event_properties: properties || {},
            })
            .select('id')
            .single();

        if (eventError) {
            console.error('[Experiments Track] Error recording event:', eventError);
            return NextResponse.json(
                { error: 'Failed to record event' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            eventId: event.id,
        });

    } catch (error) {
        console.error('[Experiments Track] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Batch tracking endpoint
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { events } = body as { events: TrackRequest[] };

        if (!Array.isArray(events) || events.length === 0) {
            return NextResponse.json(
                { error: 'events array is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database client not available' },
                { status: 500 }
            );
        }

        // Get all assignments for the events
        const visitorIds = [...new Set(events.map(e => e.visitorId))];
        const { data: assignments } = await supabase
            .from('experiment_assignments')
            .select('id, variant_id, experiment_id, visitor_id')
            .in('visitor_id', visitorIds);

        if (!assignments) {
            return NextResponse.json(
                { error: 'No assignments found' },
                { status: 404 }
            );
        }

        // Map events to include variant information
        const eventsToInsert = events.map(event => {
            const assignment = assignments.find(
                a => a.experiment_id === event.experimentId && a.visitor_id === event.visitorId
            );

            if (!assignment) return null;

            return {
                experiment_id: event.experimentId,
                variant_id: assignment.variant_id,
                assignment_id: assignment.id,
                visitor_id: event.visitorId,
                event_type: event.eventType,
                event_name: event.eventName,
                event_value: event.eventValue || null,
                event_properties: event.properties || {},
            };
        }).filter(Boolean);

        // Bulk insert
        const { error: insertError } = await supabase
            .from('experiment_events')
            .insert(eventsToInsert);

        if (insertError) {
            console.error('[Experiments Track] Batch error:', insertError);
            return NextResponse.json(
                { error: 'Failed to record some events' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            recorded: eventsToInsert.length,
        });

    } catch (error) {
        console.error('[Experiments Track] Batch error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
