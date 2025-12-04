/**
 * Unit tests for Stakeholder Rate Limiting
 */

import {
  rateLimiter,
  RateLimits,
  checkUserRateLimits,
  checkProjectRateLimit,
  formatResetTime,
} from '@/lib/stakeholder/rate-limit';

describe('RateLimiter', () => {
  beforeEach(() => {
    rateLimiter.clear();
  });

  describe('Basic rate limiting', () => {
    it('should allow requests within limit', () => {
      const key = 'test-user';
      const maxRequests = 5;
      const windowMs = 60000;

      for (let i = 0; i < maxRequests; i++) {
        const result = rateLimiter.checkLimit(key, maxRequests, windowMs);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(maxRequests - i - 1);
      }
    });

    it('should block requests exceeding limit', () => {
      const key = 'test-user';
      const maxRequests = 3;
      const windowMs = 60000;

      // Make max requests
      for (let i = 0; i < maxRequests; i++) {
        rateLimiter.checkLimit(key, maxRequests, windowMs);
      }

      // Next request should be blocked
      const result = rateLimiter.checkLimit(key, maxRequests, windowMs);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      const key = 'test-user';
      const maxRequests = 2;
      const windowMs = 100; // Short window for testing

      // Exhaust limit
      rateLimiter.checkLimit(key, maxRequests, windowMs);
      rateLimiter.checkLimit(key, maxRequests, windowMs);

      const blocked = rateLimiter.checkLimit(key, maxRequests, windowMs);
      expect(blocked.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      const result = rateLimiter.checkLimit(key, maxRequests, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(maxRequests - 1);
    });

    it('should track different keys independently', () => {
      const maxRequests = 3;
      const windowMs = 60000;

      // User 1 makes requests
      rateLimiter.checkLimit('user-1', maxRequests, windowMs);
      rateLimiter.checkLimit('user-1', maxRequests, windowMs);

      // User 2 should have full quota
      const result = rateLimiter.checkLimit('user-2', maxRequests, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(maxRequests - 1);
    });
  });

  describe('checkUserRateLimits', () => {
    it('should check all user rate limits', () => {
      const userId = 'test-user';

      // Should pass all limits initially
      const result = checkUserRateLimits(userId);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should block when per-minute limit is exceeded', () => {
      const userId = 'test-user';

      // Exhaust per-minute limit
      for (let i = 0; i < RateLimits.perMinute.max; i++) {
        checkUserRateLimits(userId);
      }

      const result = checkUserRateLimits(userId);
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe('per-minute');
    });

    it('should return most restrictive remaining count', () => {
      const userId = 'test-user';

      // Make some requests
      for (let i = 0; i < 15; i++) {
        checkUserRateLimits(userId);
      }

      const result = checkUserRateLimits(userId);
      expect(result.allowed).toBe(true);
      // Should return the smallest remaining count across all limits
      expect(result.remaining).toBeLessThanOrEqual(RateLimits.perMinute.max - 15);
    });
  });

  describe('checkProjectRateLimit', () => {
    it('should allow requests within project limit', () => {
      const projectId = 'test-project';

      const result = checkProjectRateLimit(projectId);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RateLimits.projectPerDay.max - 1);
    });

    it('should have separate limits per project', () => {
      checkProjectRateLimit('project-1');
      checkProjectRateLimit('project-1');

      const result = checkProjectRateLimit('project-2');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RateLimits.projectPerDay.max - 1);
    });
  });

  describe('formatResetTime', () => {
    it('should format seconds correctly', () => {
      const now = Date.now();
      const resetAt = now + 45000; // 45 seconds

      const formatted = formatResetTime(resetAt);
      expect(formatted).toContain('45 seconds');
    });

    it('should format minutes correctly', () => {
      const now = Date.now();
      const resetAt = now + 180000; // 3 minutes

      const formatted = formatResetTime(resetAt);
      expect(formatted).toContain('3 minutes');
    });

    it('should format hours correctly', () => {
      const now = Date.now();
      const resetAt = now + 7200000; // 2 hours

      const formatted = formatResetTime(resetAt);
      expect(formatted).toContain('2 hours');
    });

    it('should handle singular vs plural correctly', () => {
      const now = Date.now();

      const oneSecond = formatResetTime(now + 1000);
      expect(oneSecond).toContain('1 second');
      expect(oneSecond).not.toContain('seconds');

      const oneMinute = formatResetTime(now + 60000);
      expect(oneMinute).toContain('1 minute');
      expect(oneMinute).not.toContain('minutes');
    });
  });

  describe('RateLimiter cleanup', () => {
    it('should provide accurate stats', () => {
      rateLimiter.checkLimit('user-1', 10, 60000);
      rateLimiter.checkLimit('user-2', 10, 60000);
      rateLimiter.checkLimit('user-3', 10, 60000);

      const stats = rateLimiter.stats();
      expect(stats.size).toBeGreaterThanOrEqual(3);
      expect(stats.keys.length).toBeGreaterThanOrEqual(3);
    });

    it('should clear all limits', () => {
      rateLimiter.checkLimit('user-1', 10, 60000);
      rateLimiter.checkLimit('user-2', 10, 60000);

      rateLimiter.clear();

      const stats = rateLimiter.stats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Rate limit constants', () => {
    it('should have appropriate rate limit values', () => {
      expect(RateLimits.perMinute.max).toBe(20);
      expect(RateLimits.perHour.max).toBe(100);
      expect(RateLimits.perDay.max).toBe(1000);
      expect(RateLimits.projectPerDay.max).toBe(5000);
    });

    it('should have appropriate window values', () => {
      expect(RateLimits.perMinute.window).toBe(60 * 1000); // 1 minute
      expect(RateLimits.perHour.window).toBe(60 * 60 * 1000); // 1 hour
      expect(RateLimits.perDay.window).toBe(24 * 60 * 60 * 1000); // 1 day
    });
  });
});
