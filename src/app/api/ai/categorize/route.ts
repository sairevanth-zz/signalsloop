import { NextRequest, NextResponse } from 'next/server';
import { categorizePost, SAAS_CATEGORIES } from '@/lib/enhanced-categorization';
import { createClient } from '@supabase/supabase-js';
import { checkAIUsageLimit, incrementAIUsage } from '@/lib/ai-rate-limit';
import { checkDemoRateLimit, incrementDemoUsage, getClientIP, getTimeUntilReset } from '@/lib/demo-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/ai/categorize
 * Categorizes feedback posts using enhanced AI system
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🤖 AI Categorize API called');

    const body = await request.json();
    console.log('🤖 Request body:', body);

    let demoUsageInfo: { limit: number; remaining: number; resetAt: number } | null = null;

    // Check rate limit if projectId is provided
    if (body.projectId) {
      const usageCheck = await checkAIUsageLimit(body.projectId, 'categorization');

      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `You've reached your monthly limit of ${usageCheck.limit} AI categorizations. ${
              usageCheck.isPro ? 'Please try again next month.' : 'Upgrade to Pro for 50,000 categorizations per month!'
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
      const demoCheck = checkDemoRateLimit(clientIP, 'categorization');

      if (!demoCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Demo rate limit exceeded',
            message: `You've reached the demo limit of ${demoCheck.limit} categorizations per hour. Try again in ${getTimeUntilReset(demoCheck.resetAt)} or sign up for unlimited access!`,
            limit: demoCheck.limit,
            remaining: demoCheck.remaining,
            resetAt: demoCheck.resetAt,
            isDemo: true
          },
          { status: 429 }
        );
      }

      demoUsageInfo = {
        limit: demoCheck.limit,
        remaining: Math.max(demoCheck.remaining, 0),
        resetAt: demoCheck.resetAt
      };
    }

    // Handle single post categorization
    if (body.title) {
      const { title, description, projectId, userTier, voteCount } = body;
      console.log('🤖 Categorizing:', { title, description });

      if (!title || typeof title !== 'string') {
        return NextResponse.json(
          { error: 'Title is required and must be a string' },
          { status: 400 }
        );
      }

      const enhancedResult = await categorizePost(title, description || '', {
        userTier: userTier || 'free',
        voteCount: voteCount || 0,
      });

      console.log('🤖 Categorization result:', enhancedResult);

      // Transform to simple format for frontend
      const result = {
        category: enhancedResult.primaryCategory,
        confidence: enhancedResult.confidence,
        reasoning: enhancedResult.reasoning
      };

      // Increment usage after successful categorization
      if (projectId) {
        await incrementAIUsage(projectId, 'categorization');
      } else {
        const clientIP = getClientIP(request);
        incrementDemoUsage(clientIP, 'categorization');
      }

      let usageInfo = null;
      if (projectId) {
        const usage = await checkAIUsageLimit(projectId, 'categorization');
        usageInfo = {
          current: usage.current + 1,
          limit: usage.limit,
          remaining: usage.remaining - 1,
          isPro: usage.isPro
        };
      } else if (demoUsageInfo) {
        usageInfo = {
          limit: demoUsageInfo.limit,
          remaining: Math.max(demoUsageInfo.remaining, 0)
        };
      }

      return NextResponse.json({
        success: true,
        result,
        model: process.env.CATEGORIZATION_MODEL || 'gpt-4o-mini',
        usage: usageInfo
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

      const results = await Promise.all(
        body.posts.map(async (post: any) => ({
          id: post.id,
          result: await categorizePost(post.title, post.description || '', {
            userTier: post.userTier || 'free',
            voteCount: post.voteCount || 0,
          })
        }))
      );

      if (projectId) {
        await incrementAIUsage(projectId, 'categorization', body.posts.length);
      } else if (demoUsageInfo) {
        const clientIP = getClientIP(request);
        incrementDemoUsage(clientIP, 'categorization', body.posts.length);
        demoUsageInfo = {
          ...demoUsageInfo,
          remaining: Math.max(demoUsageInfo.remaining - Math.max(body.posts.length - 1, 0), 0)
        };
      } else if (!projectId) {
        const clientIP = getClientIP(request);
        incrementDemoUsage(clientIP, 'categorization', body.posts.length);
      }

      return NextResponse.json({
        success: true,
        results,
        model: process.env.CATEGORIZATION_MODEL || 'gpt-4o-mini',
        usage: demoUsageInfo || undefined
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

    // Return enhanced categories
    const categories = Object.entries(SAAS_CATEGORIES).reduce((acc, [name, config]) => {
      acc[name] = config.description;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({
      success: true,
      categories,
      model: process.env.CATEGORIZATION_MODEL || 'gpt-4o-mini'
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
