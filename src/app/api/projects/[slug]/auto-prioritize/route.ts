import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { calculatePriorityScore } from '@/lib/enhanced-priority-scoring';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for Pro plan

const DEFAULT_BATCH_LIMIT = 10; // Reduced to prevent timeouts - process 10 posts at a time

export async function OPTIONS() {
  return NextResponse.json({ success: true });
}

function mapPlanToTier(plan?: string | null): 'free' | 'pro' | 'enterprise' {
  if (plan === 'enterprise') return 'enterprise';
  if (plan === 'pro') return 'pro';
  return 'free';
}

function deriveStrategyFromPlan(plan?: string | null): 'growth' | 'retention' | 'enterprise' | 'profitability' {
  if (plan === 'enterprise') return 'enterprise';
  if (plan === 'pro') return 'retention';
  return 'growth';
}

const derivePriorityLabel = (score: number): string => {
  if (score >= 8.5) return 'Immediate';
  if (score >= 7) return 'Current Quarter';
  if (score >= 5) return 'Next Quarter';
  if (score >= 3) return 'Backlog';
  return 'Low';
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id, plan, created_at')
      .eq('slug', slug)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user is owner or admin member
    const isOwner = project.owner_id === user.id;
    let isAdmin = false;

    if (!isOwner) {
      const { data: memberData } = await supabase
        .from('members')
        .select('role')
        .eq('project_id', project.id)
        .eq('user_id', user.id)
        .single();

      isAdmin = memberData?.role === 'admin';
    }

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get board for this project (posts belong to boards, not projects)
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id')
      .eq('project_id', project.id)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const batchLimit = typeof body?.limit === 'number'
      ? Math.max(1, Math.min(body.limit, 100))
      : DEFAULT_BATCH_LIMIT;
    const forceReanalyze = body?.forceReanalyze === true;

    // Filter to only process posts that need prioritization:
    // - Never AI analyzed (ai_analyzed_at IS NULL)
    // - No priority score
    // - Or force reanalyze all posts
    const filterConditions = [
      'ai_analyzed_at.is.null',
      'priority_score.is.null',
      'priority_reason.is.null',
    ].join(',');

    let query = supabase
      .from('posts')
      .select(
        'id, title, description, category, created_at, updated_at, vote_count, comment_count, must_have_votes, important_votes, nice_to_have_votes, total_priority_score, priority_score, priority_reason, ai_analyzed_at'
      )
      .eq('board_id', board.id)
      .is('duplicate_of', null);

    // Only apply filter if not forcing reanalysis
    if (!forceReanalyze) {
      query = query.or(filterConditions);
    }

    const { data: posts, error: postsError } = await query
      .order('created_at', { ascending: true }) // Process oldest unprioritized posts first
      .limit(batchLimit);

    if (postsError) {
      console.error('Failed to load posts for auto-prioritize:', postsError);
      return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ processedCount: 0, updatedCount: 0, skippedCount: 0, remaining: 0 });
    }

    const postIds = posts.map((post) => post.id).filter(Boolean);

    const [{ data: voteRows }, { data: commentRows }] = await Promise.all([
      supabase
        .from('votes')
        .select('post_id, priority, voter_email')
        .in('post_id', postIds),
      supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds),
    ]);

    const voteStats = new Map<
      string,
      { total: number; uniqueEmails: Set<string>; mustHave: number; important: number; niceToHave: number }
    >();
    (voteRows || []).forEach((row) => {
      const postId = row.post_id as string;
      if (!voteStats.has(postId)) {
        voteStats.set(postId, { total: 0, uniqueEmails: new Set(), mustHave: 0, important: 0, niceToHave: 0 });
      }
      const stats = voteStats.get(postId)!;
      stats.total += 1;
      const email = (row.voter_email as string | null) || '';
      if (email) stats.uniqueEmails.add(email.toLowerCase());
      const priority = (row.priority as string | null)?.toLowerCase();
      if (priority === 'must_have') stats.mustHave += 1;
      if (priority === 'important') stats.important += 1;
      if (priority === 'nice_to_have') stats.niceToHave += 1;
    });

    const commentStats = new Map<string, number>();
    (commentRows || []).forEach((row) => {
      const postId = row.post_id as string;
      commentStats.set(postId, (commentStats.get(postId) || 0) + 1);
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      { count: recentVotesRaw, error: recentVotesError },
      { count: totalProjectVotesRaw, error: totalVotesError }
    ] = await Promise.all([
      supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id)
    ]);

    if (recentVotesError) {
      console.error('Failed to fetch recent votes for auto-prioritize:', recentVotesError);
    }

    if (totalVotesError) {
      console.error('Failed to fetch total votes for auto-prioritize:', totalVotesError);
    }

    const recentVotesCount = recentVotesRaw ?? 0;
    const totalProjectVotesCount = totalProjectVotesRaw ?? 0;

    const tier = mapPlanToTier(project.plan);
    const strategy = deriveStrategyFromPlan(project.plan);

    let updatedCount = 0;
    const errors: Array<{ id: string; message: string }> = [];

    for (const post of posts) {
      try {
        const voteInfo = voteStats.get(post.id) || { total: 0, uniqueEmails: new Set<string>(), mustHave: 0, important: 0, niceToHave: 0 };
        const commentCount = commentStats.get(post.id) || Number(post.comment_count) || 0;
        const uniqueVoterCount = voteInfo.uniqueEmails.size;

        const derivedActivePercentage = totalProjectVotesCount > 0
          ? Math.min(100, Math.round((uniqueVoterCount / Math.max(recentVotesCount || 1, 1)) * 100))
          : 0;

        let similarPostsCount = 0;
        try {
          const { data: similarPosts, error: similarPostsError } = await supabase
            .from('posts')
            .select('id, title, description')
            .eq('project_id', project.id)
            .neq('id', post.id)
            .limit(50);

          if (similarPostsError) {
            console.error('Failed to fetch similar posts for auto-prioritize:', similarPostsError);
          } else if (similarPosts) {
            const keywords = `${post.title || ''} ${post.description || ''}`
              .toLowerCase()
              .split(/[^a-z0-9]+/)
              .filter(word => word.length > 3)
              .slice(0, 8);

            if (keywords.length) {
              similarPostsCount = similarPosts.filter((entry) => {
                const text = `${entry.title} ${entry.description || ''}`.toLowerCase();
                return keywords.some(keyword => text.includes(keyword));
              }).length;
            }
          }
        } catch (similarError) {
          console.error('Failed to calculate similar posts during auto-prioritize:', similarError);
        }

        const score = await calculatePriorityScore({
          post: {
            id: post.id,
            title: (post.title as string) || '(untitled)',
            description: (post.description as string) || '',
            category: (post.category as string | null) || undefined,
            createdAt: post.created_at ? new Date(post.created_at as string) : new Date(),
          },
          metrics: {
            voteCount: typeof post.vote_count === 'number' ? post.vote_count : voteInfo.total,
            commentCount,
            uniqueVoters: uniqueVoterCount,
            percentageOfActiveUsers: derivedActivePercentage,
            similarPostsCount,
            mustHaveVotes: post.must_have_votes ?? voteInfo.mustHave,
            importantVotes: post.important_votes ?? voteInfo.important,
            niceToHaveVotes: post.nice_to_have_votes ?? voteInfo.niceToHave,
            priorityScore: typeof post.total_priority_score === 'number'
              ? Number(post.total_priority_score)
              : (typeof post.priority_score === 'number' ? Number(post.priority_score) : undefined),
          },
          user: {
            tier,
            isChampion: voteInfo.mustHave >= 3,
          },
          businessContext: {
            currentQuarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
            companyStrategy: strategy,
          },
        });

        const derivedLabel = derivePriorityLabel(score.weightedScore);
        const priorityReason = `${derivedLabel.toUpperCase()}: ${score.businessJustification}`;

        const { error: updateError } = await supabase
          .from('posts')
          .update({
            priority_score: score.weightedScore,
            priority_reason: priorityReason,
            ai_analyzed_at: new Date().toISOString(),
            total_priority_score: Math.round(score.weightedScore * 10),
          })
          .eq('id', post.id);

        if (updateError) {
          throw updateError;
        }

        updatedCount += 1;
      } catch (error) {
        console.error('Failed to auto-prioritize post', post.id, error);
        errors.push({
          id: String(post.id),
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Calculate remaining posts that still need prioritization (excluding what we just processed)
    const processedIds = posts.map(p => p.id);
    let remainingQuery = supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('board_id', board.id)
      .is('duplicate_of', null);

    // Only apply filter if not forcing reanalysis
    if (!forceReanalyze) {
      remainingQuery = remainingQuery.or(filterConditions);
    }

    if (processedIds.length > 0) {
      remainingQuery = remainingQuery.not('id', 'in', `(${processedIds.join(',')})`);
    }

    const { count: remainingCount } = await remainingQuery;

    return NextResponse.json({
      processedCount: posts.length,
      updatedCount,
      skippedCount: posts.length - updatedCount,
      remaining: remainingCount || 0,
      errors,
    });
  } catch (error) {
    console.error('Auto-prioritize route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
