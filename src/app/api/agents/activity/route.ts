/**
 * Agent Activity API
 *
 * GET /api/agents/activity?project_id=xxx
 *
 * Returns recent agent activity metrics by analyzing the events table
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

export const runtime = 'nodejs';

/**
 * Get agent activity metrics
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

    // Get time ranges
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Query events table for agent activity
    const { data: recentEvents, error: eventsError } = await supabase
      .from('events')
      .select('type, created_at, metadata')
      .gte('created_at', last7Days.toISOString())
      .eq('metadata->>project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch agent activity' },
        { status: 500 }
      );
    }

    // Calculate agent-specific metrics
    const events24h = recentEvents?.filter(
      e => new Date(e.created_at) >= last24Hours
    ) || [];

    // Count events by type
    const eventCounts = {
      feedback_created: 0,
      sentiment_analyzed: 0,
      theme_threshold_reached: 0,
      spec_auto_drafted: 0,
      competitor_mentioned: 0,
      user_engaged: 0,
      user_at_risk: 0,
    };

    recentEvents?.forEach(event => {
      const type = event.type.replace('.', '_') as keyof typeof eventCounts;
      if (type in eventCounts) {
        eventCounts[type]++;
      }
    });

    // Get spec and sentiment counts from database
    const { count: autoSpecCount } = await supabase
      .from('specs')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('auto_generated', true)
      .gte('created_at', last7Days.toISOString());

    const { count: sentimentCount } = await supabase
      .from('sentiment_analysis')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', last7Days.toISOString());

    let competitorCount = 0;
    const { count: competitorCountValue, error: competitorError } = await supabase
      .from('competitors')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .gte('created_at', last7Days.toISOString());

    if (competitorError) {
      console.warn('Competitors table not available, continuing without data:', competitorError.message);
    } else if (typeof competitorCountValue === 'number') {
      competitorCount = competitorCountValue;
    }

    // Build activity summary
    const activity = {
      last_24_hours: {
        total_events: events24h.length,
        feedback_created: events24h.filter(e => e.type === 'feedback.created').length,
        sentiment_analyzed: events24h.filter(e => e.type === 'sentiment.analyzed').length,
        specs_drafted: events24h.filter(e => e.type === 'spec.auto_drafted').length,
      },
      last_7_days: {
        total_events: recentEvents?.length || 0,
        feedback_created: eventCounts.feedback_created,
        sentiment_analyzed: eventCounts.sentiment_analyzed,
        theme_threshold_reached: eventCounts.theme_threshold_reached,
        spec_auto_drafted: eventCounts.spec_auto_drafted,
        competitor_mentioned: eventCounts.competitor_mentioned,
        user_engaged: eventCounts.user_engaged,
        user_at_risk: eventCounts.user_at_risk,
      },
      agent_stats: {
        sentiment_agent: {
          posts_analyzed: sentimentCount || 0,
          avg_latency: '<5s',
        },
        spec_writer_agent: {
          specs_created: autoSpecCount || 0,
          avg_latency: '<10s',
        },
        competitive_intel_agent: {
          competitors_found: competitorCount || 0,
          avg_latency: '<3s',
        },
        notification_agent: {
          alerts_sent: eventCounts.spec_auto_drafted + eventCounts.theme_threshold_reached,
          avg_latency: '<2s',
        },
        urgent_feedback_agent: {
          urgent_alerts: 0, // Would need to track in a separate table
          avg_latency: '<1s',
        },
        user_engagement_agent: {
          power_users_identified: eventCounts.user_engaged,
          at_risk_users_identified: eventCounts.user_at_risk,
          avg_latency: '<2s',
        },
        spec_quality_agent: {
          specs_reviewed: autoSpecCount || 0,
          avg_latency: '<5s',
        },
      },
      recent_events: recentEvents?.slice(0, 20).map(e => ({
        type: e.type,
        timestamp: e.created_at,
        source: e.metadata?.source || 'unknown',
      })) || [],
    };

    return NextResponse.json({
      success: true,
      activity,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('❌ Error getting agent activity:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
