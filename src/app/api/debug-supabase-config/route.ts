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

    // Test basic connection
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    // Test OAuth providers (this might not work with anon key, but let's try)
    let providersError = null;
    try {
      // This might fail with anon key, but let's see what error we get
      const { data: providersData, error: providersErr } = await supabase.auth.getOAuthProviders();
      if (providersErr) {
        providersError = providersErr.message;
      }
    } catch (e) {
      providersError = e instanceof Error ? e.message : 'Unknown error';
    }

    return NextResponse.json({
      environment: {
        supabaseUrl: supabaseUrl ? 'Set' : 'Missing',
        supabaseKey: supabaseKey ? 'Set' : 'Missing',
        googleClientId: googleClientId ? 'Set' : 'Missing'
      },
      connection: {
        sessionError: sessionError?.message || 'No session error',
        providersError: providersError || 'No providers error'
      },
      recommendations: [
        '1. Check Supabase Dashboard > Authentication > Providers > Google',
        '2. Verify Google Client ID matches: ' + (googleClientId || 'NOT SET'),
        '3. Check Authorized Redirect URIs in Google Cloud Console',
        '4. Ensure redirect URI includes: ' + (request.nextUrl.origin + '/auth/callback'),
        '5. Check if Google provider is enabled in Supabase'
      ],
      redirectUri: request.nextUrl.origin + '/auth/callback'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to test Supabase configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
