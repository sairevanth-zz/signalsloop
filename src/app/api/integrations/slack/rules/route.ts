/**
 * Slack Alert Rules API
 *
 * Manages alert rule configurations for projects
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { getAllAlertRules, updateAlertRule, toggleAlertRule } from '@/lib/slack/alert-engine';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/integrations/slack/rules?project_id=xxx
 *
 * Gets all alert rules for a project
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');

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

    // Get all rules
    const rules = await getAllAlertRules(projectId);

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Error fetching alert rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert rules' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/integrations/slack/rules
 *
 * Updates an alert rule configuration
 * Body: { project_id, rule_type, config, enabled }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, rule_type, config, enabled } = body;

    if (!project_id || !rule_type) {
      return NextResponse.json(
        { error: 'project_id and rule_type are required' },
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

    // Verify user has admin access to project
    const { data: projectMember } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single();

    if (!projectMember || !['owner', 'admin'].includes(projectMember.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Update rule
    const updatedRule = await updateAlertRule(
      project_id,
      rule_type,
      config,
      enabled
    );

    return NextResponse.json({ rule: updatedRule });
  } catch (error) {
    console.error('Error updating alert rule:', error);
    return NextResponse.json(
      { error: 'Failed to update alert rule' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/slack/rules/toggle
 *
 * Toggles an alert rule on/off
 * Body: { project_id, rule_type, enabled }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, rule_type, enabled } = body;

    if (!project_id || !rule_type || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'project_id, rule_type, and enabled are required' },
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

    // Verify user has admin access to project
    const { data: projectMember } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single();

    if (!projectMember || !['owner', 'admin'].includes(projectMember.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Toggle rule
    await toggleAlertRule(project_id, rule_type, enabled);

    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    console.error('Error toggling alert rule:', error);
    return NextResponse.json(
      { error: 'Failed to toggle alert rule' },
      { status: 500 }
    );
  }
}
