import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

// GET - Fetch all subscriptions (Pro projects)
export async function GET(request: NextRequest) {
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
    console.error('Admin subscriptions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update subscription status
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const body = await request.json();
    const { projectId, action, plan } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    if (action === 'upgrade') {
      const { error } = await supabase
        .from('projects')
        .update({ plan: 'pro' })
        .eq('id', projectId);

      if (error) {
        console.error('Error upgrading project:', error);
        return NextResponse.json({ error: 'Failed to upgrade project' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Project upgraded to Pro' });
    }

    if (action === 'downgrade') {
      const { error } = await supabase
        .from('projects')
        .update({ plan: 'free' })
        .eq('id', projectId);

      if (error) {
        console.error('Error downgrading project:', error);
        return NextResponse.json({ error: 'Failed to downgrade project' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Project downgraded to Free' });
    }

    if (action === 'change_plan' && plan) {
      const { error } = await supabase
        .from('projects')
        .update({ plan })
        .eq('id', projectId);

      if (error) {
        console.error('Error changing plan:', error);
        return NextResponse.json({ error: 'Failed to change plan' }, { status: 500 });
      }

      return NextResponse.json({ message: `Plan changed to ${plan}` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin update subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

