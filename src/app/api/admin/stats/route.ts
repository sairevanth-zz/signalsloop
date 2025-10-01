import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    // Get user stats
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get project stats
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('plan, created_at');

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    // Get posts stats
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('created_at, status');

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Get comments stats
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('created_at');

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    // Calculate stats
    const totalUsers = usersData.users.length;
    const totalProjects = projectsData.length;
    const totalPosts = postsData.length;
    const totalComments = commentsData.length;

    const proProjects = projectsData.filter(p => p.plan === 'pro').length;
    const freeProjects = totalProjects - proProjects;

    // Users with Pro projects
    const { data: proProjectOwners, error: proOwnersError } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('plan', 'pro');

    if (proOwnersError) {
      console.error('Error fetching pro project owners:', proOwnersError);
      return NextResponse.json({ error: 'Failed to fetch pro project owners' }, { status: 500 });
    }

    const uniqueProUsers = new Set(proProjectOwners.map(p => p.owner_id)).size;
    const freeUsers = totalUsers - uniqueProUsers;

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = usersData.users.filter(user => 
      new Date(user.created_at) > thirtyDaysAgo
    ).length;

    const recentProjects = projectsData.filter(project => 
      new Date(project.created_at) > thirtyDaysAgo
    ).length;

    const recentPosts = postsData.filter(post => 
      new Date(post.created_at) > thirtyDaysAgo
    ).length;

    // Posts by status
    const postsByStatus = postsData.reduce((acc, post) => {
      acc[post.status] = (acc[post.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stats = {
      overview: {
        totalUsers,
        totalProjects,
        totalPosts,
        totalComments,
        proUsers: uniqueProUsers,
        freeUsers,
        proProjects,
        freeProjects
      },
      recentActivity: {
        newUsers: recentUsers,
        newProjects: recentProjects,
        newPosts: recentPosts
      },
      postsByStatus: {
        open: postsByStatus.open || 0,
        planned: postsByStatus.planned || 0,
        in_progress: postsByStatus.in_progress || 0,
        done: postsByStatus.done || 0,
        declined: postsByStatus.declined || 0
      },
      conversion: {
        proUserPercentage: totalUsers > 0 ? Math.round((uniqueProUsers / totalUsers) * 100) : 0,
        proProjectPercentage: totalProjects > 0 ? Math.round((proProjects / totalProjects) * 100) : 0
      }
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
