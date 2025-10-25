import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Get the authenticated user (if any)
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader) {
      const bearerToken = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(bearerToken);

      if (!authError && user) {
        userId = user.id;
      }
    }

    // Find the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select(`
        *,
        projects (
          id,
          name,
          slug
        )
      `)
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `This invitation has already been ${invitation.status}` },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      // Mark as expired
      await supabase
        .from('team_invitations')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', invitation.id);

      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      );
    }

    // If user is not authenticated, return invitation details for sign up
    if (!userId) {
      return NextResponse.json({
        requiresAuth: true,
        invitation: {
          email: invitation.email,
          projectName: invitation.projects?.name,
          projectSlug: invitation.projects?.slug,
          role: invitation.role,
        },
      });
    }

    // Get user's email to verify it matches the invitation
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email matches
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('project_id', invitation.project_id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      // Mark invitation as accepted even though they're already a member
      await supabase
        .from('team_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      return NextResponse.json({
        success: true,
        alreadyMember: true,
        projectSlug: invitation.projects?.slug,
      });
    }

    // Add user as a member
    const { error: memberError } = await supabase
      .from('members')
      .insert({
        project_id: invitation.project_id,
        user_id: userId,
        role: invitation.role,
      });

    if (memberError) {
      console.error('Error adding member:', memberError);
      return NextResponse.json(
        { error: 'Failed to add you as a team member' },
        { status: 500 }
      );
    }

    // Mark invitation as accepted
    await supabase
      .from('team_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    return NextResponse.json({
      success: true,
      projectSlug: invitation.projects?.slug,
      projectName: invitation.projects?.name,
      role: invitation.role,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to view invitation details without accepting
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Find the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select(`
        email,
        role,
        status,
        expires_at,
        projects (
          name,
          slug
        )
      `)
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    const expiresAt = new Date(invitation.expires_at);
    const isExpired = expiresAt < new Date();

    if (isExpired && invitation.status === 'pending') {
      // Mark as expired
      await supabase
        .from('team_invitations')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('token', token);
    }

    return NextResponse.json({
      email: invitation.email,
      projectName: invitation.projects?.name,
      projectSlug: invitation.projects?.slug,
      role: invitation.role,
      status: isExpired ? 'expired' : invitation.status,
      expiresAt: invitation.expires_at,
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
