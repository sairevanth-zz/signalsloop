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
    } catch (error) {
      console.error('Supabase middleware error:', error);
    }
  } else if (!supabaseEnvWarningLogged) {
    console.warn('Supabase environment variables are missing; SSR auth disabled in middleware.');
    supabaseEnvWarningLogged = true;
  }

  const finalize = (response: NextResponse) => applySecurityHeaders(applySupabaseCookies(response));

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
      return applySecurityHeaders(response);
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
     * - favicon.ico (favicon file)
     * - robots.txt (robots file)
     * - sitemap.xml (sitemap file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
