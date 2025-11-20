/**
 * API Route for AI Spec Generation
 * POST /api/specs/generate - Generate spec using AI with streaming progress
 */

import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { checkAIUsageLimit } from '@/lib/ai-rate-limit';
import { generateEmbedding, prepareSpecForEmbedding, generateContentHash } from '@/lib/specs/embeddings';
import { SPEC_GENERATION_SYSTEM_PROMPT, getSpecGenerationPrompt, getFeedbackSynthesisPrompt } from '@/lib/specs/prompts';
import { generateDefaultContent } from '@/lib/specs/templates';
import type {
  GenerateSpecRequest,
  GeneratedSpecResult,
  GenerationStep,
  FeedbackContext,
  PastSpecContext,
  PersonaContext,
  CompetitorContext,
  ContextSourceMetadata,
  FeedbackSynthesis,
} from '@/types/specs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// POST /api/specs/generate - Generate spec with streaming
// ============================================================================

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return new Response('Database connection not available', { status: 500 });
  }

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body: GenerateSpecRequest = await request.json();
    const { projectId, input, template, context } = body;

    // Check AI rate limit
    const limitCheck = await checkAIUsageLimit(projectId, 'writing_assistant');

    if (!limitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'AI usage limit reached',
          upgradeUrl: '/settings/billing',
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const sendProgress = (step: GenerationStep, progress: number, message: string) => {
          const data = JSON.stringify({
            type: 'progress',
            data: { step, progress, message },
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        const sendError = (error: string) => {
          const data = JSON.stringify({
            type: 'error',
            data: { error },
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        const sendComplete = (result: GeneratedSpecResult) => {
          const data = JSON.stringify({
            type: 'complete',
            data: result,
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        };

        try {
          const startTime = Date.now();

          // Step 1: Analyze input
          sendProgress('analyzing', 10, 'Analyzing input idea...');

          let ideaText = '';
          let feedbackItems: FeedbackContext[] = [];

          if (input.type === 'idea') {
            ideaText = input.idea || '';
          } else if (input.type === 'feedback' && input.feedbackIds) {
            // Synthesize feedback into an idea
            const { data: feedback } = await supabase
              .from('posts')
              .select('id, content, upvotes, classification')
              .in('id', input.feedbackIds);

            if (feedback && feedback.length > 0) {
              feedbackItems = feedback.map((f) => ({
                id: f.id,
                content: f.content,
                votes: f.upvotes || 0,
                segment: f.classification,
                relevanceScore: 1.0,
              }));

              // Use AI to synthesize feedback
              const synthesisPrompt = getFeedbackSynthesisPrompt(
                feedback.map((f) => ({ id: f.id, content: f.content, votes: f.upvotes || 0 }))
              );

              const synthesisResponse = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: synthesisPrompt }],
                response_format: { type: 'json_object' },
              });

              const synthesis: FeedbackSynthesis = JSON.parse(
                synthesisResponse.choices[0].message.content || '{}'
              );

              ideaText = synthesis.synthesizedProblem;
            }
          }

          // Step 2: Build context from retrieved sources
          sendProgress('retrieving', 30, 'Retrieving context from past specs and feedback...');

          const pastSpecs: PastSpecContext[] = [];
          const personas: PersonaContext[] = [];
          const competitors: CompetitorContext[] = [];

          // Fetch past specs if IDs provided
          if (context.includePatterns.length > 0) {
            const { data: specs } = await supabase
              .from('specs')
              .select('id, title, content, created_at')
              .in('id', context.includePatterns);

            if (specs) {
              pastSpecs.push(
                ...specs.map((s) => ({
                  id: s.id,
                  title: s.title,
                  preview: s.content.substring(0, 500),
                  relevanceScore: 0.85,
                  created_at: s.created_at,
                }))
              );
            }
          }

          // Fetch personas if IDs provided
          if (context.includePersonas.length > 0) {
            const { data: personasData } = await supabase
              .from('personas')
              .select('id, name, description')
              .in('id', context.includePersonas);

            if (personasData) {
              personas.push(
                ...personasData.map((p) => ({
                  id: p.id,
                  name: p.name,
                  description: p.description,
                  relevanceScore: 0.9,
                }))
              );
            }
          }

          // Fetch competitor features if IDs provided
          if (context.includeCompetitors.length > 0) {
            const { data: competitorsData } = await supabase
              .from('competitive_insights')
              .select('id, competitor_name, insight_type, description')
              .in('id', context.includeCompetitors);

            if (competitorsData) {
              competitors.push(
                ...competitorsData.map((c) => ({
                  id: c.id,
                  name: c.competitor_name,
                  feature: c.insight_type,
                  description: c.description,
                  relevanceScore: 0.8,
                }))
              );
            }
          }

          // Step 3: Generate spec using AI
          sendProgress('generating_problem', 50, 'Generating problem statement...');

          const generationPrompt = getSpecGenerationPrompt({
            idea: ideaText,
            template,
            feedback: feedbackItems,
            pastSpecs,
            personas,
            competitors,
            customContext: context.customContext,
          });

          let totalTokens = 0;
          let generatedContent = '';

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: SPEC_GENERATION_SYSTEM_PROMPT },
              { role: 'user', content: generationPrompt },
            ],
            temperature: 0.7,
            max_tokens: 4000,
          });

          generatedContent = completion.choices[0].message.content || '';
          totalTokens = completion.usage?.total_tokens || 0;

          sendProgress('generating_stories', 70, 'Writing user stories...');
          sendProgress('generating_criteria', 80, 'Defining acceptance criteria...');
          sendProgress('finalizing', 90, 'Final review and formatting...');

          // Extract title from generated content
          const titleMatch = generatedContent.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : ideaText.substring(0, 100);

          // Create spec in database
          const contextSources: ContextSourceMetadata[] = [
            ...pastSpecs.map((s) => ({
              type: 'past_spec' as const,
              id: s.id,
              title: s.title,
              preview: s.preview,
              relevanceScore: s.relevanceScore,
            })),
            ...personas.map((p) => ({
              type: 'persona' as const,
              id: p.id,
              title: p.name,
              preview: p.description,
              relevanceScore: p.relevanceScore,
            })),
            ...competitors.map((c) => ({
              type: 'competitor' as const,
              id: c.id,
              title: `${c.name} - ${c.feature}`,
              preview: c.description,
              relevanceScore: c.relevanceScore,
            })),
            ...feedbackItems.map((f) => ({
              type: 'feedback' as const,
              id: f.id,
              title: f.content.substring(0, 100),
              preview: f.content,
              relevanceScore: f.relevanceScore,
            })),
          ];

          const { data: spec, error: insertError } = await supabase
            .from('specs')
            .insert({
              project_id: projectId,
              created_by: user.id,
              title,
              input_idea: ideaText,
              content: generatedContent,
              status: 'draft',
              template,
              generation_model: 'gpt-4o',
              generation_tokens: totalTokens,
              generation_time_ms: Date.now() - startTime,
              context_sources: contextSources,
              linked_feedback_ids: input.feedbackIds || [],
            })
            .select()
            .single();

          if (insertError) {
            throw new Error('Failed to create spec: ' + insertError.message);
          }

          // Create initial version
          await supabase.from('spec_versions').insert({
            spec_id: spec.id,
            version_number: 1,
            content: generatedContent,
            changed_by: user.id,
            change_summary: 'Initial AI-generated version',
          });

          // Generate and store embedding for RAG
          try {
            const embeddingText = prepareSpecForEmbedding({
              title,
              content: generatedContent,
              input_idea: ideaText,
            });

            const embedding = await generateEmbedding(embeddingText);
            const contentHash = generateContentHash(embeddingText);

            await supabase.from('spec_embeddings').insert({
              spec_id: spec.id,
              embedding,
              content_hash: contentHash,
            });
          } catch (embeddingError) {
            console.error('Error generating embedding:', embeddingError);
            // Don't fail the request if embedding generation fails
          }

          // Store context sources
          const contextSourcesRecords = contextSources.map((source) => ({
            spec_id: spec.id,
            source_type: source.type,
            source_id: source.id,
            relevance_score: source.relevanceScore,
            content_preview: source.preview,
          }));

          if (contextSourcesRecords.length > 0) {
            await supabase.from('spec_context_sources').insert(contextSourcesRecords);
          }

          // Send completion
          const result: GeneratedSpecResult = {
            specId: spec.id,
            title,
            content: generatedContent,
            generationTimeMs: Date.now() - startTime,
            tokensUsed: totalTokens,
            contextSources,
          };

          sendProgress('complete', 100, 'Generation complete!');
          sendComplete(result);
        } catch (error) {
          console.error('Error generating spec:', error);
          sendError(error instanceof Error ? error.message : 'Generation failed');
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in POST /api/specs/generate:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
