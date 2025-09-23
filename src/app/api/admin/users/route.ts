import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    // Get all users from auth.users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
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
    console.error('Admin users API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, action, plan } = await request.json();
    
    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();

    if (action === 'upgrade_to_pro') {
      // Update all user's projects to pro
      const { error: updateError } = await supabase
        .from('projects')
        .update({ plan: 'pro', updated_at: new Date().toISOString() })
        .eq('owner_id', userId);

      if (updateError) {
        console.error('Error upgrading user projects:', updateError);
        return NextResponse.json({ error: 'Failed to upgrade user' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'User upgraded to Pro successfully' });
    }

    if (action === 'downgrade_to_free') {
      // Update all user's projects to free
      const { error: updateError } = await supabase
        .from('projects')
        .update({ 
          plan: 'free', 
          subscription_status: 'canceled',
          updated_at: new Date().toISOString() 
        })
        .eq('owner_id', userId);

      if (updateError) {
        console.error('Error downgrading user projects:', updateError);
        return NextResponse.json({ error: 'Failed to downgrade user' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'User downgraded to Free successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
