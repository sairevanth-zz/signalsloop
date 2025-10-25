import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const { slug } = params;
    const body = await request.json();
    const { userIds } = body;

    // Validate input
    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      );
    }

    // Get the current user from the session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('slug', slug)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if current user is a member or owner of the project
    const { data: membership } = await supabase
      .from('members')
      .select('id')
      .eq('project_id', project.id)
      .eq('user_id', session.user.id)
      .single();

    const isOwner = project.owner_id === session.user.id;

    if (!isOwner && !membership) {
      return NextResponse.json(
        { error: 'You must be a project member to view team information' },
        { status: 403 }
      );
    }

    // Fetch users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error listing users:', authError);
      return NextResponse.json(
        { error: 'Failed to fetch user emails' },
        { status: 500 }
      );
    }

    // Create a map of user ID to email
    const userEmails: Record<string, string> = {};
    authUsers.users.forEach(user => {
      if (userIds.includes(user.id)) {
        userEmails[user.id] = user.email || 'Unknown';
      }
    });

    return NextResponse.json({
      users: userEmails,
    });
  } catch (error) {
    console.error('Error fetching user emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
