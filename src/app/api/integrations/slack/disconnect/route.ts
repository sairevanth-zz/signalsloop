/**
 * Slack Disconnect API
 *
 * Disconnects Slack integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { disconnectSlack } from '@/lib/slack/oauth';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/integrations/slack/disconnect
 *
 * Body: { connection_id }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connection_id } = body;

    if (!connection_id) {
      return NextResponse.json(
        { error: 'connection_id is required' },
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

    // Verify user has access to this connection
    const { data: connection } = await supabase
      .from('slack_connections')
      .select('project_id')
      .eq('id', connection_id)
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const { data: projectMember } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', connection.project_id)
      .eq('user_id', user.id)
      .single();

    if (!projectMember || !['owner', 'admin'].includes(projectMember.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Disconnect
    await disconnectSlack(connection_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Slack:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
