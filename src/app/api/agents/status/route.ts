/**
 * Agent Status API
 *
 * GET /api/agents/status
 *
 * Returns the status of all registered event-driven agents.
 * Use this to verify agents are properly configured.
 */

import { NextResponse } from 'next/server';
import { getAgentStatus, listAgents } from '@/lib/agents/runner';

export const runtime = 'nodejs';

/**
 * Get agent status
 */
export async function GET() {
  try {
    const status = getAgentStatus();

    return NextResponse.json({
      ...status,
      phase: 'Phase 2: Event-Driven Agents',
      activeAgents: [
        {
          name: 'Sentiment Analysis Agent',
          event: 'feedback.created',
          description: 'Automatically analyzes sentiment of new feedback',
        },
        {
          name: 'Proactive Spec Writer Agent',
          event: 'theme.threshold_reached',
          description: 'Auto-drafts specs for themes with 20+ feedback items',
        },
      ],
      upcomingAgents: [
        {
          name: 'Theme Detection Agent',
          event: 'sentiment.analyzed',
          phase: 'Phase 3',
        },
        {
          name: 'Notification Agent',
          event: 'spec.auto_drafted',
          phase: 'Phase 3',
        },
        {
          name: 'Competitive Intelligence Agent',
          event: 'feedback.created',
          phase: 'Phase 3',
        },
      ],
    });
  } catch (error) {
    console.error('❌ Error getting agent status:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
