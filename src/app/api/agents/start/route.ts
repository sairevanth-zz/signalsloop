/**
 * Start Event-Driven Agents API
 *
 * GET /api/agents/start
 *
 * Starts all event-driven agents in the background.
 * Agents will listen for events and react in real-time.
 *
 * ⚠️  This is a long-running endpoint - it will keep the connection open.
 * In production, agents should run in a separate service (Edge Function, Docker, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { startAllAgents } from '@/lib/agents/runner';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

/**
 * Start all agents
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const validToken = process.env.CRON_SECRET || process.env.AGENT_START_TOKEN;

    if (!validToken || authHeader !== `Bearer ${validToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🚀 API: Starting all agents...');

    // Start all agents
    const stopAgents = await startAllAgents();

    // Keep connection alive for a while (for testing)
    // In production, agents should run in a separate process
    await new Promise(resolve => setTimeout(resolve, 60000)); // Run for 1 minute

    // Stop agents before returning
    await stopAgents();

    return NextResponse.json({
      success: true,
      message: 'Agents ran successfully for 1 minute (test mode)',
      note: 'In production, agents should run continuously in a separate service',
    });
  } catch (error) {
    console.error('❌ Error starting agents:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
