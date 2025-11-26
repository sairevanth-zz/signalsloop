import { Redis } from '@upstash/redis'
import crypto from 'crypto'
import logger from './logger'

/**
 * Redis Cache Manager using Upstash
 *
 * Replaces in-memory cache with persistent, distributed Redis cache
 *
 * Benefits over in-memory cache:
 * - Persists across server restarts
 * - Shared across multiple instances (horizontal scaling)
 * - No memory limits on serverless functions
 * - TTL handled by Redis (automatic expiration)
 */

interface RedisCacheOptions {
  ttl?: number // Time to live in seconds (default: 3600)
  enabled?: boolean // Allow disabling Redis cache (fallback to in-memory)
}

class RedisCache {
  private redis: Redis | null
  private prefix: string
  private ttl: number
  private enabled: boolean
  private inMemoryFallback: Map<string, { data: any; expires: number }>

  constructor(prefix: string, options: RedisCacheOptions = {}) {
    this.prefix = prefix
    this.ttl = options.ttl || 3600 // Default 1 hour
    this.enabled = options.enabled ?? true
    this.inMemoryFallback = new Map()

    // Initialize Redis client if credentials exist
    if (this.enabled && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        })
        logger.info('Redis cache initialized', { prefix })
      } catch (error) {
        logger.error({ error }, 'Failed to initialize Redis, falling back to in-memory cache')
        this.redis = null
      }
    } else {
      logger.warn('Redis credentials not found, using in-memory cache', { prefix })
      this.redis = null
    }
  }

  private generateKey(input: any): string {
    const normalized = JSON.stringify(input, Object.keys(input).sort())
    const hash = crypto.createHash('md5').update(normalized).digest('hex')
    return `${this.prefix}:${hash}`
  }

  /**
   * Get cached value
   */
  async get<T>(input: any): Promise<T | null> {
    const key = this.generateKey(input)

    try {
      if (this.redis) {
        // Use Redis cache
        const cached = await this.redis.get<T>(key)

        if (cached !== null) {
          logger.debug('Redis cache hit', { prefix: this.prefix, key })
          return cached
        }

        logger.debug('Redis cache miss', { prefix: this.prefix, key })
        return null
      } else {
        // Fallback to in-memory cache
        const entry = this.inMemoryFallback.get(key)

        if (!entry) return null

        // Check expiration
        if (Date.now() > entry.expires) {
          this.inMemoryFallback.delete(key)
          return null
        }

        logger.debug('In-memory cache hit', { prefix: this.prefix, key })
        return entry.data as T
      }
    } catch (error) {
      logger.error({ error }, 'Redis get error, returning null', { key })
      return null
    }
  }

  /**
   * Set cached value with TTL
   */
  async set<T>(input: any, data: T, customTTL?: number): Promise<void> {
    const key = this.generateKey(input)
    const ttl = customTTL || this.ttl

    try {
      if (this.redis) {
        // Use Redis with automatic expiration
        await this.redis.set(key, data, { ex: ttl })
        logger.debug('Redis cache set', { prefix: this.prefix, key, ttl })
      } else {
        // Fallback to in-memory cache
        this.inMemoryFallback.set(key, {
          data,
          expires: Date.now() + ttl * 1000,
        })
        logger.debug('In-memory cache set', { prefix: this.prefix, key, ttl })
      }
    } catch (error) {
      logger.error({ error }, 'Redis set error', { key })
    }
  }

  /**
   * Delete cached value
   */
  async del(input: any): Promise<void> {
    const key = this.generateKey(input)

    try {
      if (this.redis) {
        await this.redis.del(key)
      } else {
        this.inMemoryFallback.delete(key)
      }
      logger.debug('Cache deleted', { prefix: this.prefix, key })
    } catch (error) {
      logger.error({ error }, 'Redis delete error', { key })
    }
  }

  /**
   * Clear all cache entries for this prefix
   */
  async clear(): Promise<void> {
    try {
      if (this.redis) {
        // Delete all keys matching prefix pattern
        const keys = await this.redis.keys(`${this.prefix}:*`)
        if (keys.length > 0) {
          await this.redis.del(...keys)
          logger.info('Redis cache cleared', { prefix: this.prefix, count: keys.length })
        }
      } else {
        this.inMemoryFallback.clear()
        logger.info('In-memory cache cleared', { prefix: this.prefix })
      }
    } catch (error) {
      logger.error({ error }, 'Redis clear error', { prefix: this.prefix })
    }
  }

  /**
   * Check if a key exists
   */
  async exists(input: any): Promise<boolean> {
    const key = this.generateKey(input)

    try {
      if (this.redis) {
        const exists = await this.redis.exists(key)
        return exists === 1
      } else {
        const entry = this.inMemoryFallback.get(key)
        if (!entry) return false
        if (Date.now() > entry.expires) {
          this.inMemoryFallback.delete(key)
          return false
        }
        return true
      }
    } catch (error) {
      logger.error({ error }, 'Redis exists error', { key })
      return false
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(input: any): Promise<number> {
    const key = this.generateKey(input)

    try {
      if (this.redis) {
        return await this.redis.ttl(key)
      } else {
        const entry = this.inMemoryFallback.get(key)
        if (!entry) return -2
        const remaining = Math.floor((entry.expires - Date.now()) / 1000)
        return remaining > 0 ? remaining : -2
      }
    } catch (error) {
      logger.error({ error }, 'Redis TTL error', { key })
      return -2
    }
  }
}

/**
 * Create Redis caches for different AI features
 * Replaces in-memory cacheManager
 */
export const redisCacheManager = {
  categorization: new RedisCache('ai:categorization', { ttl: 3600 }), // 1 hour
  smartReplies: new RedisCache('ai:smart-replies', { ttl: 1800 }), // 30 min
  duplicateDetection: new RedisCache('ai:duplicate-detection', { ttl: 7200 }), // 2 hours
  priorityScoring: new RedisCache('ai:priority-scoring', { ttl: 900 }), // 15 min
  writingAssistant: new RedisCache('ai:writing-assistant', { ttl: 600 }), // 10 min
  sentiment: new RedisCache('ai:sentiment', { ttl: 3600 }), // 1 hour
  'theme-detection': new RedisCache('ai:theme-detection', { ttl: 7200 }), // 2 hours
  embeddings: new RedisCache('ai:embeddings', { ttl: 86400 }), // 24 hours (embeddings are expensive)
  specs: new RedisCache('ai:specs', { ttl: 3600 }), // 1 hour
  competitive: new RedisCache('ai:competitive', { ttl: 14400 }), // 4 hours
}

/**
 * Cache-aware wrapper for AI functions (async version)
 *
 * @example
 * const cachedSentimentAnalysis = withRedisCache(
 *   analyzeSentiment,
 *   'sentiment',
 *   (content) => ({ content })
 * )
 */
export function withRedisCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  cacheName: keyof typeof redisCacheManager,
  getCacheKey: (...args: Parameters<T>) => any
): T {
  return (async (...args: Parameters<T>) => {
    const cache = redisCacheManager[cacheName]
    const cacheKey = getCacheKey(...args)

    // Check cache first
    const cached = await cache.get(cacheKey)
    if (cached !== null) {
      logger.debug('Cache hit', { cache: cacheName })
      return cached
    }

    // Call the original function
    logger.debug('Cache miss - calling AI', { cache: cacheName })
    const result = await fn(...args)

    // Cache the result (fire and forget)
    cache.set(cacheKey, result).catch((error) => {
      logger.error({ error }, 'Failed to cache result', { cache: cacheName })
    })

    return result
  }) as T
}

/**
 * Cache statistics
 *
 * Note: Redis doesn't track hits natively, so we estimate based on keys
 */
export async function getRedisCacheStats() {
  const stats: Record<string, any> = {}

  for (const [name, cache] of Object.entries(redisCacheManager)) {
    try {
      if ((cache as any).redis) {
        const keys = await (cache as any).redis.keys(`${(cache as any).prefix}:*`)
        stats[name] = {
          keys: keys.length,
          backend: 'redis',
        }
      } else {
        stats[name] = {
          keys: (cache as any).inMemoryFallback.size,
          backend: 'in-memory',
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to get cache stats', { cache: name })
      stats[name] = { error: 'Failed to fetch stats' }
    }
  }

  return stats
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const cache = redisCacheManager.sentiment
    if ((cache as any).redis) {
      await (cache as any).redis.ping()
      return true
    }
    return false // Using in-memory fallback
  } catch (error) {
    logger.error({ error }, 'Redis health check failed')
    return false
  }
}

export default redisCacheManager
