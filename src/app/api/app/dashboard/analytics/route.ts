

import { NextResponse } from 'next/server';
import { secureAPI, validateAuth } from '@/lib/api-security';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export const GET = secureAPI(
  async ({ user }) => {
    const supabase = getSupabaseServiceRoleClient();

    if (!supabase || !user) {
      return NextResponse.json(
        { error: 'Unable to load analytics' },
        { status: 500 }
      );
    }

    // 1. Load owned projects
    const { data: ownedProjects, error: ownedError } = await supabase
      .from('projects')
      .select('id, name, slug, plan, created_at')
      .eq('owner_id', user.id);

    if (ownedError) {
      console.error('Analytics: failed to load owned projects', ownedError);
      return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
    }

    // 2. Load member projects
    const { data: membershipData, error: membershipError } = await supabase
      .from('members')
      .select('projects(id, name, slug, plan, created_at)')
      .eq('user_id', user.id);

    if (membershipError) {
      console.error('Analytics: failed to load membership projects', membershipError);
      return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
    }

    const projectsMap = new Map<string, {
      id: string;
      name: string;
      slug: string;
      plan: string;
      created_at: string;
    }>();

    (ownedProjects || []).forEach(project => {
      projectsMap.set(project.id, project);
    });

    (membershipData || []).forEach(entry => {
      if (entry.projects) {
        projectsMap.set(entry.projects.id, entry.projects);
      }
    });

    const projects = Array.from(projectsMap.values());

    if (projects.length === 0) {
      return NextResponse.json({
        analytics: {
          totalProjects: 0,
          totalPosts: 0,
          totalVotes: 0,
          activeWidgets: 0,
          weeklyGrowth: 0,
          topPosts: [],
          recentActivity: []
        }
      });
    }

    const projectIds = projects.map(project => project.id);

    // Posts for these projects
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, project_id, title, created_at, vote_count')
      .in('project_id', projectIds);

    if (postsError) {
      console.error('Analytics: failed to load posts', postsError);
    }

    const postIds = (posts || []).map(post => post.id);

    // Votes for these posts
    const { data: votes, error: votesError } = postIds.length > 0
      ? await supabase
          .from('votes')
          .select('id, post_id, created_at')
          .in('post_id', postIds)
      : { data: [], error: null };

    if (votesError) {
      console.error('Analytics: failed to load votes', votesError);
    }

    // Active API keys (widget usage)
    const { data: apiKeys, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('project_id, is_active, usage_count, last_used')
      .in('project_id', projectIds);

    if (apiKeyError) {
      console.error('Analytics: failed to load API keys', apiKeyError);
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    // Aggregate counts
    const votesByPost = new Map<string, number>();
    (votes || []).forEach(vote => {
      votesByPost.set(vote.post_id, (votesByPost.get(vote.post_id) || 0) + 1);
    });

    const postsById = new Map(posts?.map(post => [post.id, post]));
    const projectNames = new Map(projects.map(project => [project.id, project.name]));

    // Top posts (all time by votes)
    const topPostsAllTime = Array.from(votesByPost.entries())
      .map(([postId, count]) => {
        const post = postsById.get(postId);
        if (!post) return null;
        return {
          id: post.id,
          title: post.title,
          votes: count,
          project: projectNames.get(post.project_id) || 'Unknown',
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b!.votes - a!.votes))
      .slice(0, 3) as Array<{
        id: string;
        title: string;
        votes: number;
        project: string;
      }>;

    // Fallback: if no votes, use most recent posts
    const topPosts = topPostsAllTime.length > 0
      ? topPostsAllTime
      : (posts || [])
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 3)
          .map(post => ({
            id: post.id,
            title: post.title,
            votes: post.vote_count || 0,
            project: projectNames.get(post.project_id) || 'Unknown',
          }));

    // Recent activity (posts + votes from last 7 days)
    const recentPosts = (posts || []).filter(post => new Date(post.created_at) >= weekAgo);
    const recentVotes = (votes || []).filter(vote => new Date(vote.created_at) >= weekAgo);

    const twoWeeksAgo = new Date(weekAgo.getTime() - (7 * 24 * 60 * 60 * 1000));
    const previousWeekPosts = (posts || []).filter(post => {
      const created = new Date(post.created_at);
      return created < weekAgo && created >= twoWeeksAgo;
    });

    const recentActivity = [
      ...recentPosts.map(post => ({
        id: `post-${post.id}`,
        type: 'post' as const,
        message: `New feedback submitted: "${post.title}"`,
        timestamp: post.created_at,
        project: projectNames.get(post.project_id) || 'Unknown',
      })),
      ...recentVotes.map(vote => {
        const post = postsById.get(vote.post_id);
        return {
          id: `vote-${vote.id}`,
          type: 'vote' as const,
          message: post ? `Vote added to "${post.title}"` : 'Vote recorded',
          timestamp: vote.created_at,
          project: post ? (projectNames.get(post.project_id) || 'Unknown') : 'Unknown',
        };
      }),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    // Active widgets
    const activeWidgetProjects = new Set<string>();
    (apiKeys || []).forEach(key => {
      if (!key.is_active) return;
      if (!key.project_id) return;
      if (key.usage_count && key.usage_count > 0) {
        activeWidgetProjects.add(key.project_id);
        return;
      }
      if (key.last_used) {
        activeWidgetProjects.add(key.project_id);
      }
    });

    const activeWidgets = activeWidgetProjects.size;

    const weeklyGrowth = previousWeekPosts.length > 0
      ? Math.round(((recentPosts.length - previousWeekPosts.length) / previousWeekPosts.length) * 100)
      : recentPosts.length > 0 ? 100 : 0;

    const analytics = {
      totalProjects: projects.length,
      totalPosts: posts?.length || 0,
      totalVotes: votes?.length || 0,
      activeWidgets,
      weeklyGrowth,
      topPosts,
      recentActivity,
    };

    return NextResponse.json({ analytics });
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAuth,
  }
);
