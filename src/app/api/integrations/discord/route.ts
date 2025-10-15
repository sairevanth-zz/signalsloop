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

async function getProjectForUser(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
  projectId: string,
  userId: string
) {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, owner_id, slug, name, plan')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return { error: 'Project not found', status: 404 } as const;
  }

  if (project.owner_id !== userId) {
    return { error: 'Forbidden', status: 403 } as const;
  }

  return { project } as const;
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
  const projectResult = await getProjectForUser(supabase, projectId, user.id);
  if ('error' in projectResult) {
    return NextResponse.json({ error: projectResult.error }, { status: projectResult.status });
  }

  try {
    const { data: integration, error: integrationError } = await supabase
      .from('discord_integrations')
      .select(
        'guild_name, guild_id, channel_name, channel_id, webhook_url, created_at, updated_at, scope'
      )
      .eq('project_id', projectId)
      .maybeSingle();

    if (integrationError) {
      console.error('Discord integration fetch error:', integrationError);
      return NextResponse.json({ error: 'Failed to load integration' }, { status: 500 });
    }

    const isInvalid = integration?.scope === 'invalid';

    return NextResponse.json({
      connected: !!integration && !isInvalid,
      integrationStatus: integration
        ? (isInvalid ? 'invalid' : 'active')
        : 'disconnected',
      integration: integration
        ? {
            guildName: integration.guild_name,
            guildId: integration.guild_id,
            channelName: integration.channel_name,
            channelId: integration.channel_id,
            webhookUrl: integration.webhook_url,
            connectedAt: integration.created_at,
            updatedAt: integration.updated_at,
            scope: integration.scope,
          }
        : null,
    });
  } catch (error) {
    console.error('Discord integration GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectId = body?.projectId as string | undefined;
    const webhookUrl = body?.webhookUrl as string | undefined;
    const channelName = (body?.channelName as string | undefined)?.trim() || null;

    if (!projectId || !webhookUrl) {
      return NextResponse.json(
        { error: 'projectId and webhookUrl are required' },
        { status: 400 }
      );
    }

    const authResult = await authenticate(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { supabase, user } = authResult;

    const projectResult = await getProjectForUser(supabase, projectId, user.id);
    if ('error' in projectResult) {
      return NextResponse.json({ error: projectResult.error }, { status: projectResult.status });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(webhookUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 });
    }

    const allowedHosts = new Set([
      'discord.com',
      'www.discord.com',
      'ptb.discord.com',
      'canary.discord.com',
      'discordapp.com',
      'www.discordapp.com',
    ]);

    if (!allowedHosts.has(parsedUrl.host)) {
      return NextResponse.json({ error: 'Webhook URL must point to discord.com' }, { status: 400 });
    }

    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathSegments.length < 4 || pathSegments[0] !== 'api' || pathSegments[1] !== 'webhooks') {
      return NextResponse.json({ error: 'Webhook URL format is invalid' }, { status: 400 });
    }

    const webhookId = pathSegments[2];
    const webhookToken = pathSegments.slice(3).join('/');

    if (!webhookId || !webhookToken) {
      return NextResponse.json({ error: 'Webhook URL format is invalid' }, { status: 400 });
    }

    let webhookMetadata: {
      id?: string;
      type?: number;
      name?: string | null;
      channel_id?: string | null;
      guild_id?: string | null;
      application_id?: string | null;
      token?: string | null;
    } = {};

    try {
      const webhookResponse = await fetch(parsedUrl.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (webhookResponse.ok) {
        webhookMetadata = await webhookResponse.json();
      } else {
        console.warn(
          `Failed to fetch webhook metadata (${webhookResponse.status}) for project ${projectId}`
        );
      }
    } catch (fetchError) {
      console.warn('Error fetching webhook metadata:', fetchError);
    }

    const webhookName =
      typeof webhookMetadata.name === 'string' && webhookMetadata.name.trim().length > 0
        ? webhookMetadata.name.trim()
        : null;

    const resolvedGuildName = webhookMetadata.guild_id
      ? (webhookName ?? null)
      : 'Manual Webhook';

    const resolvedChannelName = channelName ?? webhookName ?? null;

    const integrationRecord = {
      project_id: projectId,
      guild_id: webhookMetadata.guild_id ?? 'manual',
      guild_name: resolvedGuildName,
      channel_id: webhookMetadata.channel_id ?? null,
      channel_name: resolvedChannelName,
      webhook_id: webhookMetadata.id ?? webhookId,
      webhook_token: webhookMetadata.token ?? webhookToken,
      webhook_url: parsedUrl.toString(),
      application_id: webhookMetadata.application_id ?? null,
      access_token: null,
      refresh_token: null,
      expires_at: null,
      scope: 'manual',
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('discord_integrations')
      .upsert(integrationRecord, { onConflict: 'project_id' });

    if (upsertError) {
      console.error('Manual Discord integration upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to save integration' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Discord integration manual connect error:', error);
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
  const projectResult = await getProjectForUser(supabase, projectId, user.id);
  if ('error' in projectResult) {
    return NextResponse.json({ error: projectResult.error }, { status: projectResult.status });
  }

  try {
    await supabase
      .from('discord_integrations')
      .delete()
      .eq('project_id', projectId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Discord integration DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
