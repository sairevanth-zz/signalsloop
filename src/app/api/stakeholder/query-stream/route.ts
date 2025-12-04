import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { generateResponsePlan } from '@/lib/stakeholder/response-generator';
import { fetchComponentData } from '@/lib/stakeholder/data-fetcher';
import { createServerClient } from '@/lib/supabase-server';

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

        // Authenticate user
        const supabase = await createServerClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Unauthorized' })}\n\n`)
          );
          controller.close();
          return;
        }

        // Verify project access
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('id, owner_id')
          .eq('id', projectId)
          .single();

        if (projectError || !project || project.owner_id !== user.id) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Project not found' })}\n\n`)
          );
          controller.close();
          return;
        }

        const startTime = Date.now();

        // Send initial status
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Analyzing your question...' })}\n\n`)
        );

        // Generate response plan
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const responsePlan = await generateResponsePlan(anthropic, query, role, projectId, supabase);

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
        try {
          await supabase.from('stakeholder_queries').insert({
            project_id: projectId,
            user_id: user.id,
            query_text: query,
            user_role: role,
            response_components: responsePlan.components,
            generation_time_ms: generationTime,
          });
        } catch (dbError) {
          console.error('[Query Stream] Failed to save query:', dbError);
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
