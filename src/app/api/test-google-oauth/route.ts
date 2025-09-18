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
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to get the auth providers
    const { data: providers, error: providersError } = await supabase.auth.getSession();
    
    // Test OAuth URL generation
    const redirectUrl = `${request.nextUrl.origin}/auth/callback?next=/app`;
    
    return NextResponse.json({
      success: true,
      environment: {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey,
        hasGoogleClientId: !!googleClientId,
        supabaseUrl: supabaseUrl?.substring(0, 30) + '...',
        googleClientId: googleClientId?.substring(0, 20) + '...'
      },
      oauth: {
        redirectUrl,
        testUrl: `https://accounts.google.com/oauth/authorize?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=openid+email+profile&access_type=offline&prompt=consent`
      },
      supabase: {
        connected: !providersError,
        error: providersError?.message || null,
        hasSession: !!providers.session
      },
      recommendations: [
        '1. Verify Google provider is enabled in Supabase Dashboard',
        '2. Check Google Client ID and Client Secret are set in Supabase',
        '3. Ensure redirect URL matches: ' + redirectUrl,
        '4. Verify Google Cloud Console has correct redirect URIs',
        '5. Test the OAuth URL manually in browser'
      ]
    });

  } catch (error) {
    console.error('Google OAuth test error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: String(error)
    }, { status: 500 });
  }
}
