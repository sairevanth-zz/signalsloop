/**
 * Slack Statistics API
 *
 * Returns message statistics for a Slack connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { getMessageStats } from '@/lib/slack/client';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/integrations/slack/stats?connection_id=xxx
 *
 * Returns statistics about Slack messages
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connection_id');

    if (!connectionId) {
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
      .eq('id', connectionId)
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

    if (!projectMember) {
      return NextResponse.json(
        { error: 'Access denied to project' },
        { status: 403 }
      );
    }

    // Get statistics
    const stats = await getMessageStats(connectionId);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching Slack stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
