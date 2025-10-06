import { NextRequest, NextResponse } from 'next/server';
import { calculatePriorityScore, batchScorePosts } from '@/lib/enhanced-priority-scoring';
import { checkAIUsageLimit, incrementAIUsage } from '@/lib/ai-rate-limit';
import { checkDemoRateLimit, incrementDemoUsage, getClientIP, getTimeUntilReset } from '@/lib/demo-rate-limit';
import { getSupabaseServerClient } from '@/lib/supabase-client';

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
    let resolvedProjectId: string | undefined = projectId;
    const requestedPostId: string | undefined = post?.id || body.postId;

    let scoringPost = post;
    let scoringMetrics = metrics;
    let scoringUser = user;
    let scoringBusinessContext = businessContext;

    if ((!scoringPost || !scoringPost.title) && requestedPostId) {
      const supabase = getSupabaseServerClient();

      if (!supabase) {
        return NextResponse.json(
          { error: 'Database connection not available' },
          { status: 500 }
        );
      }

      const { data: postRecord, error: postError } = await supabase
        .from('posts')
        .select('id, project_id, title, description, category, created_at, vote_count, comment_count')
        .eq('id', requestedPostId)
        .single();

      if (postError || !postRecord) {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }

      scoringPost = {
        id: postRecord.id,
        title: postRecord.title,
        description: postRecord.description || '',
        category: postRecord.category || undefined,
        createdAt: new Date(postRecord.created_at)
      };

      resolvedProjectId = resolvedProjectId || postRecord.project_id || undefined;

      const { data: voterRows, error: votersError } = await supabase
        .from('votes')
        .select('voter_email')
        .eq('post_id', postRecord.id);

      if (votersError) {
        console.error('[PRIORITY SCORING] Failed to fetch voter data', votersError);
      }

      const uniqueVoters = new Set((voterRows || []).map(v => v.voter_email).filter(Boolean)).size;
      const voteCount = typeof postRecord.vote_count === 'number'
        ? postRecord.vote_count
        : (voterRows?.length ?? 0);

      const { count: commentCountRaw, error: commentsError } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postRecord.id);

      if (commentsError) {
        console.error('[PRIORITY SCORING] Failed to fetch comment count', commentsError);
      }

      const commentCount = typeof commentCountRaw === 'number'
        ? commentCountRaw
        : typeof postRecord.comment_count === 'number'
          ? postRecord.comment_count
          : 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: recentVotesRaw, error: recentVotesError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', postRecord.project_id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (recentVotesError) {
        console.error('[PRIORITY SCORING] Failed to fetch recent votes', recentVotesError);
      }

      const { count: totalProjectVotesRaw, error: totalVotesError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', postRecord.project_id);

      if (totalVotesError) {
        console.error('[PRIORITY SCORING] Failed to fetch total votes', totalVotesError);
      }

      const recentVotesCount = recentVotesRaw ?? 0;
      const totalProjectVotesCount = totalProjectVotesRaw ?? 0;

      const percentageOfActiveUsers = totalProjectVotesCount > 0
        ? Math.min(100, Math.round((uniqueVoters / Math.max(recentVotesCount || 1, 1)) * 100))
        : 0;

      let similarPostsCount = 0;
      try {
        const { data: similarPosts } = await supabase
          .from('posts')
          .select('id, title, description')
          .eq('project_id', postRecord.project_id)
          .neq('id', postRecord.id)
          .limit(50);

        if (similarPosts) {
          const keywords = `${postRecord.title} ${postRecord.description || ''}`
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter(word => word.length > 3)
            .slice(0, 8);

          if (keywords.length) {
            similarPostsCount = similarPosts.filter(entry => {
              const text = `${entry.title} ${entry.description || ''}`.toLowerCase();
              return keywords.some(keyword => text.includes(keyword));
            }).length;
          }
        }
      } catch (similarError) {
        console.error('[PRIORITY SCORING] Failed to calculate similar posts', similarError);
      }

      const { data: projectRecord, error: projectError } = resolvedProjectId
        ? await supabase
            .from('projects')
            .select('plan')
            .eq('id', resolvedProjectId)
            .single()
        : { data: null, error: null };

      if (projectError) {
        console.error('[PRIORITY SCORING] Failed to fetch project plan', projectError);
      }

      const inferredTier = (projectRecord?.plan === 'pro' || projectRecord?.plan === 'enterprise')
        ? projectRecord.plan as 'pro' | 'enterprise'
        : 'free';

      scoringMetrics = {
        voteCount: scoringMetrics?.voteCount ?? voteCount,
        commentCount: scoringMetrics?.commentCount ?? commentCount,
        uniqueVoters: scoringMetrics?.uniqueVoters ?? uniqueVoters,
        percentageOfActiveUsers: scoringMetrics?.percentageOfActiveUsers ?? percentageOfActiveUsers,
        similarPostsCount: scoringMetrics?.similarPostsCount ?? similarPostsCount
      };

      scoringUser = {
        tier: (scoringUser?.tier as 'free' | 'pro' | 'enterprise') || inferredTier,
        companySize: scoringUser?.companySize,
        mrr: scoringUser?.mrr,
        isChampion: scoringUser?.isChampion ?? uniqueVoters >= 3
      };

      if (!scoringBusinessContext) {
        let strategy: 'growth' | 'retention' | 'enterprise' | 'profitability' = 'growth';

        if (scoringUser.tier === 'pro') strategy = 'retention';
        if (scoringUser.tier === 'enterprise') strategy = 'enterprise';

        scoringBusinessContext = {
          currentQuarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
          companyStrategy: strategy
        };
      }
    }

    if (!scoringPost || !scoringPost.title) {
      return NextResponse.json(
        { error: 'Post information is required' },
        { status: 400 }
      );
    }

    const normalizedPost = {
      id: scoringPost.id || requestedPostId || 'unknown',
      title: scoringPost.title,
      description: scoringPost.description || '',
      category: scoringPost.category,
      createdAt: scoringPost.createdAt ? new Date(scoringPost.createdAt) : new Date()
    };

    const normalizedMetrics = {
      voteCount: scoringMetrics?.voteCount ?? 0,
      commentCount: scoringMetrics?.commentCount ?? 0,
      uniqueVoters: scoringMetrics?.uniqueVoters ?? 0,
      percentageOfActiveUsers: Math.min(100, scoringMetrics?.percentageOfActiveUsers ?? 0),
      similarPostsCount: scoringMetrics?.similarPostsCount ?? 0
    };

    const resolveTier = (tier?: string): 'free' | 'pro' | 'enterprise' => {
      if (tier === 'enterprise') return 'enterprise';
      if (tier === 'pro') return 'pro';
      return 'free';
    };

    const normalizedUser = scoringUser
      ? {
          tier: resolveTier(scoringUser.tier),
          companySize: scoringUser.companySize,
          mrr: scoringUser.mrr,
          isChampion: scoringUser.isChampion ?? false
        }
      : {
          tier: 'free' as const,
          isChampion: false
        };

    const normalizedBusinessContext = scoringBusinessContext ?? {
      currentQuarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
      companyStrategy: normalizedUser.tier === 'pro'
        ? 'retention'
        : normalizedUser.tier === 'enterprise'
          ? 'enterprise'
          : 'growth'
    };

    const score = await calculatePriorityScore({
      post: normalizedPost,
      metrics: normalizedMetrics,
      user: normalizedUser,
      businessContext: normalizedBusinessContext
    });

    if (resolvedProjectId) {
      await incrementAIUsage(resolvedProjectId, 'prioritization');
    } else {
      const clientIP = getClientIP(request);
      incrementDemoUsage(clientIP, 'prioritization');
    }

    return NextResponse.json({
      success: true,
      score,
      model: process.env.PRIORITY_MODEL || 'gpt-4o-mini',
      version: 'v2-enforced-minimums', // Version indicator
      debug: {
        isBugDetected: score.priorityLevel === 'immediate',
        tierMultiplier: normalizedUser.tier === 'enterprise' ? 1.3 : normalizedUser.tier === 'pro' ? 1.1 : 1.0
      }
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
