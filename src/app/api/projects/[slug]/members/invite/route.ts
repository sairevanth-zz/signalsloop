import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendTeamInvitationEmail } from '@/lib/email';
import crypto from 'crypto';

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

    // Get the authenticated user from the Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the project with name
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id, name, slug')
      .eq('slug', slug)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if current user is the owner
    if (project.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only project owners can invite team members' },
        { status: 403 }
      );
    }

    // Get inviter's name from auth metadata
    const inviterName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'A team member';

    // Find user by email in auth.users
    const { data: authUsers, error: listUsersError } = await supabase.auth.admin.listUsers();

    if (listUsersError) {
      console.error('Error listing users:', listUsersError);
      return NextResponse.json(
        { error: 'Failed to check user' },
        { status: 500 }
      );
    }

    const existingUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // If user exists, add them directly
    if (existingUser) {
      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('members')
        .select('id')
        .eq('project_id', project.id)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a team member' },
          { status: 400 }
        );
      }

      // Add the member directly
      const { data: newMember, error: memberError } = await supabase
        .from('members')
        .insert({
          project_id: project.id,
          user_id: existingUser.id,
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
        type: 'direct',
        member: newMember,
      });
    }

    // User doesn't exist, create invitation
    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('team_invitations')
      .select('id, status')
      .eq('project_id', project.id)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      );
    }

    // Generate unique invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');

    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .insert({
        project_id: project.id,
        email: email.toLowerCase(),
        role: role,
        token: invitationToken,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // Send invitation email
    try {
      await sendTeamInvitationEmail({
        inviteeEmail: email,
        inviterName: inviterName,
        projectName: project.name,
        projectSlug: project.slug,
        role: role as 'admin' | 'member',
        invitationToken: invitationToken,
        expiresAt: expiresAt,
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the request if email fails, invitation is still created
    }

    return NextResponse.json({
      success: true,
      type: 'invitation',
      invitation: invitation,
    });
  } catch (error) {
    console.error('Error inviting team member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
