import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface AuthorizeRequestBody {
  projectId: string;
  redirectTo?: string;
}

function getDiscordEnv() {
  return {
    clientId: process.env.DISCORD_CLIENT_ID,
    redirectUri: process.env.DISCORD_REDIRECT_URI,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AuthorizeRequestBody = await request.json();
    const { projectId, redirectTo } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const { clientId, redirectUri } = getDiscordEnv();
    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'Discord environment variables are not configured' },
        { status: 500 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: authResult, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authResult?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;

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

    const state = crypto.randomUUID();

    await supabase.from('discord_integration_states').insert({
      state,
      project_id: projectId,
      user_id: user.id,
      redirect_to: redirectTo || null,
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'webhook.incoming',
      state,
      prompt: 'consent',
    });

    const authorizeUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

    return NextResponse.json({ url: authorizeUrl });
  } catch (error) {
    console.error('Discord authorize error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
