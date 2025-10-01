import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || '30'; // days

    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get users data
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*');

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    // Get posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*');

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Get comments
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*');

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    // Calculate analytics
    const allUsers = usersData.users || [];
    const allProjects = projects || [];
    const allPosts = posts || [];
    const allComments = comments || [];

    // Filter by date range
    const recentUsers = allUsers.filter(u => new Date(u.created_at) >= startDate);
    const recentProjects = allProjects.filter(p => new Date(p.created_at) >= startDate);
    const recentPosts = allPosts.filter(p => new Date(p.created_at) >= startDate);
    const recentComments = allComments.filter(c => new Date(c.created_at) >= startDate);

    // Calculate growth rates
    const calculateGrowthRate = (recent: number, total: number) => {
      if (total === 0) return 0;
      return Math.round((recent / total) * 100);
    };

    // Pro conversion
    const proProjects = allProjects.filter(p => p.plan === 'pro');
    const uniqueProOwners = new Set(proProjects.map(p => p.owner_id));
    const conversionRate = allUsers.length > 0 ? Math.round((uniqueProOwners.size / allUsers.length) * 100) : 0;

    // Posts by status
    const postsByStatus = allPosts.reduce((acc, post) => {
      acc[post.status] = (acc[post.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Time series data (daily counts for the range)
    const timeSeries = [];
    for (let i = daysAgo - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      timeSeries.push({
        date: date.toISOString().split('T')[0],
        users: allUsers.filter(u => {
          const created = new Date(u.created_at);
          return created >= date && created < nextDate;
        }).length,
        projects: allProjects.filter(p => {
          const created = new Date(p.created_at);
          return created >= date && created < nextDate;
        }).length,
        posts: allPosts.filter(p => {
          const created = new Date(p.created_at);
          return created >= date && created < nextDate;
        }).length,
      });
    }

    const analytics = {
      overview: {
        totalUsers: allUsers.length,
        totalProjects: allProjects.length,
        totalPosts: allPosts.length,
        totalComments: allComments.length,
        proProjects: proProjects.length,
        freeProjects: allProjects.length - proProjects.length,
        conversionRate,
      },
      growth: {
        newUsers: recentUsers.length,
        newProjects: recentProjects.length,
        newPosts: recentPosts.length,
        newComments: recentComments.length,
        userGrowthRate: calculateGrowthRate(recentUsers.length, allUsers.length),
        projectGrowthRate: calculateGrowthRate(recentProjects.length, allProjects.length),
      },
      postsByStatus,
      timeSeries,
      topProjects: allProjects
        .map(p => {
          const projectPosts = allPosts.filter(post => post.project_id === p.id);
          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            plan: p.plan,
            postsCount: projectPosts.length,
            commentsCount: allComments.filter(c => projectPosts.some(post => post.id === c.post_id)).length,
          };
        })
        .sort((a, b) => b.postsCount - a.postsCount)
        .slice(0, 10),
    };

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Admin analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

