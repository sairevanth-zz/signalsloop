import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    // Get all projects with user info
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        users!projects_owner_id_fkey(email)
      `)
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    // Get posts count for each project
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('project_id');

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Calculate posts count per project
    const postsCountByProject = postsData.reduce((acc, post) => {
      acc[post.project_id] = (acc[post.project_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Transform projects data
    const projectsWithStats = projects.map(project => ({
      ...project,
      owner_email: project.users?.email || 'Unknown',
      posts_count: postsCountByProject[project.id] || 0
    }));

    return NextResponse.json({ projects: projectsWithStats });
  } catch (error) {
    console.error('Admin projects API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { projectId, action, plan } = await request.json();
    
    if (!projectId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();

    if (action === 'update_plan') {
      if (!plan || !['free', 'pro'].includes(plan)) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
      }

      const { error: updateError } = await supabase
        .from('projects')
        .update({ 
          plan,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (updateError) {
        console.error('Error updating project plan:', updateError);
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `Project plan updated to ${plan}` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin project update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
