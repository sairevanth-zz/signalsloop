/**
 * Slack Test Message API
 *
 * Sends a test message to verify Slack integration is working
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { sendTestMessage } from '@/lib/slack/client';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/integrations/slack/test
 *
 * Body: { project_id, channel_id }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, channel_id } = body;

    if (!project_id || !channel_id) {
      return NextResponse.json(
        { error: 'project_id and channel_id are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to project
    const { data: projectMember } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single();

    if (!projectMember) {
      return NextResponse.json(
        { error: 'Access denied to project' },
        { status: 403 }
      );
    }

    // Get active Slack connection
    const { data: connection } = await supabase
      .from('slack_connections')
      .select('id')
      .eq('project_id', project_id)
      .eq('status', 'active')
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: 'No active Slack connection found' },
        { status: 404 }
      );
    }

    // Send test message
    const success = await sendTestMessage(connection.id, channel_id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send test message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending test message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send test message' },
      { status: 500 }
    );
  }
}
