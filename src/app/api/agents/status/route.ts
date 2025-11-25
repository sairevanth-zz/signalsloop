/**
 * Agent Status & Monitoring API
 *
 * GET /api/agents/status?project_id={uuid}
 *
 * Returns comprehensive status of the agent system:
 * - Configured agents and their event handlers
 * - Recent event processing statistics
 * - Pending/failed events count
 * - Last processing run timestamp
 * - Agent health indicators
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { AGENT_REGISTRY } from '@/lib/agents/registry';

type AgentCatalogEntry = {
  name: string;
  description: string;
  phase: string;
};

const AGENT_CATALOG: Record<string, AgentCatalogEntry> = {
  'feedback.created': {
    name: 'Feedback Triager',
    description: 'Auto-categorizes, prioritizes, deduplicates, and routes new feedback',
    phase: 'Phase 1',
  },
  'feedback.updated': {
    name: 'Feedback Update Monitor',
    description: 'Listens for feedback updates to keep signals fresh',
    phase: 'Phase 3',
  },
  'feedback.voted': {
    name: 'Vote Tracker',
    description: 'React to vote spikes and update demand signals',
    phase: 'Phase 3',
  },
  'sentiment.analyzed': {
    name: 'Urgent Feedback Agent',
    description: 'Flags urgent items from sentiment drops',
    phase: 'Phase 3',
  },
  'theme.detected': {
    name: 'Theme Detection Agent',
    description: 'Clusters feedback into themes',
    phase: 'Phase 3',
  },
  'theme.threshold_reached': {
    name: 'Spec Writer Agent',
    description: 'Auto-drafts specs when a theme crosses demand threshold',
    phase: 'Phase 2',
  },
  'spec.auto_drafted': {
    name: 'Spec Quality Agent',
    description: 'Reviews auto-drafted specs for quality gates',
    phase: 'Phase 3',
  },
  'spec.approved': {
    name: 'Spec Approval Agent',
    description: 'Keeps roadmap in sync when specs are approved',
    phase: 'Phase 3',
  },
  'competitor.mentioned': {
    name: 'Competitive Intel Agent',
    description: 'Tracks competitor mentions and signals',
    phase: 'Phase 3',
  },
  'feature.launched': {
    name: 'Release Planning Agent',
    description: 'Auto-drafts release notes from completed features',
    phase: 'Phase 3',
  },
  'feature.metrics_collected': {
    name: 'Impact Tracking Agent',
    description: 'Collects and correlates post-launch metrics',
    phase: 'Phase 3',
  },
  'feature.retrospective_recorded': {
    name: 'Retrospective Agent',
    description: 'Captures learnings and feeds back into roadmap',
    phase: 'Phase 3',
  },
  'user.engaged': {
    name: 'User Engagement Agent',
    description: 'Re-engages users after key interactions',
    phase: 'Phase 3',
  },
  'user.at_risk': {
    name: 'Churn Risk Agent',
    description: 'Surfaces outreach prompts for at-risk users',
    phase: 'Phase 3',
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Get agent registry info
    const agentConfig = Object.entries(AGENT_REGISTRY).map(([eventType, handlers]) => ({
      eventType,
      handlerCount: handlers.length,
      enabled: handlers.length > 0,
    }));

    // Get event processing statistics
    const whereClause = projectId
      ? `metadata->>'project_id'.eq.${projectId}`
      : 'id.not.is.null';

    // Pending events
    const { data: pendingEvents } = await supabase
      .from('events')
      .select('id, type, created_at')
      .eq('processed', false)
      .lt('retry_count', 3)
      .order('created_at', { ascending: false })
      .limit(10);

    // Failed events (max retries reached)
    const { data: failedEvents } = await supabase
      .from('events')
      .select('id, type, created_at, processing_error')
      .eq('processed', false)
      .gte('retry_count', 3)
      .order('created_at', { ascending: false })
      .limit(10);

    // Recently processed events
    const { data: recentEvents } = await supabase
      .from('events')
      .select('id, type, created_at, processed_at')
      .eq('processed', true)
      .order('processed_at', { ascending: false })
      .limit(10);

    // Processing metrics (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: processedLast24h } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('processed', true)
      .gte('processed_at', yesterday);

    const { count: createdLast24h } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterday);

    // System health indicators
    const pendingCount = pendingEvents?.length || 0;
    const failedCount = failedEvents?.length || 0;
    const processingRate = createdLast24h ? (processedLast24h || 0) / (createdLast24h || 1) : 1;

    let systemHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const healthIssues: string[] = [];

    if (pendingCount > 50) {
      systemHealth = 'degraded';
      healthIssues.push(`${pendingCount} events pending (backlog building up)`);
    }

    if (failedCount > 10) {
      systemHealth = 'unhealthy';
      healthIssues.push(`${failedCount} events failed after max retries`);
    }

    if (processingRate < 0.8) {
      systemHealth = 'degraded';
      healthIssues.push(`Processing rate at ${Math.round(processingRate * 100)}% (should be >80%)`);
    }

    // Get last processing run
    const lastProcessedEvent = recentEvents?.[0];
    const lastProcessingRun = lastProcessedEvent?.processed_at || null;

    const activeAgents = Object.keys(AGENT_REGISTRY).map(eventType => {
      const catalog = AGENT_CATALOG[eventType];
      return {
        name: catalog?.name || 'Autonomous agent',
        event: eventType,
        description: catalog?.description || 'Autonomous agent',
        phase: catalog?.phase || 'Phase 3',
      };
    });

    return NextResponse.json({
      systemHealth,
      healthIssues: healthIssues.length > 0 ? healthIssues : ['All systems operational'],
      schedule: {
        processEvents: 'Twice daily via orchestrator (9 AM and 9 PM UTC)',
        nextRun: getNextScheduledRun(),
        lastRun: lastProcessingRun,
      },
      agents: {
        total: agentConfig.length,
        enabled: agentConfig.filter(a => a.enabled).length,
        registry: agentConfig,
      },
      events: {
        pending: {
          count: pendingCount,
          recent: pendingEvents?.map(e => ({
            id: e.id,
            type: e.type,
            age: getAgeInMinutes(e.created_at),
          })) || [],
        },
        failed: {
          count: failedCount,
          recent: failedEvents?.map(e => ({
            id: e.id,
            type: e.type,
            error: e.processing_error,
            age: getAgeInMinutes(e.created_at),
          })) || [],
        },
        processed: {
          last24h: processedLast24h || 0,
          recent: recentEvents?.slice(0, 5).map(e => ({
            id: e.id,
            type: e.type,
            processedAt: e.processed_at,
          })) || [],
        },
        created: {
          last24h: createdLast24h || 0,
        },
      },
      metrics: {
        processingRate: Math.round(processingRate * 100),
      },
      activeAgents,
      futureAgents: [],
      running: true,
      phase: 'Phase 3',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Agent Status] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch agent status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function getNextScheduledRun(): string {
  const now = new Date();
  const currentHour = now.getUTCHours();
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);

  if (currentHour < 9) {
    // Next run is today at 9 AM
    next.setUTCHours(9);
  } else if (currentHour < 21) {
    // Next run is today at 9 PM
    next.setUTCHours(21);
  } else {
    // Next run is tomorrow at 9 AM
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(9);
  }

  return next.toISOString();
}

function getAgeInMinutes(timestamp: string): string {
  const created = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins}m`;
  } else if (diffMins < 1440) {
    return `${Math.floor(diffMins / 60)}h`;
  } else {
    return `${Math.floor(diffMins / 1440)}d`;
  }
}
