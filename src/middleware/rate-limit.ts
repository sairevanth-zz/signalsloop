import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

/**
 * Rate limiting middleware wrapper
 */
export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  type: 'api' | 'webhookManagement' = 'api'
): Promise<NextResponse> {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request, type);

  // If rate limiting failed (error), proceed anyway
  if (!rateLimitResult) {
    return handler();
  }

  // If rate limit exceeded, return 429
  if (!rateLimitResult.success) {
    const headers = getRateLimitHeaders(rateLimitResult);

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        limit: rateLimitResult.limit,
        reset: rateLimitResult.reset,
      },
      {
        status: 429,
        headers,
      }
    );
  }

  // Execute handler
  const response = await handler();

  // Add rate limit headers to successful response
  const headers = getRateLimitHeaders(rateLimitResult);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
