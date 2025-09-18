import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app';
  const error = searchParams.get('error');

  // Debug logging
  console.log('Auth callback received:', {
    url: request.url,
    origin,
    code: code ? `${code.substring(0, 10)}...` : 'none',
    error,
    searchParams: Object.fromEntries(searchParams.entries())
  });

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(`${origin}/login?error=oauth_error&details=${error}`);
  }

  if (code) {
    // Use anon key for auth operations
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    // Use service key for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    try {
      console.log('Exchanging code for session:', code.substring(0, 10) + '...');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
      }

      if (data.user) {
        console.log('User authenticated:', data.user.email);
        console.log('User metadata:', data.user.user_metadata);
        console.log('User created at:', data.user.created_at);
        
        // Check if this is a new user (created_at is very recent)
        const userCreatedAt = new Date(data.user.created_at);
        const isNewUser = (Date.now() - userCreatedAt.getTime()) < 60000; // Within last minute
        
        console.log('Is new user:', isNewUser, 'Time difference:', Date.now() - userCreatedAt.getTime());
        
        // Let Supabase triggers handle user record creation automatically
        // We'll just check if the user record exists for logging purposes
        try {
          const { data: userRecord, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (userError && userError.code !== 'PGRST116') {
            console.log('User record check error (this might be normal for new users):', userError.message);
          } else if (userRecord) {
            console.log('User record exists:', userRecord.email);
          } else {
            console.log('User record does not exist yet (trigger should create it)');
          }
        } catch (error) {
          console.log('Error checking user record:', error);
        }

        // For new users, redirect to welcome page first
        if (isNewUser) {
          console.log('New user detected, redirecting to welcome page');
          return NextResponse.redirect(`${origin}/welcome`);
        }
      }

      // Redirect to the intended destination or dashboard
      console.log('Redirecting to:', `${origin}${next}`);
      return NextResponse.redirect(`${origin}${next}`);
    } catch (error) {
      console.error('Unexpected error in auth callback:', error);
      return NextResponse.redirect(`${origin}/login?error=unexpected_error`);
    }
  }

  // Return the user to an error page with instructions
  console.error('No code provided in callback URL');
  return NextResponse.redirect(`${origin}/login?error=no_code_provided`);
}
