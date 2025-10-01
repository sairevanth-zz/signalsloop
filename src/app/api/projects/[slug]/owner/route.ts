import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    // Get the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('slug', slug)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get current user from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the JWT token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Invalid token:', userError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is the project owner
    const isOwner = project.owner_id === user.id;

    console.log('Owner check result:', {
      projectId: project.id,
      projectOwnerId: project.owner_id,
      userId: user.id,
      isOwner
    });

    return NextResponse.json({ 
      isOwner,
      projectId: project.id,
      userId: user.id
    });

  } catch (error) {
    console.error('Project owner check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
