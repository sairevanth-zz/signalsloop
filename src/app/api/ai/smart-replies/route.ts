import { NextRequest, NextResponse } from 'next/server';
import { generateSmartReplies } from '@/lib/enhanced-smart-replies';
import { checkDemoRateLimit, incrementDemoUsage, getClientIP, getTimeUntilReset } from '@/lib/demo-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Generate smart follow-up questions for feedback posts
 * POST /api/ai/smart-replies
 * Body: { postId?, title, description?, category?, userTier?, voteCount?, projectId? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category, userTier, voteCount, projectId } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Demo rate limiting for unauthenticated users
    if (!projectId) {
      const clientIP = getClientIP(request);
      const demoCheck = checkDemoRateLimit(clientIP, 'smart_replies');

      if (!demoCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Demo rate limit exceeded',
            message: `You've reached the demo limit of ${demoCheck.limit} smart replies per hour. Try again in ${getTimeUntilReset(demoCheck.resetAt)} or sign up for unlimited access!`,
            limit: demoCheck.limit,
            remaining: demoCheck.remaining,
            resetAt: demoCheck.resetAt,
            isDemo: true
          },
          { status: 429 }
        );
      }
    }

    // Generate smart replies using enhanced system
    const replies = await generateSmartReplies({
      title,
      description: description || '',
      category: category || 'general',
      userTier: userTier || 'free',
      voteCount: voteCount || 0,
    });

    // Increment demo usage after successful generation
    if (!projectId) {
      const clientIP = getClientIP(request);
      incrementDemoUsage(clientIP, 'smart_replies');
    }

    return NextResponse.json({
      success: true,
      replies,
      message: 'Smart replies generated successfully'
    });

  } catch (error) {
    console.error('[SMART REPLIES] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate smart replies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for fetching existing smart replies
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // For now, return empty array since we're not storing replies in database
    return NextResponse.json({ replies: [] });

  } catch (error) {
    console.error('[SMART REPLIES GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
