/**
 * Demo Rate Limiting
 * Simple in-memory rate limiting for demo/unauthenticated users
 * Prevents abuse of AI features on public demo pages
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory storage for demo rate limits (resets on server restart)
const demoLimits = new Map<string, RateLimitEntry>();

// Rate limits for demo users (per IP per hour)
const DEMO_LIMITS = {
  categorization: 10,
  prioritization: 10,
  duplicate_detection: 5,
  smart_replies: 10,
  cache_stats: 50, // Higher limit for cache stats since it's read-only
} as const;

type DemoFeatureType = keyof typeof DEMO_LIMITS;

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  // Fallback to a placeholder (won't happen in production)
  return 'unknown';
}

/**
 * Check if demo user has exceeded rate limit
 */
export function checkDemoRateLimit(
  ip: string,
  feature: DemoFeatureType
): { allowed: boolean; remaining: number; limit: number; resetAt: number } {
  const now = Date.now();
  const key = `${ip}:${feature}`;
  const limit = DEMO_LIMITS[feature];

  // Clean up expired entries (older than 1 hour)
  for (const [entryKey, entry] of demoLimits.entries()) {
    if (entry.resetAt < now) {
      demoLimits.delete(entryKey);
    }
  }

  const entry = demoLimits.get(key);

  // No entry or expired entry
  if (!entry || entry.resetAt < now) {
    const resetAt = now + 60 * 60 * 1000; // 1 hour from now
    demoLimits.set(key, { count: 0, resetAt });
    return {
      allowed: true,
      remaining: limit - 1,
      limit,
      resetAt,
    };
  }

  // Check if limit exceeded
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetAt: entry.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: limit - entry.count - 1,
    limit,
    resetAt: entry.resetAt,
  };
}

/**
 * Increment demo usage count
 */
export function incrementDemoUsage(ip: string, feature: DemoFeatureType, count: number = 1): void {
  const now = Date.now();
  const key = `${ip}:${feature}`;
  const entry = demoLimits.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + 60 * 60 * 1000; // 1 hour from now
    demoLimits.set(key, { count, resetAt });
  } else {
    entry.count += count;
  }
}

/**
 * Get formatted time until reset
 */
export function getTimeUntilReset(resetAt: number): string {
  const now = Date.now();
  const diff = resetAt - now;

  if (diff <= 0) return '0 minutes';

  const minutes = Math.ceil(diff / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }

  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
