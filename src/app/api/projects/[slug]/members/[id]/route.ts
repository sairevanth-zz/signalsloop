import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const { slug, id } = params;

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

    // Check if current user is the owner or admin member
    const isOwner = project.owner_id === user.id;
    let isAdmin = false;

    if (!isOwner) {
      const { data: memberData } = await supabase
        .from('members')
        .select('role')
        .eq('project_id', project.id)
        .eq('user_id', user.id)
        .single();

      isAdmin = memberData?.role === 'admin';
    }

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Only project owners and admins can remove team members' },
        { status: 403 }
      );
    }

    // Get the member to remove
    const { data: member, error: memberFetchError } = await supabase
      .from('members')
      .select('user_id, role')
      .eq('id', id)
      .eq('project_id', project.id)
      .single();

    if (memberFetchError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Prevent removing the owner
    if (member.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove the project owner' },
        { status: 403 }
      );
    }

    // Remove the member
    const { error: deleteError } = await supabase
      .from('members')
      .delete()
      .eq('id', id)
      .eq('project_id', project.id);

    if (deleteError) {
      console.error('Error removing member:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove team member' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
