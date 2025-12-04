/**
 * Stakeholder Query API
 * Processes natural language queries and generates component-based responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateStakeholderResponse } from '@/lib/stakeholder/response-generator';
import { fetchProjectContext } from '@/lib/stakeholder/data-fetcher';
import { QueryRequest, QueryResponse } from '@/types/stakeholder';

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
          model_used: 'gpt-4o',
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
        model_used: 'gpt-4o',
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
