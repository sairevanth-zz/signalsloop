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

    // Transform projects data
    const projectsWithOwners = (projects || []).map(project => ({
      ...project,
      owner_email: userEmailMap[project.owner_id] || 'Unknown',
    }));

    // Separate Pro and Free projects
    const proProjects = projectsWithOwners.filter(p => p.plan === 'pro');
    const freeProjects = projectsWithOwners.filter(p => p.plan === 'free');

    return NextResponse.json({ 
      projects: projectsWithOwners,
      proProjects,
      freeProjects,
      stats: {
        totalProjects: projectsWithOwners.length,
        proCount: proProjects.length,
        freeCount: freeProjects.length,
      }
    });
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
