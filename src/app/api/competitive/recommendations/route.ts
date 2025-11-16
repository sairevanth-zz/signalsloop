/**
 * Strategic Recommendations API
 * GET: List recommendations
 * PUT: Update recommendation status
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getStrategicRecommendations,
  updateRecommendationStatus,
  getRecommendationDetails,
  refreshStrategicRecommendations,
} from '@/lib/competitive-intelligence';

export const runtime = 'nodejs';

/**
 * GET /api/competitive/recommendations?projectId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const recommendationId = searchParams.get('recommendationId');
    const status = searchParams.get('status');
    const refresh = searchParams.get('refresh') === 'true'; // Trigger refresh

    if (!projectId && !recommendationId) {
      return NextResponse.json(
        { success: false, error: 'projectId or recommendationId is required' },
        { status: 400 },
      );
    }

    // Handle refresh request
    if (projectId && refresh) {
      const result = await refreshStrategicRecommendations(projectId);
      return NextResponse.json({
        success: result.success,
        message: 'Recommendations refreshed',
        newRecommendations: result.newRecommendations,
        error: result.error,
      });
    }

    // Get specific recommendation details
    if (recommendationId) {
      const details = await getRecommendationDetails(recommendationId);
      return NextResponse.json({
        success: true,
        ...details,
      });
    }

    // Get recommendations list
    const recommendations = await getStrategicRecommendations(
      projectId!,
      status as 'pending' | 'accepted' | 'in_progress' | 'completed' | 'dismissed' | undefined,
    );

    return NextResponse.json({
      success: true,
      recommendations,
      total: recommendations.length,
    });
  } catch (error) {
    console.error('[Recommendations API] GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/competitive/recommendations
 * Update recommendation status
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { recommendationId, status, userId, outcomeNotes } = body;

    if (!recommendationId || !status) {
      return NextResponse.json({ success: false, error: 'recommendationId and status are required' }, { status: 400 });
    }

    const result = await updateRecommendationStatus(recommendationId, status, userId, outcomeNotes);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Recommendation updated successfully',
    });
  } catch (error) {
    console.error('[Recommendations API] PUT Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update recommendation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
