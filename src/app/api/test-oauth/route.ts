import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    if (!supabase) {
      return NextResponse.json({
        error: 'Supabase client not available',
        details: 'Missing environment variables'
      }, { status: 500 });
    }

    // Get the current environment info
    const env = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE,
      hasGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.substring(0, 20) + '...'
    };

    // Test basic Supabase connection
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    return NextResponse.json({
      success: true,
      environment: env,
      supabase: {
        connected: !authError,
        error: authError?.message || null
      },
      recommendations: [
        'Check that Google OAuth is enabled in Supabase Dashboard → Authentication → Providers',
        'Verify the Google Client ID and Client Secret are correctly set in Supabase',
        'Ensure the redirect URI in Google Cloud Console matches: https://your-domain.com/auth/callback',
        'Check that the Google Client ID environment variable is set correctly'
      ]
    });

  } catch (error) {
    console.error('OAuth test error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: String(error)
    }, { status: 500 });
  }
}
