import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    // Optional auth check (if session present)
    let userId: string | undefined;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id;
    } catch {
      userId = undefined;
    }

    // Ensure project exists and, if user is present, they own it
    const { data: project } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    if (userId && project.owner_id && project.owner_id !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { data: connections, error } = await supabase
      .from('jira_connections')
      .select('id, site_name, site_url, default_project_key, status, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, connections: connections || [] });
  } catch (error) {
    console.error('[Jira Connections] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load Jira connections' },
      { status: 500 }
    );
  }
}
