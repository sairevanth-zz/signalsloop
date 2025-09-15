import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_error`);
      }

      // Successful authentication, redirect to app
      return NextResponse.redirect(`${requestUrl.origin}/app`);
    } catch (error) {
      console.error('Auth callback exception:', error);
      return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_exception`);
    }
  }

  // No code parameter, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/login?error=no_code`);
}
