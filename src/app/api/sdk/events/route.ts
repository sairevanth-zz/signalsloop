/**
 * SDK Events Endpoint
 * 
 * Ingests tracking events from the SignalsLoop JavaScript SDK.
 * Events include page views, clicks, and goal conversions.
 * 
 * POST /api/sdk/events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

interface TrackingEvent {
    experimentId: string;
    variantKey: string;
    visitorId: string;
    eventType: 'pageview' | 'click' | 'conversion' | 'goal' | 'custom';
    eventName: string;
    eventValue?: number;
    goalId?: string;
    metadata?: Record<string, unknown>;
    pageUrl?: string;
    timestamp?: number;
}

interface BatchEventsRequest {
    events: TrackingEvent[];
    projectId: string;
    visitorId: string;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(request: NextRequest) {
    try {
        const body: BatchEventsRequest = await request.json();
        const { events, projectId, visitorId } = body;

        if (!events || !Array.isArray(events) || events.length === 0) {
            return NextResponse.json(
                { error: 'events array is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database unavailable' },
                { status: 500, headers: corsHeaders }
            );
        }

        // Get variant IDs for the events
        const experimentIds = [...new Set(events.map(e => e.experimentId))];
        const { data: variants } = await supabase
            .from('experiment_variants')
            .select('id, experiment_id, variant_key')
            .in('experiment_id', experimentIds);

        const variantMap = new Map<string, string>();
        for (const v of variants || []) {
            variantMap.set(`${v.experiment_id}:${v.variant_key}`, v.id);
        }

        // Prepare events for insertion
        const eventRecords = events.map(event => {
            const variantId = variantMap.get(`${event.experimentId}:${event.variantKey}`);

            return {
                experiment_id: event.experimentId,
                variant_id: variantId || null,
                visitor_id: event.visitorId || visitorId,
                event_type: event.eventType,
                event_name: event.eventName,
                event_value: event.eventValue,
                event_properties: {
                    goal_id: event.goalId,
                    page_url: event.pageUrl,
                    ...(event.metadata || {}),
                },
                created_at: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
            };
        }).filter(e => e.variant_id); // Only insert events with valid variant IDs

        if (eventRecords.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No valid events to track',
                tracked: 0,
            }, { headers: corsHeaders });
        }

        // Batch insert events
        const { data, error } = await supabase
            .from('experiment_events')
            .insert(eventRecords)
            .select('id');

        if (error) {
            console.error('[SDK/Events] Error inserting events:', error);
            return NextResponse.json(
                { error: 'Failed to track events' },
                { status: 500, headers: corsHeaders }
            );
        }

        console.log(`[SDK/Events] Tracked ${data?.length || 0} events for project ${projectId}`);

        return NextResponse.json({
            success: true,
            tracked: data?.length || 0,
            timestamp: Date.now(),
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('[SDK/Events] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    });
}
