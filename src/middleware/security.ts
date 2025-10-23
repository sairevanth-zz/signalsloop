import { NextRequest, NextResponse } from 'next/server';
import { applySecurityHeaders } from '@/lib/security-headers';
import { withRateLimit } from './rate-limit';
import { logSuspiciousRequest } from '@/lib/security-logger';

/**
 * Security Middleware
 * Applies comprehensive security measures to requests
 */

/**
 * Detect suspicious patterns in request
 */
function detectSuspiciousPatterns(request: NextRequest): string | null {
  const path = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;

  // SQL injection patterns
  const sqlPatterns = [
    /(\bunion\b.*\bselect\b)/i,
    /(\bselect\b.*\bfrom\b)/i,
    /(\binsert\b.*\binto\b)/i,
    /(\bdelete\b.*\bfrom\b)/i,
    /(\bdrop\b.*\btable\b)/i,
    /(\bexec\b.*\()/i,
    /(\bor\b.*=.*)/i,
    /(--)/,
    /(\/\*.*\*\/)/,
    /(\bxp_)/i,
  ];

  // XSS patterns
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  // Path traversal patterns
  const pathTraversalPatterns = [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,
  ];

  // Check path
  for (const pattern of [...sqlPatterns, ...xssPatterns, ...pathTraversalPatterns]) {
    if (pattern.test(path)) {
      return `Suspicious pattern in path: ${pattern}`;
    }
  }

  // Check query parameters
  for (const [key, value] of searchParams.entries()) {
    for (const pattern of [...sqlPatterns, ...xssPatterns]) {
      if (pattern.test(value)) {
        return `Suspicious pattern in query parameter ${key}: ${pattern}`;
      }
    }
  }

  return null;
}

/**
 * Validate request headers
 */
function validateRequestHeaders(request: NextRequest): string | null {
  const contentType = request.headers.get('content-type');
  const userAgent = request.headers.get('user-agent');

  // Check for missing user agent (potential bot)
  if (!userAgent && request.method !== 'OPTIONS') {
    return 'Missing User-Agent header';
  }

  // Validate Content-Type for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    if (!contentType) {
      return 'Missing Content-Type header';
    }

    // Allow only specific content types
    const allowedContentTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain',
    ];

    const isAllowed = allowedContentTypes.some(type =>
      contentType.toLowerCase().includes(type)
    );

    if (!isAllowed) {
      return `Unsupported Content-Type: ${contentType}`;
    }
  }

  return null;
}

/**
 * Apply security middleware
 */
export async function withSecurity(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  options: {
    enableRateLimit?: boolean;
    enableSuspiciousPatternDetection?: boolean;
    enableHeaderValidation?: boolean;
  } = {}
): Promise<NextResponse> {
  const {
    enableRateLimit = true,
    enableSuspiciousPatternDetection = true,
    enableHeaderValidation = true,
  } = options;

  // Detect suspicious patterns
  if (enableSuspiciousPatternDetection) {
    const suspiciousReason = detectSuspiciousPatterns(request);
    if (suspiciousReason) {
      logSuspiciousRequest(request, suspiciousReason);

      const response = NextResponse.json(
        { error: 'Bad Request', message: 'Invalid request format' },
        { status: 400 }
      );
      return applySecurityHeaders(response);
    }
  }

  // Validate headers
  if (enableHeaderValidation) {
    const headerError = validateRequestHeaders(request);
    if (headerError) {
      logSuspiciousRequest(request, headerError);

      const response = NextResponse.json(
        { error: 'Bad Request', message: headerError },
        { status: 400 }
      );
      return applySecurityHeaders(response);
    }
  }

  // Apply rate limiting if enabled
  if (enableRateLimit) {
    return withRateLimit(request, async () => {
      const response = await handler();
      return applySecurityHeaders(response);
    });
  }

  // Execute handler and apply security headers
  const response = await handler();
  return applySecurityHeaders(response);
}

/**
 * Wrapper for API routes with full security
 */
export function secureAPIRoute(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options?: {
    enableRateLimit?: boolean;
    enableSuspiciousPatternDetection?: boolean;
    enableHeaderValidation?: boolean;
  }
) {
  return async (request: NextRequest, context?: any) => {
    return withSecurity(
      request,
      () => handler(request, context),
      options
    );
  };
}
