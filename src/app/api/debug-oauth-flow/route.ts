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
    
    // Get all URL parameters
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    
    // Check for auth-related parameters
    const authParams = Object.keys(searchParams).filter(key => 
      key.includes('access_token') || 
      key.includes('refresh_token') || 
      key.includes('expires_in') ||
      key.includes('token_type') ||
      key.includes('code') ||
      key.includes('state') ||
      key.includes('error') ||
      key.includes('error_description')
    );
    
    // Try to get session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // Check if there are any auth-related parameters in the URL
    const authParamsData = authParams.reduce((acc, key) => {
      acc[key] = searchParams[key];
      return acc;
    }, {} as Record<string, string>);
    
    // Test OAuth URL generation
    const testRedirectUrl = `${request.nextUrl.origin}/app`;
    const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: testRedirectUrl
      }
    });

    return NextResponse.json({
      currentUrl: request.url,
      origin: request.nextUrl.origin,
      searchParams,
      authParams: authParamsData,
      session: session ? {
        user: {
          id: session.user.id,
          email: session.user.email,
          created_at: session.user.created_at
        },
        expires_at: session.expires_at
      } : null,
      sessionError: error?.message || null,
      oauthTest: {
        redirectUrl: testRedirectUrl,
        oauthUrl: oauthData?.url || null,
        error: oauthError?.message || null
      },
      headers: {
        authorization: request.headers.get('authorization'),
        cookie: request.headers.get('cookie') ? 'Present' : 'Missing',
        referer: request.headers.get('referer'),
        userAgent: request.headers.get('user-agent')
      },
      environment: {
        supabaseUrl: supabaseUrl ? 'Set' : 'Missing',
        supabaseKey: supabaseKey ? 'Set' : 'Missing',
        nodeEnv: process.env.NODE_ENV
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to debug OAuth flow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
