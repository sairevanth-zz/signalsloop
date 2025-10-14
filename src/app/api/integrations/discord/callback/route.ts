import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';

function getDiscordEnv() {
  return {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    redirectUri: process.env.DISCORD_REDIRECT_URI,
    appBaseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  };
}

function buildRedirectUrl(baseUrl: string, path: string) {
  const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  if (path.startsWith('/')) {
    return `${trimmedBase}${path}`;
  }

  return `${trimmedBase}/${path}`;
}

export async function GET(request: NextRequest) {
  const { clientId, clientSecret, redirectUri, appBaseUrl } = getDiscordEnv();

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: 'Discord environment variables are not configured' },
      { status: 500 }
    );
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
  }

  const url = new URL(request.url);
  const stateValue = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (!stateValue) {
    const fallbackUrl = buildRedirectUrl(
      appBaseUrl,
      `/app${url.searchParams.has('error') ? '?discord=error' : ''}`
    );
    return NextResponse.redirect(fallbackUrl);
  }

  try {
    const { data: stateRecord } = await supabase
      .from('discord_integration_states')
      .select('*')
      .eq('state', stateValue)
      .single();

    if (!stateRecord) {
      const fallbackUrl = buildRedirectUrl(
        appBaseUrl,
        `/app?discord=error`
      );
      return NextResponse.redirect(fallbackUrl);
    }

    const { project_id: projectId, redirect_to: redirectTo } = stateRecord;

    const { data: project } = await supabase
      .from('projects')
      .select('slug')
      .eq('id', projectId)
      .single();

    const defaultRedirectPath = project?.slug
      ? `/${project.slug}/settings?tab=integrations`
      : '/app';
    const baseRedirectPath = redirectTo || defaultRedirectPath;

    if (error) {
      await supabase
        .from('discord_integration_states')
        .delete()
        .eq('state', stateValue);

      const redirectUrl = buildRedirectUrl(
        appBaseUrl,
        `${baseRedirectPath}${baseRedirectPath.includes('?') ? '&' : '?'}discord=error`
      );

      return NextResponse.redirect(redirectUrl);
    }

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    const form = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const tokenJson = await tokenResponse.json();

    if (!tokenResponse.ok || tokenJson.error || !tokenJson.webhook) {
      console.error('Discord OAuth error:', tokenJson);
      await supabase
        .from('discord_integration_states')
        .delete()
        .eq('state', stateValue);

      const redirectUrl = buildRedirectUrl(
        appBaseUrl,
        `${baseRedirectPath}${baseRedirectPath.includes('?') ? '&' : '?'}discord=error`
      );

      return NextResponse.redirect(redirectUrl);
    }

    const webhook = tokenJson.webhook;
    const webhookUrl =
      webhook.url ||
      `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}`;

    const { error: upsertError } = await supabase
      .from('discord_integrations')
      .upsert(
        {
          project_id: projectId,
          guild_id: webhook.guild_id ?? 'unknown',
          guild_name: webhook.name ?? null,
          channel_id: webhook.channel_id ?? null,
          channel_name: webhook.name ?? null,
          webhook_id: webhook.id,
          webhook_token: webhook.token,
          webhook_url: webhookUrl,
          application_id: webhook.application_id ?? null,
          access_token: tokenJson.access_token ?? null,
          refresh_token: tokenJson.refresh_token ?? null,
          expires_at: tokenJson.expires_in
            ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
            : null,
          scope: tokenJson.scope ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id' }
      );

    if (upsertError) {
      console.error('Discord integration upsert error:', upsertError);
      await supabase
        .from('discord_integration_states')
        .delete()
        .eq('state', stateValue);

      const redirectUrl = buildRedirectUrl(
        appBaseUrl,
        `${baseRedirectPath}${baseRedirectPath.includes('?') ? '&' : '?'}discord=error`
      );

      return NextResponse.redirect(redirectUrl);
    }

    await supabase
      .from('discord_integration_states')
      .delete()
      .eq('state', stateValue);

    const successUrl = buildRedirectUrl(
      appBaseUrl,
      `${baseRedirectPath}${baseRedirectPath.includes('?') ? '&' : '?'}discord=connected`
    );

    return NextResponse.redirect(successUrl);
  } catch (callbackError) {
    console.error('Discord callback error:', callbackError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
