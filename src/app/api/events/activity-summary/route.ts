/**
 * Event Activity Summary API
 *
 * GET /api/events/activity-summary?project_id=xxx
 *
 * Returns quick summary of recent event activity for dashboard widget
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

export const runtime = 'nodejs';

/**
 * Get activity summary for dashboard widget
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

    // Get events from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const { data: recentEvents, error: eventsError } = await supabase
      .from('events')
      .select('type, created_at, metadata')
      .eq('metadata->>project_id', projectId)
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch event activity' },
        { status: 500 }
      );
    }

    // Count unique agents that have been active
    const activeAgents = new Set();
    const failedEvents = [];

    (recentEvents || []).forEach((event: any) => {
      if (event.metadata?.source) {
        activeAgents.add(event.metadata.source);
      }
      if (event.metadata?.error || event.metadata?.failed) {
        failedEvents.push(event);
      }
    });

    // Determine health status
    const totalEvents = recentEvents?.length || 0;
    const failureRate = totalEvents > 0 ? (failedEvents.length / totalEvents) * 100 : 0;

    let healthStatus: 'healthy' | 'warning' | 'critical';
    if (failureRate < 5) {
      healthStatus = 'healthy';
    } else if (failureRate < 20) {
      healthStatus = 'warning';
    } else {
      healthStatus = 'critical';
    }

    return NextResponse.json({
      last_hour_events: totalEvents,
      active_agents: activeAgents.size,
      health_status: healthStatus,
      recent_events: (recentEvents || []).slice(0, 5).map((e: any) => ({
        type: e.type,
        created_at: e.created_at,
      })),
      failure_rate: failureRate,
      failed_events_count: failedEvents.length,
    });
  } catch (error) {
    console.error('❌ Error getting event activity summary:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
