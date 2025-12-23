import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { JiraAPI } from '@/lib/jira/api';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const projectId = searchParams.get('projectId');

    if (!connectionId || !projectId) {
      return NextResponse.json(
        { success: false, error: 'connectionId and projectId are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    let userId: string | undefined;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id;
    } catch {
      userId = undefined;
    }

    // Verify connection belongs to the user and project
    const { data: connection } = await supabase
      .from('jira_connections')
      .select('id, cloud_id, user_id, project_id')
      .eq('id', connectionId)
      .single();

    if (!connection || connection.project_id !== projectId) {
      return NextResponse.json({ success: false, error: 'Connection not found' }, { status: 404 });
    }

    if (userId && connection.user_id && connection.user_id !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const api = new JiraAPI(connectionId, connection.cloud_id);

    // Fetch up to 100 boards (2 pages)
    const page1 = await api.listBoards({ startAt: 0, maxResults: 50 });
    let boards = page1.values || [];

    if (!page1.isLast) {
      const page2 = await api.listBoards({ startAt: 50, maxResults: 50 });
      boards = boards.concat(page2.values || []);
    }

    return NextResponse.json({ success: true, boards });
  } catch (error) {
    console.error('[Jira Boards] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load Jira boards' },
      { status: 500 }
    );
  }
}
