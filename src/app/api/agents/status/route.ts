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
      phase: 'Phase 3: Autonomous Intelligent Agents',
      activeAgents: [
        // Phase 2 Agents
        {
          name: 'Sentiment Analysis Agent',
          event: 'feedback.created',
          description: 'Automatically analyzes sentiment of new feedback',
          phase: 'Phase 2',
        },
        {
          name: 'Proactive Spec Writer Agent',
          event: 'theme.threshold_reached',
          description: 'Auto-drafts specs for themes with 20+ feedback items',
          phase: 'Phase 2',
        },
        // Phase 3 Agents
        {
          name: 'Smart Notification Agent',
          event: 'spec.auto_drafted, theme.threshold_reached, feedback.voted',
          description: 'Sends intelligent alerts to PM/team via Slack',
          phase: 'Phase 3',
        },
        {
          name: 'Urgent Feedback Agent',
          event: 'sentiment.analyzed',
          description: 'Alerts on very negative feedback (<-0.7 score)',
          phase: 'Phase 3',
        },
        {
          name: 'Competitive Intelligence Agent',
          event: 'feedback.created',
          description: 'Extracts competitor mentions and tracks threats',
          phase: 'Phase 3',
        },
        {
          name: 'User Engagement Agent',
          event: 'feedback.created, feedback.voted',
          description: 'Identifies power users and at-risk accounts',
          phase: 'Phase 3',
        },
        {
          name: 'Spec Quality Agent',
          event: 'spec.auto_drafted',
          description: 'Reviews auto-drafted specs for quality and completeness',
          phase: 'Phase 3',
        },
      ],
      futureAgents: [
        {
          name: 'Theme Detection Agent',
          event: 'sentiment.analyzed',
          description: 'Categorizes feedback into themes automatically',
          phase: 'Future',
        },
        {
          name: 'Roadmap Health Agent',
          event: 'spec.approved',
          description: 'Automatically updates roadmap status',
          phase: 'Future',
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
