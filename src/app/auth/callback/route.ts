import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendFreeWelcomeEmail } from '@/lib/email';
import { ensureUserRecord } from '@/lib/users';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

        try {
          const serviceClient = getSupabaseServiceRoleClient();
          if (!serviceClient) {
            console.error('Service role client unavailable; skipping welcome email check');
          } else {
            try {
              const userRecord = await ensureUserRecord(serviceClient, data.user.id);

              if (userRecord.email && !userRecord.welcome_email_sent_at) {
                try {
                  await sendFreeWelcomeEmail({
                    email: userRecord.email,
                    name: userRecord.name,
                  });

                  await serviceClient
                    .from('users')
                    .update({ welcome_email_sent_at: new Date().toISOString() })
                    .eq('id', userRecord.id);

                  console.log('Free welcome email sent for user:', data.user.id);
                } catch (welcomeError) {
                  console.error('Failed to send free welcome email:', welcomeError);
                }
              } else if (!userRecord.email) {
                console.warn('User record missing email; cannot send welcome message');
              }
            } catch (recordError) {
              console.error('Failed to ensure user record before welcome email:', recordError);
            }
          }
        } catch (welcomeInitError) {
          console.error('Unexpected error during welcome email processing:', welcomeInitError);
        }
        
        // Check if this is a new user (created_at is very recent)
        const userCreatedAt = new Date(data.user.created_at);
        const isNewUser = (Date.now() - userCreatedAt.getTime()) < 60000; // Within last minute
        
        console.log('Is new user:', isNewUser, 'Time difference:', Date.now() - userCreatedAt.getTime());
        
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
