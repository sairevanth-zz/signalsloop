/**
 * API Route: Daily Briefing
 * GET /api/dashboard/briefing?projectId=<uuid>
 *
 * Returns today's AI-generated briefing or creates one if it doesn't exist
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTodayBriefing, getDashboardMetrics } from '@/lib/ai/mission-control';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { checkAIUsageLimit, incrementAIUsage } from '@/lib/ai-rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Check if briefing already exists for today
    const { data: existingBriefing } = await supabase
      .rpc('get_today_briefing', { p_project_id: projectId });

    let briefing;

    if (existingBriefing && existingBriefing.length > 0) {
      // Return cached briefing
      briefing = {
        id: existingBriefing[0].id,
        content: existingBriefing[0].content,
        created_at: existingBriefing[0].created_at,
        cached: true,
      };
    } else {
      // Check AI usage limits before generating new briefing
      // Using sentiment_analysis as the feature type for briefings
      const usageCheck = await checkAIUsageLimit(projectId, 'sentiment_analysis');

      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            error: 'AI usage limit reached',
            limit: usageCheck.limit,
            current: usageCheck.current,
            isPro: usageCheck.isPro,
          },
          { status: 429 }
        );
      }

      // Generate new briefing
      briefing = await getTodayBriefing(projectId);
      briefing.cached = false;

      // Increment AI usage
      await incrementAIUsage(projectId, 'sentiment_analysis');
    }

    // Fetch current metrics (always fresh)
    const metrics = await getDashboardMetrics(projectId);

    return NextResponse.json({
      success: true,
      briefing,
      metrics,
      project: {
        id: project.id,
        name: project.name,
      },
    });
  } catch (error) {
    console.error('Error in briefing API:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate briefing',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to force regenerate today's briefing
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Check AI usage limits
    const usageCheck = await checkAIUsageLimit(projectId, 'sentiment_analysis');

    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'AI usage limit reached',
          limit: usageCheck.limit,
          current: usageCheck.current,
          isPro: usageCheck.isPro,
        },
        { status: 429 }
      );
    }

    // Delete existing briefing for today
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('daily_briefings')
      .delete()
      .eq('project_id', projectId)
      .eq('briefing_date', today);

    // Generate new briefing
    const briefing = await getTodayBriefing(projectId);

    // Increment AI usage
    await incrementAIUsage(projectId, 'sentiment_analysis');

    // Fetch current metrics
    const metrics = await getDashboardMetrics(projectId);

    return NextResponse.json({
      success: true,
      briefing,
      metrics,
      regenerated: true,
    });
  } catch (error) {
    console.error('Error regenerating briefing:', error);
    return NextResponse.json(
      {
        error: 'Failed to regenerate briefing',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
