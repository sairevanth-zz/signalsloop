import { NextResponse } from 'next/server';

/**
 * Security Headers Configuration
 * Implements comprehensive security headers including CSP, HSTS, XSS protection, etc.
 */

export interface SecurityHeadersConfig {
  enableCSP?: boolean;
  enableHSTS?: boolean;
  enableXSSProtection?: boolean;
  enableFrameGuard?: boolean;
  enableNoSniff?: boolean;
}

/**
 * Get Content Security Policy header value
 */
export function getCSPHeader(): string {
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://js.stripe.com https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.openai.com https://api.stripe.com https://vitals.vercel-insights.com https://*.posthog.com wss://*.supabase.co wss://*.supabase.in",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  return cspDirectives.join('; ');
}

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = {}
): NextResponse {
  const {
    enableCSP = true,
    enableHSTS = true,
    enableXSSProtection = true,
    enableFrameGuard = true,
    enableNoSniff = true,
  } = config;

  // Content Security Policy
  if (enableCSP) {
    response.headers.set('Content-Security-Policy', getCSPHeader());
  }

  // HTTP Strict Transport Security (HSTS)
  if (enableHSTS) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // X-XSS-Protection (legacy browsers)
  if (enableXSSProtection) {
    response.headers.set('X-XSS-Protection', '1; mode=block');
  }

  // X-Frame-Options (clickjacking protection)
  if (enableFrameGuard) {
    response.headers.set('X-Frame-Options', 'DENY');
  }

  // X-Content-Type-Options (MIME sniffing protection)
  if (enableNoSniff) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
  }

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (formerly Feature Policy)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // X-DNS-Prefetch-Control
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  // X-Download-Options (IE8+)
  response.headers.set('X-Download-Options', 'noopen');

  // X-Permitted-Cross-Domain-Policies
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  return response;
}

/**
 * Create security headers object for Next.js config
 */
export function getSecurityHeadersConfig() {
  return [
    {
      key: 'Content-Security-Policy',
      value: getCSPHeader(),
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains; preload',
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
    {
      key: 'X-DNS-Prefetch-Control',
      value: 'on',
    },
    {
      key: 'X-Download-Options',
      value: 'noopen',
    },
    {
      key: 'X-Permitted-Cross-Domain-Policies',
      value: 'none',
    },
  ];
}
