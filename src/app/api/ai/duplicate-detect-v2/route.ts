import { NextRequest, NextResponse } from 'next/server';
import {
  detectDuplicates,
  detectDuplicateClusters,
  type DuplicateCandidate
} from '@/lib/enhanced-duplicate-detection';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * TEST ENDPOINT for Enhanced Duplicate Detection
 * Use this to test the new duplicate detection system before replacing production
 *
 * POST /api/ai/duplicate-detect-v2
 * Body: {
 *   mode: 'single' | 'cluster',
 *   newPost: DuplicateCandidate,  // For single mode
 *   existingPosts: DuplicateCandidate[],
 *   posts: DuplicateCandidate[],  // For cluster mode
 *   options: { threshold?, maxResults?, includeRelated? }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode = 'single', newPost, existingPosts, posts, options = {} } = body;

    if (mode === 'cluster') {
      // Cluster detection mode
      if (!posts || !Array.isArray(posts)) {
        return NextResponse.json(
          { error: 'Posts array is required for cluster mode' },
          { status: 400 }
        );
      }

      console.log('[DUPLICATE DETECT V2 TEST] Cluster mode:', posts.length, 'posts');

      const clusters = await detectDuplicateClusters(posts, options);

      console.log('[DUPLICATE DETECT V2 TEST] Found', clusters.length, 'clusters');

      return NextResponse.json({
        success: true,
        mode: 'cluster',
        clusters,
        metadata: {
          version: 'v2-enhanced',
          totalPosts: posts.length,
          clustersFound: clusters.length,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      // Single duplicate detection mode
      if (!newPost) {
        return NextResponse.json(
          { error: 'newPost is required for single mode' },
          { status: 400 }
        );
      }

      if (!existingPosts || !Array.isArray(existingPosts)) {
        return NextResponse.json(
          { error: 'existingPosts array is required for single mode' },
          { status: 400 }
        );
      }

      console.log('[DUPLICATE DETECT V2 TEST] Single mode:', {
        newPost: newPost.title,
        existingCount: existingPosts.length,
        options
      });

      const duplicates = await detectDuplicates(newPost, existingPosts, options);

      console.log('[DUPLICATE DETECT V2 TEST] Found', duplicates.length, 'potential duplicates');

      return NextResponse.json({
        success: true,
        mode: 'single',
        duplicates,
        metadata: {
          version: 'v2-enhanced',
          candidatesAnalyzed: existingPosts.length,
          duplicatesFound: duplicates.length,
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('[DUPLICATE DETECT V2 TEST] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to detect duplicates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
