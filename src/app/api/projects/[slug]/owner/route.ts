import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
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

    // Get the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('slug', slug)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return NextResponse.json({ error: 'Project not found', isOwner: false }, { status: 200 });
    }

    // Try to get current user from cookies
    const cookieHeader = request.headers.get('cookie');
    
    if (!cookieHeader) {
      return NextResponse.json({ isOwner: false }, { status: 200 });
    }

    // Extract Supabase auth token from cookies
    const authTokenMatch = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
    
    if (!authTokenMatch) {
      return NextResponse.json({ isOwner: false }, { status: 200 });
    }

    try {
      const tokenData = JSON.parse(decodeURIComponent(authTokenMatch[1]));
      const accessToken = tokenData?.access_token || tokenData;
      
      // Verify the JWT token and get user
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (userError || !user) {
        return NextResponse.json({ isOwner: false }, { status: 200 });
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
    } catch (tokenError) {
      console.error('Token parsing error:', tokenError);
      return NextResponse.json({ isOwner: false }, { status: 200 });
    }

  } catch (error) {
    console.error('Project owner check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
