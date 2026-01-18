import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr';
import { applySecurityHeaders } from '@/lib/security-headers';
import { applyRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

let supabaseEnvWarningLogged = false;

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host');
  const pathname = request.nextUrl.pathname;

  const supabaseCookies: CookieOptionsWithName[] = [];

  const applySupabaseCookies = (response: NextResponse) => {
    if (supabaseCookies.length === 0) {
      return response;
    }

    for (const { name, value, options } of supabaseCookies) {
      response.cookies.set({ name, value, ...options });
    }
    return response;
  };

  // List of public paths that don't require authentication
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/auth',
    '/pricing',
    '/features',
    '/about',
    '/support',
    '/terms',
    '/privacy',
    '/demo',
    '/board',       // Public boards are accessible
    '/roadmap',     // Public roadmaps are accessible  
    '/changelog',   // Public changelogs are accessible
    '/post',        // Individual posts are public
    '/widget-test',
    '/test-board',
    '/welcome',
    '/unsubscribe',
    '/solutions',
    '/embed',
  ];

  const finalize = (response: NextResponse) => applySecurityHeaders(applySupabaseCookies(response));

  // Check if the path is a protected [slug] route (dashboard routes)
  const isProtectedSlugRoute = (path: string) => {
    // Match pattern like /[slug]/experiments, /[slug]/settings, etc.
    const slugRoutePattern = /^\/[^\/]+\/(experiments|settings|inbox|polls|specs|user-stories|ai-tools|churn|briefs|competitive|insights|anomaly|predictions|reasoning|advocate|mission-control|roadmap-admin|feedback)/;
    return slugRoutePattern.test(path);
  };

  // Check if the current path requires authentication
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'));
  const needsAuth = isProtectedSlugRoute(pathname);

  // For protected routes, check authentication
  if (needsAuth) {
    // Quick check: if no Supabase cookies at all, redirect immediately
    const allCookies = request.cookies.getAll();
    const hasAnyCookies = allCookies.some(c => c.name.startsWith('sb-'));

    if (!hasAnyCookies) {
      // No Supabase cookies = definitely not authenticated
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Create Supabase client to verify the session
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
            cookies: {
              getAll() {
                return request.cookies.getAll();
              },
              setAll(cookies) {
                supabaseCookies.splice(0, supabaseCookies.length, ...cookies);
              },
            },
          }
        );

        // Get user - this validates the session
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // No valid user session - redirect to login
          console.log('[Middleware] No user session for protected route:', pathname);
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('redirect', pathname);
          return NextResponse.redirect(loginUrl);
        }

        // User is authenticated - continue
        console.log('[Middleware] User authenticated:', user.email);
      } catch (error) {
        // Auth error - redirect to login for safety
        console.error('[Middleware] Auth error:', error);
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    } else {
      // No Supabase env vars - redirect to login as fallback
      console.error('[Middleware] Missing Supabase env vars for auth check');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  } else {
    // For non-protected routes, just refresh the session if possible
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
            cookies: {
              getAll() {
                return request.cookies.getAll();
              },
              setAll(cookies) {
                supabaseCookies.splice(0, supabaseCookies.length, ...cookies);
              },
            },
          }
        );
        await supabase.auth.getUser();
      } catch {
        // Silently ignore for non-protected routes
      }
    }
  }

  // Apply rate limiting to all API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = await applyRateLimit(request, 'api');

    if (rateLimitResult && !rateLimitResult.success) {
      const headers = getRateLimitHeaders(rateLimitResult);

      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        },
        { status: 429, headers }
      );

      return finalize(response);
    }
  }

  // Skip custom domain logic for static files and default domains
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    !host ||
    host.includes('signalsloop.vercel.app') ||
    host.includes('signalsloop.com') ||
    host.includes('localhost') ||
    host.includes('127.0.0.1')
  ) {
    const response = NextResponse.next();
    return finalize(response);
  }

  // For custom domains, rewrite to the slug-based route
  try {
    // Create a new URL with the custom domain resolution
    const url = request.nextUrl.clone();

    // If it's a custom domain, we need to resolve it to the project slug
    // For now, we'll redirect to a special handler that will resolve the domain
    if (pathname === '/') {
      // For the root path on custom domains, redirect to board
      url.pathname = `/custom-domain-board`;
      url.searchParams.set('domain', host);
      const response = NextResponse.rewrite(url);
      return finalize(response);
    } else if (pathname.startsWith('/board')) {
      // For board path on custom domains
      url.pathname = `/custom-domain-board`;
      url.searchParams.set('domain', host);
      const response = NextResponse.rewrite(url);
      return finalize(response);
    } else if (pathname.startsWith('/roadmap')) {
      // For roadmap path on custom domains
      url.pathname = `/custom-domain-roadmap`;
      url.searchParams.set('domain', host);
      const response = NextResponse.rewrite(url);
      return finalize(response);
    } else if (pathname.startsWith('/changelog')) {
      // For changelog path on custom domains
      url.pathname = `/custom-domain-changelog`;
      url.searchParams.set('domain', host);
      const response = NextResponse.rewrite(url);
      return finalize(response);
    } else if (pathname.startsWith('/post/')) {
      // For individual post paths on custom domains
      const id = pathname.split('/post/')[1];
      url.pathname = `/custom-domain-post`;
      url.searchParams.set('domain', host);
      url.searchParams.set('id', id);
      const response = NextResponse.rewrite(url);
      return finalize(response);
    }
  } catch (error) {
    console.error('Middleware error:', error);
  }

  const response = NextResponse.next();
  return finalize(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
    // Explicitly match dashboard routes to ensure middleware runs
    '/:slug/experiments/:path*',
    '/:slug/settings/:path*',
    '/:slug/inbox/:path*',
    '/:slug/polls/:path*',
    '/:slug/specs/:path*',
    '/:slug/user-stories/:path*',
    '/:slug/ai-tools/:path*',
    '/:slug/churn/:path*',
    '/:slug/briefs/:path*',
    '/:slug/competitive/:path*',
    '/:slug/insights/:path*',
    '/:slug/anomaly/:path*',
    '/:slug/predictions/:path*',
    '/:slug/reasoning/:path*',
    '/:slug/advocate/:path*',
    '/:slug/mission-control/:path*',
  ],
};
