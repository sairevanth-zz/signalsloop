/**
 * Proactive Spec Writer Agent (Event-Driven)
 *
 * Listens to: theme.threshold_reached events
 * Actions: Automatically drafts specs for high-volume themes (20+ feedback)
 * Triggers: spec.auto_drafted event (via database trigger)
 *
 * This agent replaced the cron-based /api/cron/proactive-spec-writer workflow
 * Now specs are generated immediately when a theme reaches threshold, not daily
 *
 * MIGRATION: Now uses multi-provider AI router with Claude for long-context tasks
 * - Handles 200K tokens (vs 128K with GPT-4o)
 * - Can process 50+ feedback items without chunking
 * - Better spec quality with full context
 */

import { DomainEvent } from '@/lib/events/types';
import { complete } from '@/lib/ai/router';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { generateEmbedding, prepareSpecForEmbedding, generateContentHash } from '@/lib/specs/embeddings';
import { SPEC_GENERATION_SYSTEM_PROMPT, getSpecGenerationPrompt, getFeedbackSynthesisPrompt } from '@/lib/specs/prompts';
import { formatMemoryContext, recordAgentMemory, searchAgentMemory } from './memory';
import type { PastSpecContext } from '@/types/specs';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Handle theme.threshold_reached event
 * Automatically draft spec when theme hits 20+ feedback items
 */
