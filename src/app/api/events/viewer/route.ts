/**
 * Event Viewer API
 *
 * GET /api/events/viewer?project_id=xxx&event_type=xxx&time_range=24h
 *
 * Returns events with filtering and pagination support
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

export const runtime = 'nodejs';

/**
 * Get events with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const eventType = searchParams.get('event_type');
    const aggregateType = searchParams.get('aggregate_type');
    const timeRange = searchParams.get('time_range') || '24h';
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Calculate time range
    const now = new Date();
    let startTime: Date;

    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Build query
    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })
      .eq('metadata->>project_id', projectId)
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (eventType && eventType !== 'all') {
      query = query.eq('type', eventType);
    }

    if (aggregateType && aggregateType !== 'all') {
      query = query.eq('aggregate_type', aggregateType);
    }

    // Execute query
    const { data: events, error: eventsError, count } = await query;

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    // Client-side search filter (for payload/metadata search)
    let filteredEvents = events || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredEvents = filteredEvents.filter(event => {
        return (
          event.type.toLowerCase().includes(searchLower) ||
          event.aggregate_type.toLowerCase().includes(searchLower) ||
          JSON.stringify(event.payload).toLowerCase().includes(searchLower) ||
          JSON.stringify(event.metadata).toLowerCase().includes(searchLower)
        );
      });
    }

    // Calculate stats
    const eventTypes = new Set(filteredEvents.map(e => e.type));
    const aggregateTypes = new Set(filteredEvents.map(e => e.aggregate_type));
    const failedEvents = filteredEvents.filter(e => e.metadata?.error || e.metadata?.failed);

    return NextResponse.json({
      success: true,
      events: filteredEvents,
      stats: {
        total: filteredEvents.length,
        totalInRange: count || 0,
        eventTypes: eventTypes.size,
        aggregateTypes: aggregateTypes.size,
        failed: failedEvents.length,
        timeRange,
      },
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('❌ Error in event viewer:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
