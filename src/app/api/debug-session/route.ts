import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Missing Supabase environment variables'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get session from cookies
    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie');
    
    // Try to get session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    return NextResponse.json({
      session: session ? {
        user: {
          id: session.user.id,
          email: session.user.email,
          created_at: session.user.created_at
        },
        expires_at: session.expires_at
      } : null,
      error: error?.message || null,
      headers: {
        authorization: authHeader,
        cookie: cookieHeader ? 'Present' : 'Missing'
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
