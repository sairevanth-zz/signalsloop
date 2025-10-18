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

    // Try to get current user from Authorization header first
    const authHeader =
      request.headers.get('authorization') ||
      request.headers.get('Authorization');

    let accessToken: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.slice('Bearer '.length).trim();
      console.log('🔐 Access token provided via Authorization header:', !!accessToken);
    }

    // Fall back to cookies if Authorization header not present
    if (!accessToken) {
      const cookieHeader = request.headers.get('cookie');
      
      console.log('🍪 Cookie header present:', !!cookieHeader);
      
      if (!cookieHeader) {
        console.log('❌ No cookie header found');
        return NextResponse.json({ isOwner: false, debug: 'no_cookie_header' }, { status: 200 });
      }

      // Try multiple cookie patterns for Supabase
      let authTokenMatch = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
      
      if (!authTokenMatch) {
        // Try alternative pattern
        authTokenMatch = cookieHeader.match(/sb-[^-]+-[^-]+-auth-token=([^;]+)/);
      }
      
      console.log('🔑 Auth token found in cookies:', !!authTokenMatch);
      
      if (!authTokenMatch) {
        console.log('❌ No auth token in cookies. Available cookies:', cookieHeader.split(';').map(c => c.trim().split('=')[0]));
        return NextResponse.json({ isOwner: false, debug: 'no_auth_token' }, { status: 200 });
      }

      try {
        const tokenString = authTokenMatch[1];
        console.log('📦 Raw token string length:', tokenString.length);
        
        const tokenData = JSON.parse(decodeURIComponent(tokenString));
        accessToken = tokenData?.access_token || tokenData || null;
      } catch (tokenParseError) {
        console.error('❌ Token parsing error:', tokenParseError);
        return NextResponse.json({ isOwner: false, debug: 'token_parse_error', error: String(tokenParseError) }, { status: 200 });
      }
    }

    if (!accessToken) {
      console.log('❌ No access token available after header/cookie checks');
      return NextResponse.json({ isOwner: false, debug: 'no_access_token' }, { status: 200 });
    }

    try {
      // Verify the JWT token and get user
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (userError || !user) {
        console.error('❌ Auth error:', userError);
        return NextResponse.json({ isOwner: false, debug: 'auth_failed', error: userError?.message }, { status: 200 });
      }

      console.log('✅ User authenticated:', user.id);

      // Check if user is the project owner
      const isOwner = project.owner_id === user.id;

      console.log('🔍 Owner check result:', {
        projectId: project.id,
        projectOwnerId: project.owner_id,
        userId: user.id,
        userEmail: user.email,
        isOwner
      });

      return NextResponse.json({ 
        isOwner,
        projectId: project.id,
        userId: user.id,
        userEmail: user.email,
        debug: 'success'
      });
    } catch (authError) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json({ isOwner: false, debug: 'auth_exception', error: String(authError) }, { status: 200 });
    }

  } catch (error) {
    console.error('Project owner check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
