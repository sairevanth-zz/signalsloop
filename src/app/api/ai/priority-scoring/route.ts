import { NextRequest, NextResponse } from 'next/server';
import { calculatePriorityScore, batchScorePosts } from '@/lib/enhanced-priority-scoring';
import { checkAIUsageLimit, incrementAIUsage } from '@/lib/ai-rate-limit';
import { checkDemoRateLimit, incrementDemoUsage, getClientIP, getTimeUntilReset } from '@/lib/demo-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/ai/priority-scoring
 * Calculate priority scores for feedback posts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batch, post, metrics, user, businessContext, projectId } = body;

    // Check rate limit if projectId is provided
    if (projectId) {
      const usageCheck = await checkAIUsageLimit(projectId, 'prioritization');

      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `You've reached your monthly limit of ${usageCheck.limit} AI priority scorings. ${
              usageCheck.isPro ? 'Please try again next month.' : 'Upgrade to Pro for unlimited priority scoring!'
            }`,
            current: usageCheck.current,
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
            isPro: usageCheck.isPro
          },
          { status: 429 }
        );
      }
    } else {
      // Demo/unauthenticated user - use IP-based rate limiting
      const clientIP = getClientIP(request);
      const demoCheck = checkDemoRateLimit(clientIP, 'prioritization');

      if (!demoCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Demo rate limit exceeded',
            message: `You've reached the demo limit of ${demoCheck.limit} priority scorings per hour. Try again in ${getTimeUntilReset(demoCheck.resetAt)} or sign up for unlimited access!`,
            limit: demoCheck.limit,
            remaining: demoCheck.remaining,
            resetAt: demoCheck.resetAt,
            isDemo: true
          },
          { status: 429 }
        );
      }
    }

    // Handle batch scoring
    if (batch && Array.isArray(batch)) {
      const scores = await batchScorePosts(batch);

      if (projectId) {
        await incrementAIUsage(projectId, 'prioritization', batch.length);
      } else {
        const clientIP = getClientIP(request);
        incrementDemoUsage(clientIP, 'prioritization', batch.length);
      }

      return NextResponse.json({
        success: true,
        scores: Object.fromEntries(scores),
        model: process.env.PRIORITY_MODEL || 'gpt-4o-mini'
      });
    }

    // Handle single scoring
    if (!post || !post.title) {
      return NextResponse.json(
        { error: 'Post information is required' },
        { status: 400 }
      );
    }

    const score = await calculatePriorityScore({
      post: {
        id: post.id || 'unknown',
        title: post.title,
        description: post.description || '',
        category: post.category,
        createdAt: post.createdAt ? new Date(post.createdAt) : new Date()
      },
      metrics: metrics || {
        voteCount: 0,
        commentCount: 0,
        uniqueVoters: 0,
        percentageOfActiveUsers: 0,
        similarPostsCount: 0
      },
      user: user || {
        tier: 'free',
        isChampion: false
      },
      businessContext
    });

    if (projectId) {
      await incrementAIUsage(projectId, 'prioritization');
    } else {
      const clientIP = getClientIP(request);
      incrementDemoUsage(clientIP, 'prioritization');
    }

    return NextResponse.json({
      success: true,
      score,
      model: process.env.PRIORITY_MODEL || 'gpt-4o-mini'
    });

  } catch (error) {
    console.error('[PRIORITY SCORING] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate priority score',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
