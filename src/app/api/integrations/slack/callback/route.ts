import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

const SLACK_OAUTH_URL = 'https://slack.com/api/oauth.v2.access';

function getSlackEnv() {
  return {
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    redirectUri: process.env.SLACK_REDIRECT_URI,
    appBaseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  };
}

function resolveRedirectUrl(
  appBaseUrl: string,
  target: string | null,
  fallbackPath: string,
  extraParams: Record<string, string>
) {
  const redirectTarget = (target && target.trim().length > 0) ? target : fallbackPath;
  const url = redirectTarget.startsWith('http://') || redirectTarget.startsWith('https://')
    ? new URL(redirectTarget)
    : new URL(redirectTarget.startsWith('/') ? redirectTarget : `/${redirectTarget}`, appBaseUrl);

  Object.entries(extraParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

export async function GET(request: NextRequest) {
  const { clientId, clientSecret, redirectUri, appBaseUrl } = getSlackEnv();

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: 'Slack environment variables are not configured' },
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
    return NextResponse.json({ error: 'Missing state' }, { status: 400 });
  }

  try {
    const { data: stateRecord } = await supabase
      .from('slack_integration_states')
      .select('*')
      .eq('state', stateValue)
      .single();

    if (!stateRecord) {
      return NextResponse.json({ error: 'Invalid or expired state' }, { status: 400 });
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
    const baseRedirectPath = redirectTo || null;

    if (error) {
      await supabase
        .from('slack_integration_states')
        .delete()
        .eq('state', stateValue);

      const redirectUrl = resolveRedirectUrl(appBaseUrl, baseRedirectPath, defaultRedirectPath, {
        slack: 'error',
      });

      return NextResponse.redirect(redirectUrl);
    }

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    const form = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(SLACK_OAUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const tokenJson = await tokenResponse.json();

    if (!tokenJson.ok) {
      console.error('Slack OAuth error:', tokenJson);

      const redirectUrl = resolveRedirectUrl(appBaseUrl, baseRedirectPath, defaultRedirectPath, {
        slack: 'error',
      });

      await supabase
        .from('slack_integration_states')
        .delete()
        .eq('state', stateValue);

      return NextResponse.redirect(redirectUrl);
    }

    if (!tokenJson.incoming_webhook?.url) {
      console.error('Slack OAuth missing incoming_webhook information');

      const redirectUrl = resolveRedirectUrl(appBaseUrl, baseRedirectPath, defaultRedirectPath, {
        slack: 'error',
      });

      await supabase
        .from('slack_integration_states')
        .delete()
        .eq('state', stateValue);

      return NextResponse.redirect(redirectUrl);
    }

    await supabase.from('slack_integrations').upsert(
      {
        project_id: projectId,
        team_id: tokenJson.team?.id,
        team_name: tokenJson.team?.name,
        access_token: tokenJson.access_token,
        bot_user_id: tokenJson.bot_user_id ?? null,
        authed_user_id: tokenJson.authed_user?.id ?? null,
        scope: tokenJson.scope ?? null,
        webhook_url: tokenJson.incoming_webhook.url,
        channel_id: tokenJson.incoming_webhook.channel_id ?? null,
        channel_name: tokenJson.incoming_webhook.channel ?? null,
        configuration_url: tokenJson.incoming_webhook.configuration_url ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id' }
    );

    await supabase
      .from('slack_integration_states')
      .delete()
      .eq('state', stateValue);

    const successUrl = resolveRedirectUrl(appBaseUrl, baseRedirectPath, defaultRedirectPath, {
      slack: 'connected',
    });

    return NextResponse.redirect(successUrl);
  } catch (callbackError) {
    console.error('Slack callback error:', callbackError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
