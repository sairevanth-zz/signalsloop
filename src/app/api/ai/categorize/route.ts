import { NextRequest, NextResponse } from 'next/server';
import { categorizeFeedback, batchCategorizeFeedback, getCurrentModel } from '@/lib/ai-categorization';

/**
 * POST /api/ai/categorize
 * Categorizes feedback posts using AI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle single post categorization
    if (body.title) {
      const { title, description } = body;
      
      if (!title || typeof title !== 'string') {
        return NextResponse.json(
          { error: 'Title is required and must be a string' },
          { status: 400 }
        );
      }

      const result = await categorizeFeedback(title, description);
      
      return NextResponse.json({
        success: true,
        result,
        model: getCurrentModel()
      });
    }
    
    // Handle batch categorization
    if (Array.isArray(body.posts)) {
      if (body.posts.length === 0) {
        return NextResponse.json(
          { error: 'Posts array cannot be empty' },
          { status: 400 }
        );
      }

      // Validate posts structure
      for (const post of body.posts) {
        if (!post.title || typeof post.title !== 'string') {
          return NextResponse.json(
            { error: 'Each post must have a title string' },
            { status: 400 }
          );
        }
      }

      const results = await batchCategorizeFeedback(body.posts);
      
      return NextResponse.json({
        success: true,
        results,
        model: getCurrentModel()
      });
    }

    return NextResponse.json(
      { error: 'Invalid request format. Provide either {title, description?} or {posts: []}' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in AI categorization API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/categorize
 * Returns available categories and their descriptions
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    categories: {
      'Bug': 'Reports of broken functionality, errors, or unexpected behavior',
      'Feature Request': 'Requests for new features or functionality',
      'Improvement': 'Suggestions to enhance existing features',
      'UI/UX': 'Issues or suggestions related to user interface or user experience',
      'Integration': 'Requests or issues related to third-party integrations',
      'Performance': 'Issues or suggestions related to speed, efficiency, or resource usage',
      'Documentation': 'Requests for better documentation or help content',
      'Other': 'Anything that doesn\'t fit the above categories'
    },
    model: getCurrentModel()
  });
}
