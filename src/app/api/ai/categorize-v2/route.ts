import { NextRequest, NextResponse } from 'next/server';
import { categorizePost } from '@/lib/enhanced-categorization';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * TEST ENDPOINT for Enhanced Categorization
 * Use this to test the new categorization system before replacing production
 *
 * POST /api/ai/categorize-v2
 * Body: {
 *   title: string,
 *   description?: string,
 *   authorEmail?: string,
 *   voteCount?: number,
 *   userTier?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      authorEmail,
      voteCount,
      userTier
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    console.log('[CATEGORIZATION V2 TEST] Categorizing:', {
      title,
      userTier,
      voteCount
    });

    const result = await categorizePost(
      title,
      description,
      {
        authorEmail,
        voteCount,
        userTier
      }
    );

    console.log('[CATEGORIZATION V2 TEST] Result:', result);

    return NextResponse.json({
      success: true,
      result,
      metadata: {
        version: 'v2-enhanced',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[CATEGORIZATION V2 TEST] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to categorize',
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
  const userTier = searchParams.get('userTier');
  const voteCount = parseInt(searchParams.get('voteCount') || '0');

  if (!title) {
    return NextResponse.json(
      { error: 'Title is required' },
      { status: 400 }
    );
  }

  try {
    const result = await categorizePost(
      title,
      description || '',
      {
        voteCount,
        userTier: userTier || undefined
      }
    );

    return NextResponse.json({
      success: true,
      result,
      metadata: {
        version: 'v2-enhanced',
        testMode: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[CATEGORIZATION V2 TEST] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to categorize',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
