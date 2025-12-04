/**
 * Simple in-memory cache with TTL for stakeholder queries
 * Improves performance by caching:
 * - Project context data (5 minutes)
 * - Component data (2 minutes)
 * - Query responses (10 minutes for identical queries)
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class StakeholderCache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Get cached value if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache value with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Cache] Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const stakeholderCache = new StakeholderCache();

/**
 * Cache key generators
 */
export const CacheKeys = {
  projectContext: (projectId: string) => `context:${projectId}`,

  componentData: (projectId: string, type: string, params?: Record<string, any>) =>
    `component:${projectId}:${type}:${JSON.stringify(params || {})}`,

  queryResponse: (projectId: string, query: string, role: string) =>
    `query:${projectId}:${role}:${query.toLowerCase().trim()}`,

  themesSentiment: (projectId: string) => `themes:${projectId}`,

  events: (projectId: string, params?: Record<string, any>) =>
    `events:${projectId}:${JSON.stringify(params || {})}`,
};

/**
 * Cache TTL constants (in milliseconds)
 */
export const CacheTTL = {
  projectContext: 5 * 60 * 1000,      // 5 minutes
  componentData: 2 * 60 * 1000,       // 2 minutes
  queryResponse: 10 * 60 * 1000,      // 10 minutes
  themesSentiment: 10 * 60 * 1000,    // 10 minutes (expensive calculation)
  events: 1 * 60 * 1000,              // 1 minute (more dynamic)
};

/**
 * Helper function to wrap async operations with caching
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  // Check cache first
  const cached = stakeholderCache.get<T>(key);
  if (cached !== null) {
    console.log(`[Cache] HIT: ${key}`);
    return cached;
  }

  // Cache miss - execute function
  console.log(`[Cache] MISS: ${key}`);
  const result = await fn();

  // Store in cache
  stakeholderCache.set(key, result, ttl);

  return result;
}
