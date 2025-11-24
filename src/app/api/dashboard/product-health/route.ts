/**
 * Product Health Score API
 * Returns the calculated health score for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/ai/mission-control';
import { createServerClient } from '@/lib/auth/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Get project_id from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing project_id parameter' },
        { status: 400 }
      );
    }

    // Verify user has access to this project
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify project ownership/membership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Get metrics with health score
    const metrics = await getDashboardMetrics(projectId);

    if (!metrics.health_score) {
      return NextResponse.json(
        { error: 'Health score could not be calculated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      project_id: projectId,
      project_name: project.name,
      health_score: metrics.health_score,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching product health score:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate product health score',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
