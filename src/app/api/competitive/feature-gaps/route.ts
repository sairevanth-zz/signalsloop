/**
 * Feature Gaps API
 * GET: List feature gaps or get details
 * POST: Trigger feature gap detection (with tier limits)
 * PUT: Update feature gap status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import {
  updateFeatureGapStatus,
  getFeatureGapDetails,
  detectFeatureGaps,
} from '@/lib/competitive-intelligence';
import { checkAIUsageLimit, incrementAIUsage, getUpgradeMessage } from '@/lib/ai-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/competitive/feature-gaps?projectId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const gapId = searchParams.get('gapId');

    if (!projectId && !gapId) {
      return NextResponse.json({ success: false, error: 'projectId or gapId is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not available' }, { status: 500 });
    }

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
      .from('feature_gaps')
      .select('*')
      .eq('project_id', projectId)
      .order('urgency_score', { ascending: false });

    if (error) {
      console.error('[Feature Gaps API] Error fetching gaps:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Also get usage info
    const usageCheck = await checkAIUsageLimit(projectId!, 'feature_gap_detection');

    return NextResponse.json({
      success: true,
      featureGaps: gaps || [],
      total: gaps?.length || 0,
      usage: {
        current: usageCheck.current,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining,
        plan: usageCheck.plan,
        allowed: usageCheck.allowed,
      },
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
 * POST /api/competitive/feature-gaps
 * Trigger feature gap detection (with tier limits)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, daysBack = 90 } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    // Check tier limit before proceeding
    const usageCheck = await checkAIUsageLimit(projectId, 'feature_gap_detection');

    if (!usageCheck.allowed) {
      const plan = usageCheck.plan || 'free';
      return NextResponse.json({
        success: false,
        error: 'Limit reached',
        message: getUpgradeMessage('feature_gap_detection', usageCheck.limit, plan === 'premium' ? 'pro' : plan),
        usage: {
          current: usageCheck.current,
          limit: usageCheck.limit,
          remaining: usageCheck.remaining,
          plan: usageCheck.plan,
        },
      }, { status: 429 });
    }

    console.log(`[Feature Gaps] Running detection for project ${projectId} (${usageCheck.remaining} detections remaining)`);

    // Run feature gap detection
    const result = await detectFeatureGaps(projectId, daysBack);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Detection failed',
      }, { status: 500 });
    }

    // Increment usage
    await incrementAIUsage(projectId, 'feature_gap_detection');

    console.log(`[Feature Gaps] Detected ${result.gapsDetected} feature gaps`);

    return NextResponse.json({
      success: true,
      message: `Detected ${result.gapsDetected} feature gaps`,
      gapsDetected: result.gapsDetected,
      gaps: result.gaps,
      usage: {
        current: usageCheck.current + 1,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining - 1,
      },
    });
  } catch (error) {
    console.error('[Feature Gaps API] POST Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Detection failed',
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
