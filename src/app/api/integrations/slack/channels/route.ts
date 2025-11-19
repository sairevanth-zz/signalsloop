/**
 * Slack Channels API
 *
 * Provides endpoints for listing and managing Slack channel mappings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { listChannels, sendTestMessage } from '@/lib/slack/client';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/integrations/slack/channels?project_id=xxx
 *
 * Lists all Slack channels accessible to the bot
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
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
      .from('members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!projectMember) {
      return NextResponse.json(
        { error: 'Access denied to project' },
        { status: 403 }
      );
    }

    // Get active Slack connection for project
    const { data: connection } = await supabase
      .from('slack_connections')
      .select('id, team_name, status')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: 'No active Slack connection found' },
        { status: 404 }
      );
    }

    // List channels using Slack API
    const channels = await listChannels(connection.id, true);

    return NextResponse.json({
      channels,
      connection: {
        id: connection.id,
        team_name: connection.team_name,
      },
    });
  } catch (error) {
    console.error('Error listing Slack channels:', error);
    return NextResponse.json(
      { error: 'Failed to list channels' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/slack/channels/mappings
 *
 * Creates or updates channel mappings for alert types
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connection_id, alert_type, channel_id, channel_name, mention_users } = body;

    if (!connection_id || !alert_type || !channel_id || !channel_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
      .from('members')
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

    // Upsert channel mapping
    const { data, error } = await supabase
      .from('slack_channel_mappings')
      .upsert(
        {
          slack_connection_id: connection_id,
          alert_type,
          channel_id,
          channel_name,
          mention_users: mention_users || [],
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'slack_connection_id,alert_type',
        }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ mapping: data });
  } catch (error) {
    console.error('Error saving channel mapping:', error);
    return NextResponse.json(
      { error: 'Failed to save channel mapping' },
      { status: 500 }
    );
  }
}
