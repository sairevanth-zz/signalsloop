import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // Handle code-based auth flow
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    
    try {
      console.log('🔄 Exchanging code for session...');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('❌ Auth callback error:', error);
        return NextResponse.redirect(new URL('/login?error=auth_callback_error', request.url));
      }
      
      console.log('✅ Auth successful:', {
        user: data.user?.email,
        session: !!data.session
      });
      
      // Successful authentication - redirect to app
      return NextResponse.redirect(new URL('/app', request.url));
    } catch (error) {
      console.error('❌ Auth callback exception:', error);
      return NextResponse.redirect(new URL('/login?error=auth_callback_exception', request.url));
    }
  }

  // No code parameter - redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
}
