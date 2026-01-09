/**
 * Strategic Recommendations API
 * GET: List recommendations or get details
 * POST: Generate new recommendations (with tier limits)
 * PUT: Update recommendation status
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getStrategicRecommendations,
  updateRecommendationStatus,
  getRecommendationDetails,
  generateStrategicRecommendations,
} from '@/lib/competitive-intelligence';
import { checkAIUsageLimit, incrementAIUsage, getUpgradeMessage } from '@/lib/ai-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/competitive/recommendations?projectId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const recommendationId = searchParams.get('recommendationId');
    const status = searchParams.get('status');

    if (!projectId && !recommendationId) {
      return NextResponse.json(
        { success: false, error: 'projectId or recommendationId is required' },
        { status: 400 },
      );
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

    // Also get usage info
    const usageCheck = await checkAIUsageLimit(projectId!, 'strategic_recommendations');

    return NextResponse.json({
      success: true,
      recommendations,
      total: recommendations.length,
      usage: {
        current: usageCheck.current,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining,
        plan: usageCheck.plan,
        allowed: usageCheck.allowed,
      },
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
 * POST /api/competitive/recommendations
 * Generate new strategic recommendations (with tier limits)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    // Check tier limit before proceeding
    const usageCheck = await checkAIUsageLimit(projectId, 'strategic_recommendations');

    if (!usageCheck.allowed) {
      const plan = usageCheck.plan || 'free';
      return NextResponse.json({
        success: false,
        error: 'Limit reached',
        message: getUpgradeMessage('strategic_recommendations', usageCheck.limit, plan === 'premium' ? 'pro' : plan),
        usage: {
          current: usageCheck.current,
          limit: usageCheck.limit,
          remaining: usageCheck.remaining,
          plan: usageCheck.plan,
        },
      }, { status: 429 });
    }

    console.log(`[Strategic Recommendations] Generating for project ${projectId} (${usageCheck.remaining} generations remaining)`);

    // Generate recommendations
    const result = await generateStrategicRecommendations(projectId);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Generation failed',
      }, { status: 500 });
    }

    // Increment usage
    await incrementAIUsage(projectId, 'strategic_recommendations');

    console.log(`[Strategic Recommendations] Generated ${result.recommendationsGenerated} recommendations`);

    return NextResponse.json({
      success: true,
      message: `Generated ${result.recommendationsGenerated} strategic recommendations`,
      recommendationsGenerated: result.recommendationsGenerated,
      executiveSummary: result.executiveSummary,
      usage: {
        current: usageCheck.current + 1,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining - 1,
      },
    });
  } catch (error) {
    console.error('[Recommendations API] POST Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Generation failed',
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
