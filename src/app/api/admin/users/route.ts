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
      console.error('Supabase client not available');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    // Get all users from auth.users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users', details: usersError.message }, { status: 500 });
    }

    // Get all projects to calculate project counts
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('owner_id, plan');

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    // Transform users data with project counts and plan info
    const usersWithStats = users.users.map(user => {
      const userProjects = projects.filter(p => p.owner_id === user.id);
      const proProjects = userProjects.filter(p => p.plan === 'pro').length;
      const freeProjects = userProjects.filter(p => p.plan === 'free').length;
      
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        projects_count: userProjects.length,
        pro_projects: proProjects,
        free_projects: freeProjects,
        has_pro_subscription: proProjects > 0
      };
    });

    return NextResponse.json({ users: usersWithStats });
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
