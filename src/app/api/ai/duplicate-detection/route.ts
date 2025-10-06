import { NextRequest, NextResponse } from 'next/server';
import { detectDuplicates, detectDuplicateClusters } from '@/lib/enhanced-duplicate-detection';
import { checkAIUsageLimit, incrementAIUsage } from '@/lib/ai-rate-limit';
import { checkDemoRateLimit, incrementDemoUsage, getClientIP, getTimeUntilReset } from '@/lib/demo-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/ai/duplicate-detection
 * Detect duplicate feedback posts using semantic analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode = 'single', newPost, existingPosts, posts, options = {}, projectId } = body;

    // Check rate limit if projectId is provided
    if (projectId) {
      const usageCheck = await checkAIUsageLimit(projectId, 'duplicate_detection');

      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `You've reached your monthly limit of ${usageCheck.limit} AI duplicate detections. ${
              usageCheck.isPro ? 'Please try again next month.' : 'Upgrade to Pro for unlimited duplicate detection!'
            }`,
            current: usageCheck.current,
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
            isPro: usageCheck.isPro
          },
          { status: 429 }
        );
      }
    } else {
      // Demo/unauthenticated user - use IP-based rate limiting
      const clientIP = getClientIP(request);
      const demoCheck = checkDemoRateLimit(clientIP, 'duplicate_detection');

      if (!demoCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Demo rate limit exceeded',
            message: `You've reached the demo limit of ${demoCheck.limit} duplicate detections per hour. Try again in ${getTimeUntilReset(demoCheck.resetAt)} or sign up for unlimited access!`,
            limit: demoCheck.limit,
            remaining: demoCheck.remaining,
            resetAt: demoCheck.resetAt,
            isDemo: true
          },
          { status: 429 }
        );
      }
    }

    if (mode === 'cluster') {
      // Cluster detection mode
      if (!posts || !Array.isArray(posts)) {
        return NextResponse.json(
          { error: 'Posts array is required for cluster mode' },
          { status: 400 }
        );
      }

      const clusters = await detectDuplicateClusters(posts, options);

      if (projectId) {
        await incrementAIUsage(projectId, 'duplicate_detection', posts.length);
      } else {
        const clientIP = getClientIP(request);
        incrementDemoUsage(clientIP, 'duplicate_detection', Math.min(posts.length, 5));
      }

      return NextResponse.json({
        success: true,
        mode: 'cluster',
        clusters,
        metadata: {
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

      const duplicates = await detectDuplicates(newPost, existingPosts, options);

      if (projectId) {
        await incrementAIUsage(projectId, 'duplicate_detection');
      } else {
        const clientIP = getClientIP(request);
        incrementDemoUsage(clientIP, 'duplicate_detection');
      }

      return NextResponse.json({
        success: true,
        mode: 'single',
        duplicates,
        metadata: {
          candidatesAnalyzed: existingPosts.length,
          duplicatesFound: duplicates.length,
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('[DUPLICATE DETECTION] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to detect duplicates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
