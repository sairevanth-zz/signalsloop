import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // Handle code-based auth flow
    const supabase = createRouteHandlerClient({ cookies });
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(new URL('/login?error=auth_callback_error', request.url));
      }
      
      // Successful authentication - redirect to app
      return NextResponse.redirect(new URL('/app', request.url));
    } catch (error) {
      console.error('Auth callback exception:', error);
      return NextResponse.redirect(new URL('/login?error=auth_callback_exception', request.url));
    }
  }

  // No code parameter - redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
}
