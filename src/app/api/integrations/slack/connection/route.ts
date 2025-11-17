/**
 * Slack Connection Status API
 *
 * Gets connection information and statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { getActiveConnection } from '@/lib/slack/oauth';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/integrations/slack/connection?project_id=xxx
 *
 * Returns connection status and basic info
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
      .from('project_members')
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

    // Get connection
    const connection = await getActiveConnection(projectId);

    if (!connection) {
      return NextResponse.json(
        { connection: null, connected: false },
        { status: 200 }
      );
    }

    // Return connection (without encrypted token)
    return NextResponse.json({
      connection: {
        id: connection.id,
        team_name: connection.team_name,
        team_id: connection.team_id,
        status: connection.status,
        created_at: connection.created_at,
      },
      connected: true,
    });
  } catch (error) {
    console.error('Error fetching connection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connection' },
      { status: 500 }
    );
  }
}
