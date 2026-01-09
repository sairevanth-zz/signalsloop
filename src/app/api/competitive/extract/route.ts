/**
 * Manual Competitive Extraction API
 * POST: Manually trigger competitive extraction for a project
 * 
 * Enforces tier limits based on project plan.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { extractCompetitorMentionsBatch, getPendingFeedbackForExtraction } from '@/lib/competitive-intelligence';
import { checkAIUsageLimit, incrementAIUsage, getUpgradeMessage } from '@/lib/ai-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/competitive/extract
 * Manually trigger competitive extraction for a project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, limit = 20 } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not available' }, { status: 500 });
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, plan')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    // Check tier limit before proceeding
    const usageCheck = await checkAIUsageLimit(projectId, 'competitor_extraction');

    if (!usageCheck.allowed) {
      const plan = usageCheck.plan || 'free';
      return NextResponse.json({
        success: false,
        error: 'Limit reached',
        message: getUpgradeMessage('competitor_extraction', usageCheck.limit, plan === 'premium' ? 'pro' : plan),
        usage: {
          current: usageCheck.current,
          limit: usageCheck.limit,
          remaining: usageCheck.remaining,
          plan: usageCheck.plan,
        },
      }, { status: 429 });
    }

    console.log(`[Competitive Extraction] Starting extraction for project ${projectId} (${usageCheck.remaining} extractions remaining)`);

    // Get pending feedback for extraction (limit by remaining quota)
    const maxItems = Math.min(limit, usageCheck.remaining);
    const pendingFeedbackIds = await getPendingFeedbackForExtraction(projectId, maxItems);

    if (pendingFeedbackIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending feedback to extract',
        processed: 0,
        mentionsFound: 0,
        usage: {
          current: usageCheck.current,
          limit: usageCheck.limit,
          remaining: usageCheck.remaining,
        },
      });
    }

    console.log(`[Competitive Extraction] Found ${pendingFeedbackIds.length} pending feedback items`);

    // Extract competitors from feedback batch
    const result = await extractCompetitorMentionsBatch(pendingFeedbackIds);

    // Increment usage by number of items processed
    if (result.successful > 0) {
      await incrementAIUsage(projectId, 'competitor_extraction', result.successful);
    }

    console.log(`[Competitive Extraction] Completed. Processed: ${result.processed}, Mentions: ${result.totalMentions}`);

    return NextResponse.json({
      success: true,
      message: 'Extraction completed',
      processed: result.processed,
      successful: result.successful,
      failed: result.failed,
      mentionsFound: result.totalMentions,
      usage: {
        current: usageCheck.current + result.successful,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining - result.successful,
      },
    });
  } catch (error) {
    console.error('[Competitive Extraction] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Extraction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/competitive/extract?projectId=xxx
 * Get extraction usage status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    // Check usage status
    const usageCheck = await checkAIUsageLimit(projectId, 'competitor_extraction');
    const pendingFeedback = await getPendingFeedbackForExtraction(projectId, 1000);

    return NextResponse.json({
      success: true,
      usage: {
        current: usageCheck.current,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining,
        plan: usageCheck.plan,
        allowed: usageCheck.allowed,
      },
      pendingCount: pendingFeedback.length,
    });
  } catch (error) {
    console.error('[Competitive Extraction] GET Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get usage' }, { status: 500 });
  }
}
