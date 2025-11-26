import { getRedisCacheStats, checkRedisHealth } from '@/lib/observability/redis-cache'
import { NextRequest } from 'next/server'

/**
 * Cache Statistics API
 *
 * GET /api/cache/stats
 * Returns statistics for all Redis caches
 *
 * Response:
 * {
 *   "redis_healthy": true,
 *   "backend": "redis",
 *   "caches": {
 *     "sentiment": { "keys": 150, "backend": "redis" },
 *     "embeddings": { "keys": 1200, "backend": "redis" },
 *     ...
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Check Redis health
    const isHealthy = await checkRedisHealth()

    // Get cache statistics
    const stats = await getRedisCacheStats()

    return Response.json({
      redis_healthy: isHealthy,
      backend: isHealthy ? 'redis' : 'in-memory',
      caches: stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch cache stats:', error)
    return Response.json(
      {
        error: 'Failed to fetch cache statistics',
        redis_healthy: false,
      },
      { status: 500 }
    )
  }
}
