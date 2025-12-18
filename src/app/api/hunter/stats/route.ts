/**
 * Hunter Stats API
 * Get dashboard statistics and health metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/hunter/stats?projectId=xxx
 * Get hunter dashboard statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const { data: project } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get dashboard stats from view
    const { data: dashboardStats } = await supabase
      .from('hunter_dashboard_stats')
      .select('*')
      .eq('project_id', projectId)
      .single();

    // Get platform health stats
    const { data: platformHealth } = await supabase
      .from('platform_health_stats')
      .select('*')
      .eq('project_id', projectId);

    // Get classification distribution
    const { data: classificationDist } = await supabase.rpc(
      'get_classification_distribution',
      { p_project_id: projectId }
    );

    // Get platform distribution
    const { data: platformDist } = await supabase.rpc(
      'get_platform_distribution',
      { p_project_id: projectId }
    );

    // Get recent activity (last 30 days)
    const { data: recentActivity } = await supabase.rpc(
      'get_hunter_activity',
      { p_project_id: projectId, p_days: 30 }
    );

    return NextResponse.json({
      success: true,
      dashboardStats: dashboardStats || {},
      platformHealth: platformHealth || [],
      classificationDist: classificationDist || [],
      platformDist: platformDist || [],
      recentActivity: recentActivity || [],
    });
  } catch (error) {
    console.error('[Hunter Stats] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch hunter statistics',
      },
      { status: 500 }
    );
  }
}