export async function handleThemeThresholdReached(event: DomainEvent): Promise<void> {
  const startTime = Date.now();
  const { payload, metadata } = event;

  console.log(`[SPEC WRITER AGENT] 📨 Theme threshold reached: ${payload.theme_name} (${payload.frequency} feedback items)`);

  try {
    const supabase = getServiceRoleClient();
    const themeId = event.aggregate_id;
    const projectId = metadata.project_id;

    // Check if spec already exists for this theme
    const { data: existingSpecs } = await supabase
      .from('specs')
      .select('id, title')
      .eq('project_id', projectId)
      .ilike('title', `%${payload.theme_name}%`)
      .limit(1);

    if (existingSpecs && existingSpecs.length > 0) {
      console.log(`[SPEC WRITER AGENT] ⏭️  Spec already exists: "${existingSpecs[0].title}"`);
      return;
    }

    // Get feedback items for this theme
    const { data: feedbackThemes, error: feedbackError } = await supabase
      .from('feedback_themes')
      .select(`
        feedback_id,
        confidence,
        posts (
          id,
          title,
          content,
          vote_count,
          sentiment_analysis (
            sentiment_score
          )
        )
      `)
      .eq('theme_id', themeId)
      .order('confidence', { ascending: false })
      .limit(50);

    if (feedbackError || !feedbackThemes || feedbackThemes.length === 0) {
      console.error('[SPEC WRITER AGENT] ❌ Failed to fetch feedback:', feedbackError);
      return;
    }

    const feedback = feedbackThemes
      .map((ft: any) => ft.posts)
      .filter(Boolean)
      .slice(0, 20); // Use top 20 items

    console.log(`[SPEC WRITER AGENT] 🤖 Auto-drafting spec with ${feedback.length} feedback items...`);

    // Synthesize feedback into problem statement
    const synthesisPrompt = getFeedbackSynthesisPrompt(
      feedback.map((f: any) => ({
        id: f.id,
        content: f.content || f.title,
        votes: f.vote_count || 0,
      }))
    );

    const synthesisResponse = await complete({
      type: 'reasoning',  // Synthesis requires reasoning ability
      messages: [{ role: 'user', content: synthesisPrompt }],
      options: {
        responseFormat: 'json',
        temperature: 0.7,
      },
      priority: 'medium',
    });

    const synthesis = JSON.parse(synthesisResponse.content || '{}');
    const ideaText = synthesis.synthesizedProblem || payload.theme_name;

    // Build vectorized context from the theme, synthesized idea, and top feedback
    const contextQuery = buildContextQuery(payload.theme_name, ideaText, feedback);
    let queryEmbedding: number[] | null = null;

    try {
      queryEmbedding = await generateEmbedding(contextQuery);
    } catch (contextEmbeddingError) {
      console.error('[SPEC WRITER AGENT] ⚠️  Failed to generate context embedding:', contextEmbeddingError);
    }

    const pastSpecs = queryEmbedding
      ? await fetchPastSpecsContext(supabase, projectId, queryEmbedding)
      : [];

    const sharedMemories = await searchAgentMemory({
      projectId,
      query: contextQuery,
      embedding: queryEmbedding || undefined,
      agentNames: ['spec-writer-agent', 'spec-quality-agent', 'triager-agent'],
      limit: 5,
      similarityThreshold: 0.55,
    });

    const contextSources = [
      ...pastSpecs.map((spec) => ({
        type: 'past_spec',
        id: spec.id,
        title: spec.title,
        preview: spec.preview,
        relevanceScore: spec.relevanceScore,
      })),
      ...sharedMemories.map((memory) => ({
        type: 'agent_memory',
        id: memory.id,
        title: memory.agent_name,
        preview: memory.content.slice(0, 240),
        relevanceScore: memory.similarity || 0,
      })),
    ];

    const memoryContextText = formatMemoryContext(sharedMemories);

    // Calculate total votes
    const totalVotes = feedback.reduce((sum: number, f: any) => sum + (f.vote_count || 0), 0);

    // Generate spec content
    const customContext = [
      `This spec was auto-generated based on ${payload.frequency} user requests (${totalVotes} total votes). High-demand feature cluster detected with average sentiment: ${payload.avg_sentiment?.toFixed(2) || 'N/A'}.`,
      pastSpecs.length > 0
        ? 'Avoid duplicating past specs above—extend or supersede them with clearer acceptance criteria and migration guidance.'
        : '',
      memoryContextText ? `Agent memory to honor:\n${memoryContextText}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const generationPrompt = getSpecGenerationPrompt({
      idea: ideaText,
      template: 'standard',
      feedback: feedback.map((f: any) => ({
        id: f.id,
        content: f.content || f.title,
        votes: f.vote_count || 0,
        segment: 'general',
        relevanceScore: 1.0,
      })),
      pastSpecs,
      personas: [],
      competitors: [],
      customContext,
    });

    // Estimate context length for smart routing
    const estimatedTokens = Math.ceil(
      (generationPrompt.length + SPEC_GENERATION_SYSTEM_PROMPT.length) / 4
    );

    console.log(`[SPEC WRITER AGENT] Generating spec with ~${estimatedTokens} context tokens`);

    const completion = await complete({
      type: 'generation',  // Router chooses GPT-4o or Claude based on context
      messages: [
        { role: 'system', content: SPEC_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: generationPrompt },
      ],
      options: {
        temperature: 0.7,
        maxTokens: 4000,
      },
      contextLength: estimatedTokens,  // Router uses Claude if >32K tokens
      priority: 'high',  // Use best available model for spec generation
    });

    const generatedContent = completion.content || '';
    const totalTokens = completion.usage.totalTokens || 0;

    console.log(`[SPEC WRITER AGENT] Generated with ${completion.provider}/${completion.model} (${totalTokens} tokens)`);

    // Extract title from generated content
    const titleMatch = generatedContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : `Spec: ${payload.theme_name}`;

    // Get project owner for created_by
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('owner_id, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('[SPEC WRITER AGENT] ❌ Project not found:', projectError);
      return;
    }

    // Create spec in database
    const { data: spec, error: insertError } = await supabase
      .from('specs')
      .insert({
        project_id: projectId,
        created_by: project.owner_id,
        title,
        input_idea: ideaText,
        content: generatedContent,
        status: 'draft', // PM must review before approving
        template: 'standard',
        generation_model: `${completion.provider}/${completion.model}`,  // Track which AI provider/model was used
        generation_tokens: totalTokens,
        generation_time_ms: Date.now() - startTime,
        context_sources: contextSources,
        linked_feedback_ids: feedback.map((f: any) => f.id),
        auto_generated: true, // Flag that this was auto-generated
      })
      .select()
      .single();

    if (insertError) {
      console.error('[SPEC WRITER AGENT] ❌ Failed to create spec:', insertError);
      throw insertError;
    }

    // Create initial version
    await supabase.from('spec_versions').insert({
      spec_id: spec.id,
      version_number: 1,
      content: generatedContent,
      changed_by: project.owner_id,
      change_summary: `Auto-generated from ${payload.frequency} feedback items for theme: ${payload.theme_name}`,
    });

    let embeddingTextForMemory: string | null = null;
    let specEmbedding: number[] | null = null;

    // Generate and store embedding
    try {
      embeddingTextForMemory = prepareSpecForEmbedding({
        title,
        content: generatedContent,
        input_idea: ideaText,
      });

      specEmbedding = await generateEmbedding(embeddingTextForMemory);
      const contentHash = generateContentHash(embeddingTextForMemory);

      await supabase.from('spec_embeddings').insert({
        spec_id: spec.id,
        embedding: specEmbedding,
        content_hash: contentHash,
      });
    } catch (embeddingError) {
      console.error('[SPEC WRITER AGENT] ⚠️  Failed to generate embedding:', embeddingError);
      // Continue anyway - embedding is not critical
    }

    try {
      await recordAgentMemory({
        projectId,
        agentName: 'spec-writer-agent',
        memoryType: 'spec_context',
        content: `Generated spec "${title}" for theme "${payload.theme_name}" with ${feedback.length} feedback signals (${totalVotes} votes).`,
        embeddingText: embeddingTextForMemory || undefined,
        embedding: specEmbedding || undefined,
        sourceId: spec.id,
        sourceType: 'spec',
        metadata: {
          context_sources: contextSources,
          theme_id: themeId,
          feedback_count: feedback.length,
          total_votes: totalVotes,
        },
        importance: 3,
      });
    } catch (memoryError) {
      console.error('[SPEC WRITER AGENT] ⚠️  Failed to persist agent memory:', memoryError);
    }

    const duration = Date.now() - startTime;
    console.log(`[SPEC WRITER AGENT] ✅ Auto-drafted spec in ${duration}ms:`, {
      specId: spec.id,
      title: title.substring(0, 60),
      feedbackCount: payload.frequency,
      totalVotes,
      tokens: totalTokens,
    });

    // The database trigger will automatically publish spec.auto_drafted event
    // which can trigger notification agents in Phase 3
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[SPEC WRITER AGENT] ❌ Error after ${duration}ms:`, error);

    // Don't throw - we don't want to crash the agent
    // The error is logged and can be retried later
  }
}

