/**
 * Slack OAuth Authorization Initiator (Enhanced)
 *
 * Creates a state token and redirects to Slack OAuth authorization page
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { getAuthorizationUrl, generateStateToken } from '@/lib/slack/oauth';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface AuthorizeRequestBody {
  project_id?: string;
  projectId?: string; // Support both formats
  redirectTo?: string;
  redirect_to?: string; // Support both formats
  state?: string;
}

/**
 * POST /api/integrations/slack/authorize
 *
 * Body: { project_id, redirect_to? }
 * Returns: { auth_url }
 */
export async function POST(request: NextRequest) {
  try {
    const body: AuthorizeRequestBody = await request.json();
    const projectId = body.project_id || body.projectId;
    const redirectTo = body.redirect_to || body.redirectTo;

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to project
    const { data: projectMember } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!projectMember) {
      return NextResponse.json(
        { error: 'Access denied to project' },
        { status: 403 }
      );
    }

    // Generate state token for CSRF protection
    const stateToken = body.state || generateStateToken();

    // Store state in database
    await supabase.from('slack_integration_states').insert({
      state: stateToken,
      project_id: projectId,
      user_id: user.id,
      redirect_to: redirectTo || null,
    });

    // Generate authorization URL with enhanced scopes
    const authUrl = getAuthorizationUrl(stateToken, projectId);

    // Support both response formats
    return NextResponse.json({
      auth_url: authUrl,
      url: authUrl // For backward compatibility
    });
  } catch (error) {
    console.error('Error initiating Slack OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}
