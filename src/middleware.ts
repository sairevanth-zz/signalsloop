import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders } from '@/lib/security-headers';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host');
  const pathname = request.nextUrl.pathname;

  // Skip middleware for API routes, static files, and default domains
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
    return applySecurityHeaders(response);
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
      return applySecurityHeaders(response);
    } else if (pathname.startsWith('/board')) {
      // For board path on custom domains
      url.pathname = `/custom-domain-board`;
      url.searchParams.set('domain', host);
      const response = NextResponse.rewrite(url);
      return applySecurityHeaders(response);
    } else if (pathname.startsWith('/roadmap')) {
      // For roadmap path on custom domains
      url.pathname = `/custom-domain-roadmap`;
      url.searchParams.set('domain', host);
      const response = NextResponse.rewrite(url);
      return applySecurityHeaders(response);
    } else if (pathname.startsWith('/changelog')) {
      // For changelog path on custom domains
      url.pathname = `/custom-domain-changelog`;
      url.searchParams.set('domain', host);
      const response = NextResponse.rewrite(url);
      return applySecurityHeaders(response);
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
  return applySecurityHeaders(response);
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
