import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncJiraVelocity } from '@/lib/integrations/jira/velocity-tracker';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId, boardId, projectId } = body || {};

    if (!connectionId || !boardId) {
      return NextResponse.json(
        { success: false, error: 'connectionId and boardId are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the Jira connection belongs to the user
    const { data: connection } = await supabase
      .from('jira_connections')
      .select('id, project_id, user_id')
      .eq('id', connectionId)
      .single();

    if (!connection || connection.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Connection not found' }, { status: 404 });
    }

    const result = await syncJiraVelocity({
      connectionId,
      boardId: String(boardId),
      projectId: projectId || connection.project_id,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Jira Velocity Sync] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync Jira velocity' },
      { status: 500 }
    );
  }
}
