import { NextResponse } from 'next/server';
import { secureAPI, validateAdminAuth } from '@/lib/api-security';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export const GET = secureAPI(
  async () => {
    try {
    const supabase = getSupabaseServiceRoleClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    // Get all projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json({ error: 'Failed to fetch projects', details: projectsError.message }, { status: 500 });
    }

    // Get all users to map owner emails
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    
    const userEmailMap: Record<string, string> = {};
    if (!usersError && usersData) {
      usersData.users.forEach(user => {
        userEmailMap[user.id] = user.email || 'Unknown';
      });
    }

    // Get posts count for each project
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('project_id');

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      // Don't fail if posts fetch fails, just log it
    }

    // Calculate posts count per project
    const postsCountByProject = (postsData || []).reduce((acc, post) => {
      acc[post.project_id] = (acc[post.project_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Transform projects data
    const projectsWithStats = (projects || []).map(project => ({
      ...project,
      owner_email: userEmailMap[project.owner_id] || 'Unknown',
      posts_count: postsCountByProject[project.id] || 0
    }));

    return NextResponse.json({ projects: projectsWithStats });
    } catch (error) {
      console.error('Admin API error:', error);
      return NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
  }
);
