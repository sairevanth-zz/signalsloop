import { NextRequest, NextResponse } from 'next/server';
import { calculatePriorityScore, batchScorePosts, type PriorityContext } from '@/lib/enhanced-priority-scoring';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * TEST ENDPOINT for Enhanced Priority Scoring
 * Use this to test the new priority scoring system before replacing production
 *
 * POST /api/ai/priority-score-v2
 * Body: PriorityContext (see enhanced-priority-scoring.ts)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batch, ...singleContext } = body;

    // Handle batch scoring
    if (batch && Array.isArray(batch)) {
      console.log('[PRIORITY SCORE V2 TEST] Batch scoring:', batch.length, 'posts');

      const scores = await batchScorePosts(batch);

      return NextResponse.json({
        success: true,
        scores: Object.fromEntries(scores),
        metadata: {
          version: 'v2-enhanced',
          batchSize: batch.length,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Handle single scoring
    const context: PriorityContext = {
      post: {
        id: singleContext.post?.id || 'test',
        title: singleContext.post?.title || '',
        description: singleContext.post?.description || '',
        category: singleContext.post?.category,
        createdAt: new Date(singleContext.post?.createdAt || Date.now())
      },
      metrics: {
        voteCount: singleContext.metrics?.voteCount || 0,
        commentCount: singleContext.metrics?.commentCount || 0,
        uniqueVoters: singleContext.metrics?.uniqueVoters || 0,
        percentageOfActiveUsers: singleContext.metrics?.percentageOfActiveUsers || 0,
        similarPostsCount: singleContext.metrics?.similarPostsCount || 0
      },
      user: {
        tier: singleContext.user?.tier || 'free',
        companySize: singleContext.user?.companySize,
        mrr: singleContext.user?.mrr,
        isChampion: singleContext.user?.isChampion || false
      },
      businessContext: singleContext.businessContext
    };

    if (!context.post.title) {
      return NextResponse.json(
        { error: 'Post title is required' },
        { status: 400 }
      );
    }

    console.log('[PRIORITY SCORE V2 TEST] Scoring:', {
      title: context.post.title,
      tier: context.user.tier,
      strategy: context.businessContext?.companyStrategy
    });

    const score = await calculatePriorityScore(context);

    console.log('[PRIORITY SCORE V2 TEST] Result:', score);

    return NextResponse.json({
      success: true,
      score,
      metadata: {
        version: 'v2-enhanced',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[PRIORITY SCORE V2 TEST] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate priority score',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
