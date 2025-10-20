import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function OPTIONS() {
  return NextResponse.json({ success: true });
}

async function authenticate(request: NextRequest, projectSlug: string) {
  const cookieStore = cookies();
  const userClient = createRouteHandlerClient({ cookies: () => cookieStore });
  const serviceClient = getSupabaseServiceRoleClient();

  if (!serviceClient) {
    throw new Error('Service role client unavailable');
  }

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return { status: 401 as const, error: 'Unauthorized' };
  }

  const { data: project, error: projectError } = await serviceClient
    .from('projects')
    .select('id, owner_id')
    .eq('slug', projectSlug)
    .single();

  if (projectError || !project) {
    return { status: 404 as const, error: 'Project not found' };
  }

  if (project.owner_id !== user.id) {
    return { status: 403 as const, error: 'Forbidden' };
  }

  return { supabase: serviceClient, userId: user.id, projectId: project.id };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const projectSlug = slug;
    const auth = await authenticate(request, projectSlug);
    if ('status' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, projectId } = auth;

    const { data: recipients, error } = await supabase
      .from('project_notification_recipients')
      .select('id, email, name, receive_weekly_digest, receive_team_alerts, created_at, updated_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to list notification recipients:', error);
      return NextResponse.json({ error: 'Failed to load recipients' }, { status: 500 });
    }

    return NextResponse.json({ recipients: recipients ?? [] });
  } catch (error) {
    console.error('Notification recipients GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const projectSlug = slug;
    const auth = await authenticate(request, projectSlug);
    if ('status' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, userId, projectId } = auth;
    const body = await request.json();
    const email: string | undefined = body?.email;
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const name: string | null =
      typeof body?.name === 'string' && body.name.trim().length > 0
        ? body.name.trim()
        : null;
    const receiveWeeklyDigest = Boolean(body?.receiveWeeklyDigest ?? body?.receive_weekly_digest);
    const receiveTeamAlerts = Boolean(body?.receiveTeamAlerts ?? body?.receive_team_alerts ?? true);

    const { data, error } = await supabase
      .from('project_notification_recipients')
      .upsert(
        {
          project_id: projectId,
          email: normalizedEmail,
          name,
          receive_weekly_digest: receiveWeeklyDigest,
          receive_team_alerts: receiveTeamAlerts,
          created_by: userId,
        },
        { onConflict: 'project_id,email', ignoreDuplicates: false }
      )
      .select('id, email, name, receive_weekly_digest, receive_team_alerts, created_at, updated_at')
      .single();

    if (error) {
      console.error('Failed to upsert notification recipient:', error);
      return NextResponse.json({ error: 'Failed to save recipient' }, { status: 500 });
    }

    return NextResponse.json({ recipient: data }, { status: 201 });
  } catch (error) {
    console.error('Notification recipients POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const projectSlug = slug;
    const auth = await authenticate(request, projectSlug);
    if ('status' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, projectId } = auth;
    const body = await request.json();
    const recipientId: string | undefined = body?.id;
    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient id is required' }, { status: 400 });
    }

    const email: string | undefined = body?.email;
    const normalizedEmail =
      typeof email === 'string' && email.trim().length > 0 ? email.trim().toLowerCase() : undefined;
    const name: string | null =
      typeof body?.name === 'string' && body.name.trim().length > 0
        ? body.name.trim()
        : null;
    const receiveWeeklyDigest =
      body?.receiveWeeklyDigest ?? body?.receive_weekly_digest ?? undefined;
    const receiveTeamAlerts = body?.receiveTeamAlerts ?? body?.receive_team_alerts ?? undefined;

    const updatePayload: Record<string, unknown> = {};
    if (normalizedEmail) updatePayload.email = normalizedEmail;
    if (body?.name !== undefined) updatePayload.name = name;
    if (receiveWeeklyDigest !== undefined) {
      updatePayload.receive_weekly_digest = Boolean(receiveWeeklyDigest);
    }
    if (receiveTeamAlerts !== undefined) {
      updatePayload.receive_team_alerts = Boolean(receiveTeamAlerts);
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('project_notification_recipients')
      .update(updatePayload)
      .eq('id', recipientId)
      .eq('project_id', projectId)
      .select('id, email, name, receive_weekly_digest, receive_team_alerts, created_at, updated_at')
      .single();

    if (error) {
      console.error('Failed to update notification recipient:', error);
      return NextResponse.json({ error: 'Failed to update recipient' }, { status: 500 });
    }

    return NextResponse.json({ recipient: data });
  } catch (error) {
    console.error('Notification recipients PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const projectSlug = slug;
    const auth = await authenticate(request, projectSlug);
    if ('status' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, projectId } = auth;
    const body = await request.json();
    const recipientId: string | undefined = body?.id;
    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('project_notification_recipients')
      .delete()
      .eq('id', recipientId)
      .eq('project_id', projectId);

    if (error) {
      console.error('Failed to delete notification recipient:', error);
      return NextResponse.json({ error: 'Failed to delete recipient' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification recipients DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
