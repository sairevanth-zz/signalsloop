import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PATCH(request: NextRequest) {
  try {
    console.log('🔄 API: Starting status update...');
    
    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    console.log('🔄 API: Supabase client created');

    const { postId, newStatus, projectId } = await request.json();
    
    console.log('🔄 API: Status update request:', { postId, newStatus, projectId });

    if (!postId || !newStatus || !projectId) {
      console.log('🔄 API: Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['open', 'planned', 'in_progress', 'done'];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get current user from Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('🔄 API: Auth header check:', { hasAuthHeader: !!authHeader });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔄 API: No valid auth header');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔄 API: Token extracted, verifying user...');
    
    // Create a timeout promise to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('User verification timeout')), 5000)
    );
    
    // Verify the JWT token and get user with timeout
    const userPromise = supabase.auth.getUser(token);
    const { data: { user }, error: userError } = await Promise.race([userPromise, timeoutPromise]) as any;
    
    console.log('🔄 API: User verification:', { hasUser: !!user, userEmail: user?.email, error: userError?.message });
    
    if (userError || !user) {
      console.log('🔄 API: Invalid token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify user owns the project
    console.log('🔄 API: Checking project ownership...');
    
    const projectTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Project check timeout')), 5000)
    );
    
    const projectPromise = supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();
    
    const { data: project, error: projectError } = await Promise.race([projectPromise, projectTimeoutPromise]) as any;

    console.log('🔄 API: Project check:', { hasProject: !!project, projectOwnerId: project?.owner_id, userId: user.id, error: projectError?.message });

    if (projectError || !project || project.owner_id !== user.id) {
      console.log('🔄 API: Project not found or access denied');
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Update the post status
    console.log('🔄 API: Updating post status...');
    
    const updateTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Update timeout')), 5000)
    );
    
    const updatePromise = supabase
      .from('posts')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .eq('project_id', projectId);
    
    const { error: updateError } = await Promise.race([updatePromise, updateTimeoutPromise]) as any;

    if (updateError) {
      console.error('🔄 API: Error updating post status:', updateError);
      return NextResponse.json({ error: 'Failed to update post status' }, { status: 500 });
    }

    console.log('🔄 API: Post status updated successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Post status updated successfully' 
    });

  } catch (error) {
    console.error('Update post status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
