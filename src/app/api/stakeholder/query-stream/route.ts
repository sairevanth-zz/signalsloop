import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateStakeholderResponse } from '@/lib/stakeholder/response-generator';
import { fetchProjectContext, fetchComponentData } from '@/lib/stakeholder/data-fetcher';

export const runtime = 'nodejs';
export const maxDuration = 10; // Vercel free tier limit

/**
 * Streaming Stakeholder Query API
 *
 * Streams components as they're generated for better UX
 * Uses Server-Sent Events (SSE) to send incremental updates
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await request.json();
        const { query, role, projectId } = body;

        if (!query || !role || !projectId) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Missing required fields' })}\n\n`)
          );
          controller.close();
          return;
        }

        // Get Supabase client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Supabase credentials not configured' })}\n\n`)
          );
          controller.close();
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Authenticate user
        const authHeader = request.headers.get('authorization');
        let userId: string | null = null;

        if (authHeader) {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user } } = await supabase.auth.getUser(token);
          userId = user?.id || null;
        }

        const startTime = Date.now();

        // Send initial status
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Analyzing your question...' })}\n\n`)
        );

        // Fetch context and generate response
        const contextData = await fetchProjectContext(supabase, projectId);
        const responsePlan = await generateStakeholderResponse(query, role, contextData, projectId);

        // Send component count
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'plan',
              componentCount: responsePlan.components.length,
              summary: responsePlan.summary
            })}\n\n`
          )
        );

        // Stream each component as it's generated
        for (let i = 0; i < responsePlan.components.length; i++) {
          const component = responsePlan.components[i];

          // Send status update
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'status',
                message: `Generating component ${i + 1}/${responsePlan.components.length}...`
              })}\n\n`
            )
          );

          // Fetch data if needed
          if (component.data_query) {
            const dataResult = await fetchComponentData(
              supabase,
              projectId,
              component.data_query.type,
              component.data_query.params
            );
            if (dataResult.data) {
              component.props = { ...component.props, ...dataResult.data };
            }
          }

          // Send component
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'component',
                component,
                index: i,
                total: responsePlan.components.length
              })}\n\n`
            )
          );

          // Small delay between components for visual effect
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const generationTime = Date.now() - startTime;

        // Save query to database
        if (userId) {
          try {
            await supabase.from('stakeholder_queries').insert({
              project_id: projectId,
              user_id: userId,
              query_text: query,
              user_role: role,
              response_components: responsePlan.components,
              generation_time_ms: generationTime,
            });
          } catch (dbError) {
            console.error('[Query Stream] Failed to save query:', dbError);
          }
        }

        // Send completion
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'complete',
              summary: responsePlan.summary,
              followUpQuestions: responsePlan.follow_up_questions || [],
              generationTime
            })}\n\n`
          )
        );

        controller.close();
      } catch (error: any) {
        console.error('[Query Stream] Error:', error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'error',
              message: 'Failed to process query',
              details: error.message
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
