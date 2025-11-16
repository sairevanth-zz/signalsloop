/**
 * Feature Gaps API
 * GET: List feature gaps
 * PUT: Update feature gap status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateFeatureGapStatus, getFeatureGapDetails } from '@/lib/competitive-intelligence';

export const runtime = 'nodejs';

/**
 * GET /api/competitive/feature-gaps?projectId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const gapId = searchParams.get('gapId'); // Optional: get specific gap details

    if (!projectId && !gapId) {
      return NextResponse.json({ success: false, error: 'projectId or gapId is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // If gapId provided, get detailed gap info
    if (gapId) {
      const details = await getFeatureGapDetails(gapId);
      return NextResponse.json({
        success: true,
        ...details,
      });
    }

    // Otherwise, list all gaps for project
    const { data: gaps, error } = await supabase
      .from('feature_gaps_with_competitors')
      .select('*')
      .eq('project_id', projectId)
      .order('urgency_score', { ascending: false });

    if (error) {
      console.error('[Feature Gaps API] Error fetching gaps:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      featureGaps: gaps || [],
      total: gaps?.length || 0,
    });
  } catch (error) {
    console.error('[Feature Gaps API] GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch feature gaps',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/competitive/feature-gaps
 * Update feature gap status
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { gapId, status, assignedTo } = body;

    if (!gapId || !status) {
      return NextResponse.json({ success: false, error: 'gapId and status are required' }, { status: 400 });
    }

    const result = await updateFeatureGapStatus(gapId, status, assignedTo);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Feature gap updated successfully',
    });
  } catch (error) {
    console.error('[Feature Gaps API] PUT Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update feature gap',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
