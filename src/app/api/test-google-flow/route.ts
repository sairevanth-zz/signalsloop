import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Missing Supabase environment variables',
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey,
        googleClientId: !!googleClientId
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test the OAuth URL generation
    const redirectUrl = `${request.nextUrl.origin}/api/auth-handler`;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) {
      return NextResponse.json({
        error: 'OAuth initiation failed',
        message: error.message,
        details: error
      });
    }

    return NextResponse.json({
      success: true,
      redirectUrl,
      oauthUrl: data.url,
      message: 'OAuth URL generated successfully'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to test Google OAuth flow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
