import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { error: 'Unauthorized', status: 401 } as const;
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return { error: 'Database connection not available', status: 500 } as const;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: authResult, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authResult?.user) {
    return { error: 'Unauthorized', status: 401 } as const;
  }

  return { supabase, user: authResult.user } as const;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const authResult = await authenticate(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { supabase, user } = authResult;

  try {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id, slug, name, plan')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: integration } = await supabase
      .from('slack_connections')
      .select(
        'team_name, team_id, status, bot_user_id, scope, created_at, updated_at'
      )
      .eq('project_id', projectId)
      .eq('status', 'active')
      .maybeSingle();

    return NextResponse.json({
      connected: !!integration,
      integration: integration
        ? {
          teamName: integration.team_name,
          teamId: integration.team_id,
          status: integration.status,
          connectedAt: integration.created_at,
          updatedAt: integration.updated_at,
        }
        : null,
    });
  } catch (error) {
    console.error('Slack integration GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const authResult = await authenticate(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { supabase, user } = authResult;

  try {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await supabase
      .from('slack_connections')
      .update({ status: 'disconnected' })
      .eq('project_id', projectId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Slack integration DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
