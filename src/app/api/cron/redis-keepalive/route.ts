/**
 * Redis Keepalive Cron Job
 *
 * Purpose: Keep Upstash Redis account active by performing periodic PING operations.
 * This prevents the account from being archived due to inactivity.
 *
 * Schedule: Called by orchestrator as part of morning batch (9 AM daily)
 * OR can be triggered manually via:
 *   curl -X GET "https://signalsloop.com/api/cron/redis-keepalive" \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRedisHealth, getRedisCacheStats } from '@/lib/observability/redis-cache'

export const runtime = 'nodejs'
export const maxDuration = 10 // Only needs a few seconds

export async function GET(request: NextRequest) {
    try {
        // Verify authorization
        const authHeader = request.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('🔄 Redis Keepalive: Pinging Redis...')

        // Perform health check (this sends a PING command to Redis)
        const isHealthy = await checkRedisHealth()

        if (isHealthy) {
            // Optionally get stats to add a bit more activity
            const stats = await getRedisCacheStats()
            const totalKeys = Object.values(stats).reduce((sum: number, cache: any) => {
                return sum + (cache.keys || 0)
            }, 0)

            console.log(`✅ Redis Keepalive: Success - ${totalKeys} cached keys across all caches`)

            return NextResponse.json({
                success: true,
                message: 'Redis keepalive successful',
                redis_healthy: true,
                cached_keys: totalKeys,
                timestamp: new Date().toISOString(),
            })
        } else {
            console.warn('⚠️ Redis Keepalive: Redis not available (using in-memory fallback)')

            return NextResponse.json({
                success: true, // Still "successful" - just using fallback
                message: 'Redis not configured - using in-memory fallback',
                redis_healthy: false,
                timestamp: new Date().toISOString(),
            })
        }
    } catch (error) {
        console.error('❌ Redis Keepalive: Failed', error)

        return NextResponse.json(
            {
                success: false,
                error: 'Redis keepalive failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
