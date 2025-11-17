/**
 * Slack OAuth 2.0 Callback Handler
 *
 * Handles the OAuth redirect from Slack after user authorizes the app.
 * Exchanges authorization code for access token and stores encrypted connection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, storeConnection } from '@/lib/slack/oauth';
import { createServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/integrations/slack/callback
 *
 * Query params:
 * - code: Authorization code from Slack
 * - state: CSRF protection token + project ID (base64 encoded JSON)
 * - error: Error from Slack if user denied
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // Handle user denial
  if (error) {
    console.error('Slack OAuth error:', error);
    return NextResponse.redirect(
      `${appBaseUrl}/settings?slack_error=${encodeURIComponent(error)}`
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      `${appBaseUrl}/settings?slack_error=missing_parameters`
    );
  }

  try {
    const supabase = await createServerClient();

    // Get the authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        `${appBaseUrl}/login?error=unauthorized&redirect=/settings`
      );
    }

    // Decode state to get project ID and validate CSRF token
    let projectId: string | null = null;
    let stateToken: string;

    try {
      const decoded = Buffer.from(state, 'base64').toString('utf-8');

      // Try to parse as JSON (new format with project ID)
      try {
        const parsed = JSON.parse(decoded);
        stateToken = parsed.token;
        projectId = parsed.projectId || null;
      } catch {
        // Plain state token (old format)
        stateToken = decoded;
      }
    } catch {
      return NextResponse.redirect(
        `${appBaseUrl}/settings?slack_error=invalid_state`
      );
    }

    // Validate state token exists in database
    const { data: stateRecord } = await supabase
      .from('slack_integration_states')
      .select('*')
      .eq('state', stateToken)
      .single();

    if (!stateRecord) {
      return NextResponse.redirect(
        `${appBaseUrl}/settings?slack_error=invalid_state`
      );
    }

    // Use project ID from state record if not in state param
    projectId = projectId || stateRecord.project_id;

    if (!projectId) {
      return NextResponse.redirect(
        `${appBaseUrl}/settings?slack_error=missing_project`
      );
    }

    // Verify user has access to project
    const { data: projectMember } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!projectMember) {
      return NextResponse.redirect(
        `${appBaseUrl}/settings?slack_error=unauthorized_project`
      );
    }

    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code);

    // Store connection with encrypted token
    await storeConnection(user.id, projectId, tokenData);

    // Delete used state token
    await supabase
      .from('slack_integration_states')
      .delete()
      .eq('state', stateToken);

    // Get project slug for redirect
    const { data: project } = await supabase
      .from('projects')
      .select('slug')
      .eq('id', projectId)
      .single();

    const redirectPath = stateRecord.redirect_to ||
      (project?.slug
        ? `/${project.slug}/settings?tab=integrations`
        : '/settings?tab=integrations');

    const successUrl = `${appBaseUrl}${redirectPath}&slack=connected&team=${encodeURIComponent(tokenData.team_name)}`;

    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error('Slack OAuth callback error:', err);

    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    return NextResponse.redirect(
      `${appBaseUrl}/settings?slack_error=${encodeURIComponent(errorMessage)}`
    );
  }
}
