import { NextRequest, NextResponse } from 'next/server';
import { getCacheStatistics, cacheManager } from '@/lib/ai-cache-manager';

export const runtime = 'nodejs';

/**
 * GET /api/ai/cache-stats
 * Returns AI cache statistics and estimated cost savings
 */
export async function GET(request: NextRequest) {
  try {
    const stats = getCacheStatistics();

    return NextResponse.json({
      success: true,
      statistics: stats,
      metadata: {
        timestamp: new Date().toISOString(),
        cacheManagers: Object.keys(cacheManager),
      }
    });

  } catch (error) {
    console.error('[CACHE STATS] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get cache statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/cache-stats
 * Clears all AI caches
 */
export async function DELETE(request: NextRequest) {
  try {
    // Clear all caches
    for (const cache of Object.values(cacheManager)) {
      cache.clear();
    }

    return NextResponse.json({
      success: true,
      message: 'All AI caches cleared',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CACHE STATS] Error clearing caches:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear caches',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
