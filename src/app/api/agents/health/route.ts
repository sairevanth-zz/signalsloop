/**
 * Agent Health Monitoring API
 *
 * GET /api/agents/health?project_id=xxx&time_range=24h
 *
 * Returns agent execution metrics, success rates, and performance trends
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

export const runtime = 'nodejs';

// Agent names mapping
const AGENT_NAMES = {
  sentiment_agent: 'Sentiment Analysis Agent',
  spec_writer_agent: 'Spec Writer Agent',
  notification_agent: 'Notification Agent',
  urgent_feedback_agent: 'Urgent Feedback Agent',
  competitive_intel_agent: 'Competitive Intelligence Agent',
  user_engagement_agent: 'User Engagement Agent',
  spec_quality_agent: 'Spec Quality Agent',
};

/**
 * Get agent health metrics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const timeRange = searchParams.get('time_range') || '24h';

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Calculate time ranges
    const now = new Date();
    let startTime: Date;
    let previousStartTime: Date; // For trend calculation

    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        previousStartTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousStartTime = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartTime = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartTime = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousStartTime = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    }

    // Get all events in time range
    const { data: currentEvents, error: eventsError } = await supabase
      .from('events')
      .select('type, metadata, created_at')
      .eq('metadata->>project_id', projectId)
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch agent health data' },
        { status: 500 }
      );
    }

    // Get previous period events for trend analysis
    const { data: previousEvents } = await supabase
      .from('events')
      .select('type, metadata, created_at')
      .eq('metadata->>project_id', projectId)
      .gte('created_at', previousStartTime.toISOString())
      .lt('created_at', startTime.toISOString());

    // Group events by agent (via metadata.source)
    const agentMetrics: Record<string, {
      total: number;
      failed: number;
      execution_times: number[];
      last_execution: string;
    }> = {};

    // Process current period
    (currentEvents || []).forEach((event: any) => {
      const source = event.metadata?.source || 'unknown';
      if (!agentMetrics[source]) {
        agentMetrics[source] = {
          total: 0,
          failed: 0,
          execution_times: [],
          last_execution: event.created_at,
        };
      }

      agentMetrics[source].total++;

      if (event.metadata?.error || event.metadata?.failed) {
        agentMetrics[source].failed++;
      }

      // Track execution time if available
      if (event.metadata?.execution_time) {
        agentMetrics[source].execution_times.push(event.metadata.execution_time);
      } else {
        // Estimate based on event type (these are rough estimates)
        const estimatedTimes: Record<string, number> = {
          'feedback.created': 3000,
          'sentiment.analyzed': 1000,
          'spec.auto_drafted': 8000,
          'theme.threshold_reached': 5000,
          'competitor.mentioned': 2000,
        };
        agentMetrics[source].execution_times.push(estimatedTimes[event.type] || 1000);
      }

      // Update last execution time
      if (new Date(event.created_at) > new Date(agentMetrics[source].last_execution)) {
        agentMetrics[source].last_execution = event.created_at;
      }
    });

    // Calculate previous period metrics for trends
    const previousAgentMetrics: Record<string, { total: number; failed: number }> = {};
    (previousEvents || []).forEach((event: any) => {
      const source = event.metadata?.source || 'unknown';
      if (!previousAgentMetrics[source]) {
        previousAgentMetrics[source] = { total: 0, failed: 0 };
      }
      previousAgentMetrics[source].total++;
      if (event.metadata?.error || event.metadata?.failed) {
        previousAgentMetrics[source].failed++;
      }
    });

    // Build agent health data
    const agents = Object.entries(agentMetrics).map(([source, metrics]) => {
      const successfulExecutions = metrics.total - metrics.failed;
      const successRate = metrics.total > 0
        ? (successfulExecutions / metrics.total) * 100
        : 100;

      const avgExecutionTime = metrics.execution_times.length > 0
        ? metrics.execution_times.reduce((sum, time) => sum + time, 0) / metrics.execution_times.length
        : 0;

      // Calculate trends
      const previousMetrics = previousAgentMetrics[source] || { total: 0, failed: 0 };
      const previousErrorRate = previousMetrics.total > 0
        ? (previousMetrics.failed / previousMetrics.total) * 100
        : 0;
      const currentErrorRate = metrics.total > 0
        ? (metrics.failed / metrics.total) * 100
        : 0;

      let errorRateTrend: 'up' | 'down' | 'stable' = 'stable';
      if (currentErrorRate > previousErrorRate + 5) errorRateTrend = 'up';
      else if (currentErrorRate < previousErrorRate - 5) errorRateTrend = 'down';

      // Performance trend (based on execution count)
      let performanceTrend: 'up' | 'down' | 'stable' = 'stable';
      if (metrics.total > previousMetrics.total * 1.2) performanceTrend = 'up';
      else if (metrics.total < previousMetrics.total * 0.8) performanceTrend = 'down';

      return {
        agent_name: AGENT_NAMES[source as keyof typeof AGENT_NAMES] || source,
        total_executions: metrics.total,
        successful_executions: successfulExecutions,
        failed_executions: metrics.failed,
        success_rate: successRate,
        avg_execution_time: avgExecutionTime,
        last_execution: metrics.last_execution,
        error_rate_trend: errorRateTrend,
        performance_trend: performanceTrend,
      };
    });

    // Sort by total executions (most active first)
    agents.sort((a, b) => b.total_executions - a.total_executions);

    return NextResponse.json({
      success: true,
      agents,
      time_range: timeRange,
      period_start: startTime.toISOString(),
      period_end: now.toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in agent health monitoring:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
