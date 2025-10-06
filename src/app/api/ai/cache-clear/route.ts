import { NextResponse } from 'next/server';
import { cacheManager } from '@/lib/ai-cache-manager';

export const runtime = 'nodejs';

/**
 * POST /api/ai/cache-clear
 * Clear all AI caches (admin only - requires secret key)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { secret, cacheType } = body;

    // Simple secret-based auth (use ADMIN_SECRET env var)
    if (secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Clear specific cache or all caches
    if (cacheType && cacheType in cacheManager) {
      cacheManager[cacheType as keyof typeof cacheManager].clear();
      return NextResponse.json({
        success: true,
        message: `Cleared ${cacheType} cache`
      });
    }

    // Clear all caches
    Object.values(cacheManager).forEach(cache => cache.clear());

    return NextResponse.json({
      success: true,
      message: 'All AI caches cleared'
    });

  } catch (error) {
    console.error('[CACHE CLEAR] Error:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
