/**
 * Backfill Sentiment Analysis for Existing Posts
 *
 * This endpoint analyzes sentiment for all posts that don't have sentiment analysis yet.
 * Useful for:
 * - Initial setup when enabling AI Roadmap feature
 * - Recovering from agent downtime
 * - Migrating existing data
 *
 * GET /api/admin/backfill-sentiment?project_id=xxx&limit=50&dryRun=true
 *
 * Query params:
 * - project_id: (required) Project ID to backfill
 * - limit: Max posts to process (default: 50, max: 200)
 * - dryRun: If true, only count posts without showing actual processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { batchAnalyzeSentiment } from '@/lib/agents/sentiment-agent';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const validToken = process.env.CRON_SECRET || process.env.ADMIN_TOKEN;

    if (!validToken || authHeader !== `Bearer ${validToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const dryRun = searchParams.get('dryRun') === 'true';

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: project_id' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    console.log(`📊 [BACKFILL SENTIMENT] Starting for project: ${projectId}`);
    console.log(`   Limit: ${limit}, Dry run: ${dryRun}`);

    // Find posts without sentiment analysis
    const { data: postsWithoutSentiment, error: queryError } = await supabase
      .from('posts')
      .select('id, title, content, created_at')
      .eq('project_id', projectId)
      .not('id', 'in', supabase
        .from('sentiment_analysis')
        .select('post_id')
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (queryError) {
      console.error('[BACKFILL SENTIMENT] Query error:', queryError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to query posts',
          details: queryError.message,
        },
        { status: 500 }
      );
    }

    if (!postsWithoutSentiment || postsWithoutSentiment.length === 0) {
      console.log('✅ [BACKFILL SENTIMENT] No posts need sentiment analysis');
      return NextResponse.json({
        success: true,
        message: 'All posts already have sentiment analysis',
        projectId,
        postsProcessed: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`📦 [BACKFILL SENTIMENT] Found ${postsWithoutSentiment.length} posts without sentiment`);

    // Dry run - just count
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        projectId,
        postsFound: postsWithoutSentiment.length,
        message: `Found ${postsWithoutSentiment.length} posts that need sentiment analysis`,
        sample: postsWithoutSentiment.slice(0, 5).map(p => ({
          id: p.id,
          title: p.title,
          created_at: p.created_at,
        })),
        duration: Date.now() - startTime,
      });
    }

    // Actually process the posts
    const postIds = postsWithoutSentiment.map(p => p.id);

    console.log(`🤖 [BACKFILL SENTIMENT] Processing ${postIds.length} posts...`);

    // Use the existing batch sentiment analysis function
    await batchAnalyzeSentiment(postIds);

    const totalDuration = Date.now() - startTime;

    console.log(`✅ [BACKFILL SENTIMENT] Complete: ${postIds.length} posts processed in ${totalDuration}ms`);

    return NextResponse.json({
      success: true,
      projectId,
      postsProcessed: postIds.length,
      duration: totalDuration,
      message: `Successfully analyzed sentiment for ${postIds.length} posts`,
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error('[BACKFILL SENTIMENT] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Backfill failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: totalDuration,
      },
      { status: 500 }
    );
  }
}
