/**
 * Rate Limiting for Stakeholder API Endpoints
 * Prevents abuse and ensures fair usage
 *
 * Limits:
 * - 20 queries per minute per user
 * - 100 queries per hour per user
 * - 500 queries per day per project
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry>;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.limits = new Map();

    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Check if request is within rate limit
   * @returns { allowed: boolean, remaining: number, resetAt: number }
   */
  checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.limits.get(key);

    // No entry or expired - create new one
    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowMs;
      this.limits.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt,
      };
    }

    // Within window - check count
    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;
    this.limits.set(key, entry);

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Rate Limit] Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Clear all limits (for testing)
   */
  clear(): void {
    this.limits.clear();
  }

  /**
   * Get stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.limits.size,
      keys: Array.from(this.limits.keys()),
    };
  }

  /**
   * Destroy the rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Rate limit configurations
 */
export const RateLimits = {
  // Per user limits
  perMinute: {
    max: 20,
    window: 60 * 1000, // 1 minute
  },
  perHour: {
    max: 100,
    window: 60 * 60 * 1000, // 1 hour
  },
  perDay: {
    max: 1000,
    window: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Per project limits (more generous)
  projectPerDay: {
    max: 5000,
    window: 24 * 60 * 60 * 1000, // 24 hours
  },
};

/**
 * Check multiple rate limits for a user
 * Returns the most restrictive limit that failed, or null if all pass
 */
export function checkUserRateLimits(userId: string): {
  allowed: boolean;
  limit?: string;
  remaining?: number;
  resetAt?: number;
} {
  // Check per-minute limit
  const perMinuteKey = `user:${userId}:minute`;
  const perMinute = rateLimiter.checkLimit(
    perMinuteKey,
    RateLimits.perMinute.max,
    RateLimits.perMinute.window
  );

  if (!perMinute.allowed) {
    return {
      allowed: false,
      limit: 'per-minute',
      remaining: perMinute.remaining,
      resetAt: perMinute.resetAt,
    };
  }

  // Check per-hour limit
  const perHourKey = `user:${userId}:hour`;
  const perHour = rateLimiter.checkLimit(
    perHourKey,
    RateLimits.perHour.max,
    RateLimits.perHour.window
  );

  if (!perHour.allowed) {
    return {
      allowed: false,
      limit: 'per-hour',
      remaining: perHour.remaining,
      resetAt: perHour.resetAt,
    };
  }

  // Check per-day limit
  const perDayKey = `user:${userId}:day`;
  const perDay = rateLimiter.checkLimit(
    perDayKey,
    RateLimits.perDay.max,
    RateLimits.perDay.window
  );

  if (!perDay.allowed) {
    return {
      allowed: false,
      limit: 'per-day',
      remaining: perDay.remaining,
      resetAt: perDay.resetAt,
    };
  }

  // All limits passed - return most restrictive remaining count
  return {
    allowed: true,
    remaining: Math.min(perMinute.remaining, perHour.remaining, perDay.remaining),
  };
}

/**
 * Check project-level rate limit
 */
export function checkProjectRateLimit(projectId: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const key = `project:${projectId}:day`;
  return rateLimiter.checkLimit(
    key,
    RateLimits.projectPerDay.max,
    RateLimits.projectPerDay.window
  );
}

/**
 * Format time until reset (for error messages)
 */
export function formatResetTime(resetAt: number): string {
  const seconds = Math.ceil((resetAt - Date.now()) / 1000);

  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}
