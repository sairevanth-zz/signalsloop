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
    const { email, role } = body;

    // Validate input
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['member', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "member" or "admin"' },
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

    // Check if current user is the owner
    if (project.owner_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Only project owners can invite team members' },
        { status: 403 }
      );
    }

    // Find user by email in auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error listing users:', authError);
      return NextResponse.json(
        { error: 'Failed to find user' },
        { status: 500 }
      );
    }

    const invitedUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!invitedUser) {
      return NextResponse.json(
        { error: 'User with this email does not exist. They must create an account first.' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('project_id', project.id)
      .eq('user_id', invitedUser.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a team member' },
        { status: 400 }
      );
    }

    // Add the member
    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .insert({
        project_id: project.id,
        user_id: invitedUser.id,
        role: role,
      })
      .select()
      .single();

    if (memberError) {
      console.error('Error adding member:', memberError);
      return NextResponse.json(
        { error: 'Failed to add team member' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      member: newMember,
    });
  } catch (error) {
    console.error('Error inviting team member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
