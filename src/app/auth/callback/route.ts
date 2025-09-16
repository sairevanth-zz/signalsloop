import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/app';

  if (code) {
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
      console.log('🔄 Starting auth code exchange...');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('❌ Auth callback error:', error);
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
      }

      console.log('✅ Auth exchange successful:', {
        hasSession: !!data.session,
        hasUser: !!data.user,
        userId: data.user?.id,
        userEmail: data.user?.email,
        sessionExpires: data.session?.expires_at
      });

      if (data.session && data.user) {
        console.log('🔄 Redirecting to:', next);
        return NextResponse.redirect(new URL(next, request.url));
      } else {
        console.error('❌ No session or user after exchange');
        return NextResponse.redirect(new URL('/login?error=no_session', request.url));
      }
    } catch (error) {
      console.error('❌ Auth callback exception:', error);
      return NextResponse.redirect(new URL('/login?error=authentication_failed', request.url));
    }
  }

  return NextResponse.redirect(new URL('/login', request.url));
}
