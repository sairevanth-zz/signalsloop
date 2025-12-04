/**
 * Stakeholder Query API
 * Processes natural language queries and generates component-based responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateStakeholderResponse } from '@/lib/stakeholder/response-generator';
import { fetchProjectContext } from '@/lib/stakeholder/data-fetcher';
import { QueryRequest, QueryResponse } from '@/types/stakeholder';
import { checkUserRateLimits, checkProjectRateLimit, formatResetTime } from '@/lib/stakeholder/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: QueryRequest & { projectId: string } = await request.json();
    const { query, role = 'product', projectId, context } = body;

    if (!query || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: query, projectId' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user has access to project
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Apply rate limiting
    if (userId) {
      const userLimit = checkUserRateLimits(userId);
      if (!userLimit.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            details: `You've exceeded the ${userLimit.limit} rate limit. Please try again in ${formatResetTime(userLimit.resetAt!)}`,
            retryAfter: userLimit.resetAt,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': userLimit.limit || 'unknown',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': userLimit.resetAt?.toString() || '',
              'Retry-After': Math.ceil((userLimit.resetAt! - Date.now()) / 1000).toString(),
            },
          }
        );
      }
    }

    // Check project-level rate limit
    const projectLimit = checkProjectRateLimit(projectId);
    if (!projectLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Project rate limit exceeded',
          details: `This project has exceeded its daily query limit. Resets in ${formatResetTime(projectLimit.resetAt)}`,
          retryAfter: projectLimit.resetAt,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': 'project-daily',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': projectLimit.resetAt.toString(),
            'Retry-After': Math.ceil((projectLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Fetch context data for the project
    const contextData = await fetchProjectContext(projectId);

    // Generate response using GPT-4o
    const componentResponse = await generateStakeholderResponse(
      query,
      role,
      contextData,
      projectId
    );

    const generationTime = Date.now() - startTime;

    // Store query in database
    if (userId) {
      try {
        await supabase.from('stakeholder_queries').insert({
          project_id: projectId,
          user_id: userId,
          query_text: query,
          user_role: role,
          response_components: componentResponse.components,
          follow_up_questions: componentResponse.follow_up_questions,
          generation_time_ms: generationTime,
          model_used: 'claude-sonnet-4',
        });
      } catch (error) {
        console.error('[Stakeholder API] Error storing query:', error);
        // Continue even if storage fails
      }
    }

    // Build response
    const response: QueryResponse = {
      query_id: crypto.randomUUID(),
      components: componentResponse.components,
      follow_up_questions: componentResponse.follow_up_questions || [],
      metadata: {
        generation_time_ms: generationTime,
        model_used: 'claude-sonnet-4',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Stakeholder API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process query',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
