import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai-client';
import { checkAIUsageLimit, incrementAIUsage } from '@/lib/ai-rate-limit';
import { checkDemoRateLimit, incrementDemoUsage, getClientIP, getTimeUntilReset } from '@/lib/demo-rate-limit';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;


const AUTO_RESPONSE_MODEL = process.env.AUTO_RESPONSE_MODEL || 'gpt-4o-mini';

/**
 * POST /api/ai/auto-response
 * Generate personalized AI responses to user feedback
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, projectId, title, description, postType, authorName } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Check rate limit if projectId is provided
    if (projectId) {
      const usageCheck = await checkAIUsageLimit(projectId, 'auto_response');

      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `You've reached your monthly limit of ${usageCheck.limit} AI auto-responses. ${
              usageCheck.isPro ? 'Please try again next month.' : 'Upgrade to Pro for unlimited auto-responses!'
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
      const demoCheck = checkDemoRateLimit(clientIP, 'smart_replies'); // Use smart_replies limit for auto-response

      if (!demoCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Demo rate limit exceeded',
            message: `You've reached the demo limit of ${demoCheck.limit} auto-responses per hour. Try again in ${getTimeUntilReset(demoCheck.resetAt)} or sign up for unlimited access!`,
            limit: demoCheck.limit,
            remaining: demoCheck.remaining,
            resetAt: demoCheck.resetAt,
            isDemo: true
          },
          { status: 429 }
        );
      }
    }

    if (postId) {
      const supabase = getSupabaseServerClient();

      if (!supabase) {
        return NextResponse.json(
          { error: 'Database connection not available' },
          { status: 500 }
        );
      }

      const { data: postRecord, error: postError } = await supabase
        .from('posts')
        .select('id, duplicate_of')
        .eq('id', postId)
        .single();

      if (postError || !postRecord) {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }

      if (postRecord.duplicate_of) {
        return NextResponse.json(
          { error: 'This post has been merged into another post. AI responses are disabled.' },
          { status: 403 }
        );
      }
    }

    // Determine response tone and content based on post type
    const responseGuidelines = getResponseGuidelines(postType);

    const prompt = `You are a professional product manager responding to user feedback.

Feedback Details:
- Title: ${title}
- Description: ${description || 'No additional details provided'}
- Type: ${postType}
- Author: ${authorName || 'User'}

Guidelines:
${responseGuidelines}

Generate a professional, empathetic response that:
1. Thanks the user for their feedback
2. Acknowledges their specific concern or request
3. ${postType === 'bug' ? 'Assures them the issue will be investigated' : 'Asks clarifying questions to better understand their needs'}
4. Shows genuine interest in improving their experience
5. Ends with a professional sign-off

Keep the response concise (2-3 paragraphs), personal, and actionable. Address the user by name if provided, otherwise use "Hi there".`;

    const completion = await getOpenAI().chat.completions.create({
      model: AUTO_RESPONSE_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a professional product manager who writes empathetic, clear, and actionable responses to user feedback. Your responses should feel personal, not templated.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || '';

    // Increment usage after successful generation
    if (projectId) {
      await incrementAIUsage(projectId, 'auto_response');
    } else {
      const clientIP = getClientIP(request);
      incrementDemoUsage(clientIP, 'smart_replies');
    }

    return NextResponse.json({
      success: true,
      response,
      model: AUTO_RESPONSE_MODEL,
      postId
    });

  } catch (error) {
    console.error('[AUTO RESPONSE] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate auto-response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getResponseGuidelines(postType: string): string {
  switch (postType.toLowerCase()) {
    case 'bug':
      return `- Express concern about the issue affecting their experience
- Acknowledge the disruption caused
- Commit to investigating promptly
- Ask for specific reproduction steps or additional context if needed`;

    case 'feature':
    case 'feature_request':
      return `- Show enthusiasm for their idea
- Ask probing questions to understand the use case better
- Inquire about how they would prioritize this versus other improvements
- Seek to understand the impact on their workflow`;

    case 'improvement':
      return `- Validate their suggestion for enhancement
- Ask how the current functionality falls short
- Inquire about their ideal experience
- Explore if there are workarounds they're currently using`;

    case 'question':
      return `- Thank them for reaching out
- Acknowledge their question
- Offer to provide clarification
- Ask follow-up questions to ensure you understand what they need`;

    default:
      return `- Show appreciation for their input
- Acknowledge the specific feedback
- Ask clarifying questions to better understand their needs
- Express commitment to improving their experience`;
  }
}
