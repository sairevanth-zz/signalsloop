/**
 * Demo Rate Limiting
 * Simple in-memory rate limiting for demo/unauthenticated users
 * Prevents abuse of AI features on public demo pages
 * 
 * Uses 24-hour windows to limit daily usage
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory storage for demo rate limits (resets on server restart)
const demoLimits = new Map<string, RateLimitEntry>();

// Rate limits for demo users (per IP per DAY)
const DEMO_LIMITS = {
  // Cheap features (GPT-4o-mini) - more generous
  categorization: 5,      // Was 10/hr
  priority_scoring: 5,    // Was 10/hr
  smart_replies: 5,       // Was 10/hr
  duplicate_detection: 3, // Was 5/hr
  cache_stats: 20,        // Read-only, still generous

  // Expensive features (GPT-4o) - strict limits
  feedback_analysis: 2,   // ~$0.036/day max
  competitive_intel: 2,   // ~$0.05/day max
} as const;

// Time window: 24 hours
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

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

  // Clean up expired entries
  for (const [entryKey, entry] of demoLimits.entries()) {
    if (entry.resetAt < now) {
      demoLimits.delete(entryKey);
    }
  }

  const entry = demoLimits.get(key);

  // No entry or expired entry
  if (!entry || entry.resetAt < now) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
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
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
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

  const totalMinutes = Math.ceil(diff / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 24) {
    return 'tomorrow';
  }

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
