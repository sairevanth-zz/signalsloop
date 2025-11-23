/**
 * API Route: Track Feature Launch
 *
 * Endpoints for tracking feature launches and collecting impact metrics
 *
 * POST /api/roadmap/track-feature-launch - Record a new feature launch
 * POST /api/roadmap/collect-post-launch-metrics - Collect 30-day post-launch metrics
 * POST /api/roadmap/record-retrospective - Record success rating and lessons learned
 * GET /api/roadmap/features-needing-collection?projectId=xxx - List features needing collection
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  recordFeatureLaunch,
  collectPostLaunchMetrics,
  recordFeatureRetrospective,
  findFeaturesNeedingPostLaunchCollection,
  batchCollectPostLaunchMetrics
} from '@/lib/predictions/impact-simulation/data-collection';

export const dynamic = 'force-dynamic';

/**
 * Record a feature launch
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'launch') {
      // Record feature launch
      const { projectId, suggestionId, featureName, featureCategory, effortEstimate, actualEffortDays } = body;

      if (!projectId || !featureName) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: projectId, featureName' },
          { status: 400 }
        );
      }

      const featureId = await recordFeatureLaunch({
        projectId,
        suggestionId,
        featureName,
        featureCategory,
        effortEstimate,
        actualEffortDays
      });

      return NextResponse.json({
        success: true,
        message: 'Feature launch recorded successfully',
        data: { featureHistoryId: featureId }
      });
    } else if (action === 'collect-metrics') {
      // Collect post-launch metrics
      const { featureHistoryId } = body;

      if (!featureHistoryId) {
        return NextResponse.json(
          { success: false, error: 'Missing featureHistoryId' },
          { status: 400 }
        );
      }

      await collectPostLaunchMetrics(featureHistoryId);

      return NextResponse.json({
        success: true,
        message: 'Post-launch metrics collected successfully'
      });
    } else if (action === 'retrospective') {
      // Record retrospective
      const { featureHistoryId, successRating, lessonsLearned, revenueImpactEstimate } = body;

      if (!featureHistoryId || !successRating || !lessonsLearned) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: featureHistoryId, successRating, lessonsLearned' },
          { status: 400 }
        );
      }

      await recordFeatureRetrospective(
        featureHistoryId,
        successRating,
        lessonsLearned,
        revenueImpactEstimate
      );

      return NextResponse.json({
        success: true,
        message: 'Retrospective recorded successfully'
      });
    } else if (action === 'batch-collect') {
      // Batch collect for all eligible features
      const { projectId } = body;

      if (!projectId) {
        return NextResponse.json(
          { success: false, error: 'Missing projectId' },
          { status: 400 }
        );
      }

      await batchCollectPostLaunchMetrics(projectId);

      return NextResponse.json({
        success: true,
        message: 'Batch collection completed'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use: launch, collect-metrics, retrospective, or batch-collect' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[Track Feature Launch API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get features needing post-launch collection
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }

    const features = await findFeaturesNeedingPostLaunchCollection(projectId);

    return NextResponse.json({
      success: true,
      data: features
    });
  } catch (error: any) {
    console.error('[Track Feature Launch API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
