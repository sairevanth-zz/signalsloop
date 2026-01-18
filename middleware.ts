/**
 * Next.js Middleware for Authentication and Security
 * 
 * IMPORTANT: This file runs in Edge Runtime. Only use Edge-compatible APIs.
 * Do NOT import modules that use Node.js-specific features like setInterval, fs, etc.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // List of protected route patterns that require authentication
  const protectedPaths = [
    '/experiments',
    '/settings',
    '/inbox',
    '/polls',
    '/specs',
    '/user-stories',
    '/ai-tools',
    '/churn',
    '/briefs',
    '/competitive',
    '/insights',
    '/anomaly',
    '/predictions',
    '/reasoning',
    '/advocate',
    '/mission-control',
    '/roadmap-admin',
    '/feedback',
    '/hunter',
  ];

  // Check if this is a protected [slug] route
  const pathParts = pathname.split('/');
  const isProtectedRoute = pathParts.length >= 3 &&
    protectedPaths.some(p => pathname.includes(p));

  // If it's a protected route, check authentication
  if (isProtectedRoute) {
    // Check for any Supabase auth cookies
    const cookies = request.cookies.getAll();
    const hasAuthCookie = cookies.some(c => c.name.startsWith('sb-'));

    if (!hasAuthCookie) {
      // No auth cookies - redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Validate the session with Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createServerClient(supabaseUrl, supabaseKey, {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll() {
              // We don't need to set cookies in this check
            },
          },
        });

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // Invalid session - redirect to login
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('redirect', pathname);
          return NextResponse.redirect(loginUrl);
        }
      } catch (error) {
        console.error('[Middleware] Auth error:', error);
        // On error, redirect to login for safety
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    } else {
      // No Supabase config - redirect to login as fallback
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Continue with the request
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - static files (favicon, robots, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
