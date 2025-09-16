import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/app';

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          },
        },
      }
    );

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
      }

      if (data.session && data.user) {
        // Create response with redirect
        const response = NextResponse.redirect(new URL(next, request.url));
        
        // Set the auth cookies in the response
        const { name: accessTokenName, value: accessTokenValue, options: accessTokenOptions } = 
          supabase.auth.getSession() as any;
        
        if (accessTokenName && accessTokenValue) {
          response.cookies.set(accessTokenName, accessTokenValue, accessTokenOptions);
        }

        return response;
      }
    } catch (error) {
      console.error('Auth callback exception:', error);
      return NextResponse.redirect(new URL('/login?error=authentication_failed', request.url));
    }
  }

  return NextResponse.redirect(new URL('/login', request.url));
}
