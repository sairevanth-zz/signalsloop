import { NextRequest, NextResponse } from 'next/server';
import { doubleCsrf } from 'csrf-csrf';
import { serialize, parse } from 'cookie';

/**
 * CSRF Protection using csrf-csrf package
 * Implements Double Submit Cookie pattern
 */

const CSRF_SECRET = process.env.CSRF_SECRET || 'your-csrf-secret-change-this-in-production';
const CSRF_COOKIE_NAME = '__Host-csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Initialize CSRF protection
const {
  generateToken,
  validateRequest,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  cookieName: CSRF_COOKIE_NAME,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

/**
 * Generate CSRF token for a request
 */
export async function generateCSRFToken(request: NextRequest): Promise<{ token: string; cookie: string }> {
  const cookies = request.headers.get('cookie') || '';
  const parsedCookies = parse(cookies);

  // Generate token
  const token = generateToken({}, parsedCookies[CSRF_COOKIE_NAME]);

  // Create cookie
  const cookie = serialize(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return { token, cookie };
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Skip validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

  try {
    const cookies = request.headers.get('cookie') || '';
    const parsedCookies = parse(cookies);
    const csrfToken = request.headers.get(CSRF_HEADER_NAME) || '';

    if (!csrfToken) {
      return false;
    }

    // Validate token matches cookie
    return csrfToken === parsedCookies[CSRF_COOKIE_NAME];
  } catch (error) {
    console.error('CSRF validation error:', error);
    return false;
  }
}

/**
 * Middleware wrapper for CSRF protection
 */
export async function withCSRFProtection(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return handler(request);
  }

  // Validate CSRF token
  const isValid = await validateCSRFToken(request);

  if (!isValid) {
    return NextResponse.json(
      {
        error: 'CSRF token validation failed',
        message: 'Invalid or missing CSRF token'
      },
      { status: 403 }
    );
  }

  return handler(request);
}

/**
 * API route to get CSRF token
 */
export async function getCSRFTokenHandler(request: NextRequest): Promise<NextResponse> {
  const { token, cookie } = await generateCSRFToken(request);

  const response = NextResponse.json({ csrfToken: token });
  response.headers.set('Set-Cookie', cookie);

  return response;
}

/**
 * Helper to extract CSRF token from response
 */
export function getCSRFTokenFromResponse(response: Response): string | null {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) return null;

  const parsed = parse(setCookie);
  return parsed[CSRF_COOKIE_NAME] || null;
}

/**
 * Client-side helper to get CSRF token from cookies
 */
export function getCSRFTokenFromCookies(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = parse(document.cookie);
  return cookies[CSRF_COOKIE_NAME] || null;
}