function buildContextQuery(themeName: string, idea: string, feedback: any[]): string {
  const feedbackSnippets = feedback
    .slice(0, 5)
    .map((f: any) => f.content || f.title || '')
    .filter(Boolean)
    .join('\n');

  return [
    `Theme: ${themeName}`,
    `Idea: ${idea}`,
    feedbackSnippets ? `Signals:\n${feedbackSnippets}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function fetchPastSpecsContext(
  supabase: SupabaseClient,
  projectId: string,
  queryEmbedding: number[]
): Promise<PastSpecContext[]> {
  if (!queryEmbedding || queryEmbedding.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase.rpc('search_similar_specs', {
      p_project_id: projectId,
      p_query_embedding: queryEmbedding,
      p_limit: 5,
      p_similarity_threshold: 0.65,
    });

    if (error) {
      console.error('[SPEC WRITER AGENT] ⚠️  Failed to fetch past specs:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.spec_id,
      title: row.title,
      preview: row.preview,
      relevanceScore: row.similarity,
      created_at: row.created_at,
    }));
  } catch (error) {
    console.error('[SPEC WRITER AGENT] ⚠️  Error while retrieving past specs:', error);
    return [];
  }
}

/**
 * Backfill specs for existing high-volume themes
 * Can be run manually to generate specs for themes that reached threshold before event system
 */
export async function backfillSpecsForThemes(projectId?: string): Promise<void> {
  console.log('[SPEC WRITER AGENT] 📦 Backfilling specs for high-volume themes...');

  const supabase = getServiceRoleClient();

  // Find themes with 20+ feedback that don't have specs
  let query = supabase
    .from('themes')
    .select('id, theme_name, project_id, frequency, avg_sentiment')
    .gte('frequency', 20)
    .order('frequency', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data: themes, error } = await query;

  if (error || !themes) {
    console.error('[SPEC WRITER AGENT] ❌ Failed to fetch themes:', error);
    return;
  }

  console.log(`[SPEC WRITER AGENT] Found ${themes.length} high-volume themes`);

  for (const theme of themes) {
    // Simulate theme.threshold_reached event
    await handleThemeThresholdReached({
      type: 'theme.threshold_reached',
      aggregate_type: 'theme',
      aggregate_id: theme.id,
      payload: {
        theme_name: theme.theme_name,
        frequency: theme.frequency,
        avg_sentiment: theme.avg_sentiment,
      },
      metadata: {
        project_id: theme.project_id,
        source: 'backfill',
      },
      version: 1,
    });

    // Rate limit to avoid overwhelming OpenAI
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('[SPEC WRITER AGENT] ✅ Backfill complete');
}
