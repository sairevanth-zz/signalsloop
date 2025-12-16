import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import {
  analyzeSentimentBatch,
  analyzeSentimentWithRetry,
} from '@/lib/openai/sentiment';
import { checkAIUsageLimit, incrementAIUsage } from '@/lib/ai-rate-limit';
import {
  checkDemoRateLimit,
  incrementDemoUsage,
  getClientIP,
  getTimeUntilReset,
} from '@/lib/demo-rate-limit';
import {
  AnalyzeSentimentRequest,
  AnalyzeSentimentResponse,
  SentimentAnalysisInput,
} from '@/types/sentiment';

export const runtime = 'nodejs';
export const maxDuration = 60; // Longer duration for batch processing

// Maximum number of items that can be analyzed in a single request
const MAX_ITEMS_PER_REQUEST = 1000;
const BATCH_SIZE = 100;

/**
 * POST /api/analyze-sentiment
 * Analyzes sentiment for one or more feedback posts
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[SENTIMENT API] Request received');

    const body = (await request.json()) as AnalyzeSentimentRequest;
    const { postIds, projectId } = body;

    // Validate input
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'postIds is required and must be a non-empty array',
        },
        { status: 400 },
      );
    }

    // Check item limit
    if (postIds.length > MAX_ITEMS_PER_REQUEST) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_ITEMS_PER_REQUEST} items per request`,
          message: `You requested analysis for ${postIds.length} items. Please split your request into smaller batches.`,
        },
        { status: 400 },
      );
    }

    // Check rate limits
    let demoUsageInfo: { limit: number; remaining: number; resetAt: number } | null = null;

    if (projectId) {
      const usageCheck = await checkAIUsageLimit(projectId, 'sentiment_analysis');

      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: `You've reached your monthly limit of ${usageCheck.limit} AI sentiment analyses. ${usageCheck.isPro
              ? 'Please try again next month.'
              : 'Upgrade to Pro for 50,000 analyses per month!'
              }`,
            current: usageCheck.current,
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
            isPro: usageCheck.isPro,
          },
          { status: 429 },
        );
      }
    } else {
      // Demo/unauthenticated user - use IP-based rate limiting
      const clientIP = getClientIP(request);
      const demoCheck = checkDemoRateLimit(clientIP, 'sentiment_analysis');

      if (!demoCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'Demo rate limit exceeded',
            message: `You've reached the demo limit of ${demoCheck.limit} sentiment analyses per hour. Try again in ${getTimeUntilReset(demoCheck.resetAt)} or sign up for unlimited access!`,
            limit: demoCheck.limit,
            remaining: demoCheck.remaining,
            resetAt: demoCheck.resetAt,
            isDemo: true,
          },
          { status: 429 },
        );
      }

      demoUsageInfo = {
        limit: demoCheck.limit,
        remaining: Math.max(demoCheck.remaining, 0),
        resetAt: demoCheck.resetAt,
      };
    }

    // Initialize Supabase client
    const supabase = getServiceRoleClient();
    if (!supabase) {
      console.error('[SENTIMENT API] No database client available');
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection not available',
        },
        { status: 500 },
      );
    }

    console.log(`[SENTIMENT API] Fetching ${postIds.length} posts from database`);

    // Fetch posts from database
    const { data: posts, error: fetchError } = await supabase
      .from('posts')
      .select('id, title, description, author_name, category')
      .in('id', postIds);

    if (fetchError) {
      console.error('[SENTIMENT API] Database error:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch posts from database',
          message: fetchError.message,
        },
        { status: 500 },
      );
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No posts found',
          message: 'None of the provided post IDs exist in the database',
        },
        { status: 404 },
      );
    }

    console.log(`[SENTIMENT API] Found ${posts.length} posts, analyzing sentiment...`);

    // Prepare inputs for sentiment analysis
    const sentimentInputs: SentimentAnalysisInput[] = posts.map((post) => ({
      text: `${post.title}\n\n${post.description || ''}`,
      postId: post.id,
      metadata: {
        title: post.title,
        category: post.category,
        authorName: post.author_name,
      },
    }));

    // Analyze sentiment in batches
    const batchResults = await analyzeSentimentBatch({
      items: sentimentInputs,
      maxBatchSize: BATCH_SIZE,
    });

    // Flatten results
    const allResults = batchResults.flatMap((batch) => batch.results);

    console.log(
      `[SENTIMENT API] Analysis complete: ${allResults.filter((r) => r.success).length} succeeded, ${allResults.filter((r) => !r.success).length} failed`,
    );

    // Store results in database
    const successfulResults = allResults.filter((r) => r.success);

    if (successfulResults.length > 0) {
      const sentimentRecords = successfulResults.map((result) => ({
        post_id: result.postId,
        sentiment_category: result.sentiment_category,
        sentiment_score: result.sentiment_score,
        emotional_tone: result.emotional_tone,
        confidence_score: result.confidence_score,
        analyzed_at: new Date().toISOString(),
      }));

      // Upsert sentiment analysis results
      const { error: insertError } = await supabase
        .from('sentiment_analysis')
        .upsert(sentimentRecords, {
          onConflict: 'post_id',
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error('[SENTIMENT API] Failed to store results:', insertError);
        // Continue anyway, we'll still return the results to the client
      } else {
        console.log(
          `[SENTIMENT API] Successfully stored ${successfulResults.length} sentiment analyses`,
        );
      }
    }

    // Increment usage counters
    const successCount = successfulResults.length;
    if (projectId && successCount > 0) {
      // Increment by the number of successful analyses
      for (let i = 0; i < successCount; i++) {
        await incrementAIUsage(projectId, 'sentiment_analysis');
      }
    } else if (!projectId && successCount > 0) {
      const clientIP = getClientIP(request);
      for (let i = 0; i < successCount; i++) {
        incrementDemoUsage(clientIP, 'sentiment_analysis');
      }
    }

    // Prepare response
    const response: AnalyzeSentimentResponse = {
      success: true,
      results: allResults,
      processed: successfulResults.length,
      failed: allResults.length - successfulResults.length,
      message: `Successfully analyzed ${successfulResults.length} out of ${allResults.length} posts`,
    };

    // Add demo usage info if applicable
    if (demoUsageInfo) {
      (response as any).demoUsage = demoUsageInfo;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[SENTIMENT API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/analyze-sentiment?projectId=xxx&days=30
 * Get sentiment distribution and trends for a project
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'projectId is required',
        },
        { status: 400 },
      );
    }

    // Initialize Supabase client
    const supabase = getServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection not available',
        },
        { status: 500 },
      );
    }

    console.log(`[SENTIMENT API] Getting distribution for project ${projectId}`);


    // Get sentiment distribution
    const { data: distribution, error: distError } = await supabase.rpc(
      'get_sentiment_distribution',
      {
        p_project_id: projectId,
        p_days_ago: days,
      },
    );

    if (distError) {
      console.error('[SENTIMENT API] Distribution error:', distError);
    }

    // Get sentiment trend
    const { data: trend, error: trendError } = await supabase.rpc(
      'get_sentiment_trend',
      {
        p_project_id: projectId,
        p_days_ago: days,
      },
    );

    if (trendError) {
      console.error('[SENTIMENT API] Trend error:', trendError);
    }

    return NextResponse.json({
      success: true,
      distribution: distribution || [],
      trend: trend || [],
      days,
    });
  } catch (error) {
    console.error('[SENTIMENT API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 },
    );
  }
}
