import { NextRequest, NextResponse } from 'next/server';
import { generateSmartRepliesWithCache } from '@/lib/enhanced-smart-replies';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * TEST ENDPOINT for Enhanced Smart Replies
 * Use this to test the new smart replies system before replacing production
 *
 * POST /api/ai/smart-replies-v2
 * Body: {
 *   title: string,
 *   description: string,
 *   category?: string,
 *   userTier?: 'free' | 'pro' | 'enterprise',
 *   voteCount?: number,
 *   previousQuestions?: string[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      userTier,
      voteCount,
      previousQuestions
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    console.log('[SMART REPLIES V2 TEST] Generating replies for:', {
      title,
      category,
      userTier,
      voteCount
    });

    const replies = await generateSmartRepliesWithCache({
      title,
      description,
      category,
      userTier,
      voteCount,
      previousQuestions
    });

    console.log('[SMART REPLIES V2 TEST] Generated replies:', replies);

    return NextResponse.json({
      success: true,
      replies,
      metadata: {
        version: 'v2-enhanced',
        cached: false, // TODO: Track cache hits
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[SMART REPLIES V2 TEST] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate smart replies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing with query params
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const description = searchParams.get('description');
  const category = searchParams.get('category');
  const userTier = searchParams.get('userTier') as 'free' | 'pro' | 'enterprise' | null;
  const voteCount = parseInt(searchParams.get('voteCount') || '0');

  if (!title) {
    return NextResponse.json(
      { error: 'Title is required' },
      { status: 400 }
    );
  }

  try {
    const replies = await generateSmartRepliesWithCache({
      title,
      description: description || '',
      category: category || undefined,
      userTier: userTier || undefined,
      voteCount
    });

    return NextResponse.json({
      success: true,
      replies,
      metadata: {
        version: 'v2-enhanced',
        testMode: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[SMART REPLIES V2 TEST] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate smart replies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
