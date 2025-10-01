import { NextRequest, NextResponse } from 'next/server';
import { categorizeFeedback, batchCategorizeFeedback, getCurrentModel } from '@/lib/ai-categorization';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/ai/categorize
 * Categorizes feedback posts using AI
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🤖 AI Categorize API called');

    const body = await request.json();
    console.log('🤖 Request body:', body);
    
    // Handle single post categorization
    if (body.title) {
      const { title, description } = body;
      console.log('🤖 Categorizing:', { title, description });
      
      if (!title || typeof title !== 'string') {
        return NextResponse.json(
          { error: 'Title is required and must be a string' },
          { status: 400 }
        );
      }

      const result = await categorizeFeedback(title, description);
      console.log('🤖 Categorization result:', result);
      
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
export async function GET(request: NextRequest) {
  try {
    // Check authentication and plan
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Check if user has Pro plan
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }

    if (userData.plan !== 'pro') {
      return NextResponse.json(
        { 
          error: 'AI categorization is a Pro feature',
          upgrade_required: true,
          feature: 'ai_categorization'
        },
        { status: 403 }
      );
    }

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
  } catch (error) {
    console.error('Error in AI categorization GET API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
