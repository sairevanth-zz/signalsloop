import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app';
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(`${origin}/login?error=oauth_error&details=${error}`);
  }

  if (code) {
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
        
        // The trigger should automatically handle user creation
        // But let's check if the user record exists and update if needed
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error checking user record:', userError);
        }

        // If user record doesn't exist, create it manually
        if (!userRecord && data.user.email) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
              avatar_url: data.user.user_metadata?.avatar_url || '',
              google_id: data.user.user_metadata?.provider_id || data.user.id,
              provider: 'google'
            });

          if (insertError) {
            console.error('Error creating user record:', insertError);
          } else {
            console.log('User record created:', data.user.email);
          }
        } else if (userRecord) {
          // Update existing user record with latest Google data
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              full_name: data.user.user_metadata?.full_name || userRecord.full_name,
              avatar_url: data.user.user_metadata?.avatar_url || userRecord.avatar_url,
              google_id: data.user.user_metadata?.provider_id || data.user.id,
              provider: 'google'
            })
            .eq('id', data.user.id);

          if (updateError) {
            console.error('Error updating user record:', updateError);
          } else {
            console.log('User record updated:', data.user.email);
          }
        }
      }

      // Redirect to the intended destination or dashboard
      return NextResponse.redirect(`${origin}${next}`);
    } catch (error) {
      console.error('Unexpected error in auth callback:', error);
      return NextResponse.redirect(`${origin}/login?error=unexpected_error`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=no_code_provided`);
}
