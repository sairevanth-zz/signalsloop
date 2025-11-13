/**
 * AI Response Cache Manager
 * Reduces API costs by caching similar requests
 */

import crypto from 'crypto';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

class AIResponseCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 1000, ttlMs = 3600000) { // 1 hour default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  private generateKey(prefix: string, input: any): string {
    const normalized = JSON.stringify(input, Object.keys(input).sort());
    return `${prefix}:${crypto.createHash('md5').update(normalized).digest('hex')}`;
  }

  get<T>(prefix: string, input: any): T | null {
    const key = this.generateKey(prefix, input);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;
    return entry.data as T;
  }

  set<T>(prefix: string, input: any, data: T): void {
    const key = this.generateKey(prefix, input);

    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const lruKey = this.findLRUKey();
      if (lruKey) this.cache.delete(lruKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    });
  }

  private findLRUKey(): string | null {
    let lruKey: string | null = null;
    let minScore = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Score based on recency and frequency
      const age = Date.now() - entry.timestamp;
      const score = entry.hits / (age / 1000); // hits per second

      if (score < minScore) {
        minScore = score;
        lruKey = key;
      }
    }

    return lruKey;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    const entries = Array.from(this.cache.entries());
    const totalHits = entries.reduce((sum, [_, entry]) => sum + entry.hits, 0);
    const avgAge = entries.reduce((sum, [_, entry]) =>
      sum + (Date.now() - entry.timestamp), 0) / entries.length;

    return {
      size: this.cache.size,
      totalHits,
      avgAge: Math.round(avgAge / 1000), // in seconds
      hitRate: totalHits / (totalHits + this.cache.size), // approximate
    };
  }
}

// Create specialized caches for different AI features
export const cacheManager = {
  categorization: new AIResponseCache(500, 3600000),      // 1 hour TTL
  smartReplies: new AIResponseCache(300, 1800000),        // 30 min TTL
  duplicateDetection: new AIResponseCache(1000, 7200000), // 2 hour TTL
  priorityScoring: new AIResponseCache(200, 900000),      // 15 min TTL
  writingAssistant: new AIResponseCache(100, 600000),     // 10 min TTL
  sentiment: new AIResponseCache(500, 3600000),           // 1 hour TTL
};

// Cache-aware wrapper for AI functions
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  cacheName: keyof typeof cacheManager,
  getCacheKey: (...args: Parameters<T>) => any
): T {
  return (async (...args: Parameters<T>) => {
    const cache = cacheManager[cacheName];
    const cacheKey = getCacheKey(...args);

    // Check cache first
    const cached = cache.get(cacheName, cacheKey);
    if (cached !== null) {
      console.log(`Cache hit for ${cacheName}`);
      return cached;
    }

    // Call the original function
    console.log(`Cache miss for ${cacheName} - calling AI`);
    const result = await fn(...args);

    // Cache the result
    cache.set(cacheName, cacheKey, result);

    return result;
  }) as T;
}

// Export cache statistics for monitoring
export function getCacheStatistics() {
  const stats: Record<string, any> = {};

  for (const [name, cache] of Object.entries(cacheManager)) {
    stats[name] = cache.getStats();
  }

  const totalSaved = Object.values(stats).reduce(
    (sum: number, stat: any) => sum + (stat.totalHits || 0), 0
  );

  // Estimate cost savings (assuming $0.002 per API call for GPT-4o-mini)
  const estimatedSavings = totalSaved * 0.002;

  return {
    ...stats,
    totalCacheHits: totalSaved,
    estimatedSavingsUSD: estimatedSavings.toFixed(2),
  };
}
