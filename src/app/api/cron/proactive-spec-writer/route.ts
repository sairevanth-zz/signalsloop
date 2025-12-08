/**
 * Proactive Spec Writer Cron Job
 * Runs daily to auto-draft specs for high-volume feedback clusters
 *
 * Workflow:
 * 1. Find themes with 20+ feedback items
 * 2. Check if spec already exists for that theme
 * 3. Auto-generate spec using existing generation logic
 * 4. Notify PM that spec is ready for review
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai-client';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { generateEmbedding, prepareSpecForEmbedding, generateContentHash } from '@/lib/specs/embeddings';
import { SPEC_GENERATION_SYSTEM_PROMPT, getSpecGenerationPrompt, getFeedbackSynthesisPrompt } from '@/lib/specs/prompts';

// Threshold for auto-spec generation
const FEEDBACK_CLUSTER_THRESHOLD = 20;

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

interface FeedbackCluster {
  theme_id: string;
  theme_name: string;
  project_id: string;
  feedback_count: number;
  feedback_ids: string[];
  avg_sentiment: number;
  total_votes: number;
}

/**
 * Detect feedback clusters that need specs
 */
async function detectFeedbackClusters(): Promise<FeedbackCluster[]> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) throw new Error('Database not available');

  // Get themes with high feedback volume
  const { data: themes, error: themesError } = await supabase
    .from('themes')
    .select('id, theme_name, project_id, frequency, avg_sentiment')
    .gte('frequency', FEEDBACK_CLUSTER_THRESHOLD)
    .order('frequency', { ascending: false });

  if (themesError || !themes) {
    console.error('Error fetching themes:', themesError);
    return [];
  }

  const clusters: FeedbackCluster[] = [];

  for (const theme of themes) {
    // Check if spec already exists for this theme
    const { data: existingSpecs } = await supabase
      .from('specs')
      .select('id')
      .eq('project_id', theme.project_id)
      .ilike('title', `%${theme.theme_name}%`)
      .limit(1);

    if (existingSpecs && existingSpecs.length > 0) {
      console.log(`✅ Spec already exists for theme: ${theme.theme_name}`);
      continue;
    }

    // Get feedback items for this theme
    const { data: feedbackItems, error: feedbackError } = await supabase
      .from('posts')
      .select('id, title, content, vote_count, sentiment_score')
      .eq('project_id', theme.project_id)
      .contains('themes', [theme.theme_name])
      .order('vote_count', { ascending: false })
      .limit(50);

    if (feedbackError || !feedbackItems || feedbackItems.length < FEEDBACK_CLUSTER_THRESHOLD) {
      continue;
    }

    clusters.push({
      theme_id: theme.id,
      theme_name: theme.theme_name,
      project_id: theme.project_id,
      feedback_count: feedbackItems.length,
      feedback_ids: feedbackItems.map(f => f.id),
      avg_sentiment: theme.avg_sentiment || 0,
      total_votes: feedbackItems.reduce((sum, f) => sum + (f.vote_count || 0), 0),
    });
  }

  return clusters;
}

/**
 * Auto-generate spec for a feedback cluster
 */
async function autoGenerateSpec(cluster: FeedbackCluster): Promise<string | null> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) throw new Error('Database not available');

  try {
    console.log(`🤖 Auto-generating spec for: ${cluster.theme_name} (${cluster.feedback_count} items)`);

    // Fetch feedback content
    const { data: feedback } = await supabase
      .from('posts')
      .select('id, title, content, vote_count, sentiment_score')
      .in('id', cluster.feedback_ids.slice(0, 20)); // Use top 20 items

    if (!feedback || feedback.length === 0) {
      return null;
    }

    // Synthesize feedback into problem statement
    const synthesisPrompt = getFeedbackSynthesisPrompt(
      feedback.map(f => ({
        id: f.id,
        content: f.content || f.title,
        votes: f.vote_count || 0,
      }))
    );

    const synthesisResponse = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: synthesisPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const synthesis = JSON.parse(synthesisResponse.choices[0].message.content || '{}');
    const ideaText = synthesis.synthesizedProblem || cluster.theme_name;

    // Generate spec content
    const generationPrompt = getSpecGenerationPrompt({
      idea: ideaText,
      template: 'standard',
      feedback: feedback.map(f => ({
        id: f.id,
        content: f.content || f.title,
        votes: f.vote_count || 0,
        segment: 'general',
        relevanceScore: 1.0,
      })),
      pastSpecs: [],
      personas: [],
      competitors: [],
      customContext: `This spec was auto-generated based on ${cluster.feedback_count} user requests (${cluster.total_votes} votes). High-demand feature cluster detected.`,
    });

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SPEC_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: generationPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const generatedContent = completion.choices[0].message.content || '';
    const totalTokens = completion.usage?.total_tokens || 0;

    // Extract title
    const titleMatch = generatedContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : `Spec: ${cluster.theme_name}`;

    // Get project owner for created_by
    const { data: project } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', cluster.project_id)
      .single();

    if (!project) {
      throw new Error('Project not found');
    }

    // Create spec in database
    const { data: spec, error: insertError } = await supabase
      .from('specs')
      .insert({
        project_id: cluster.project_id,
        created_by: project.owner_id,
        title,
        input_idea: ideaText,
        content: generatedContent,
        status: 'draft', // PM must review before approving
        template: 'standard',
        generation_model: 'gpt-4o',
        generation_tokens: totalTokens,
        generation_time_ms: 0,
        context_sources: [],
        linked_feedback_ids: cluster.feedback_ids.slice(0, 20),
        auto_generated: true, // Flag for auto-generated specs
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating spec:', insertError);
      return null;
    }

    // Create initial version
    await supabase.from('spec_versions').insert({
      spec_id: spec.id,
      version_number: 1,
      content: generatedContent,
      changed_by: project.owner_id,
      change_summary: `Auto-generated from ${cluster.feedback_count} feedback items`,
    });

    // Generate and store embedding
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
    }

    console.log(`✅ Auto-generated spec: ${title} (ID: ${spec.id})`);
    return spec.id;
  } catch (error) {
    console.error('Error auto-generating spec:', error);
    return null;
  }
}

/**
 * Notify PM about auto-drafted spec
 */
async function notifyPM(projectId: string, specId: string, themeName: string, feedbackCount: number) {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return;

  // Get project owner email
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id, name, slug')
    .eq('id', projectId)
    .single();

  if (!project) return;

  const { data: owner } = await supabase
    .from('users')
    .select('email, name')
    .eq('id', project.owner_id)
    .single();

  if (!owner) return;

  // TODO: Send email notification
  // For now, just log to console
  console.log(`📧 Notification: PM ${owner.email} - Spec ready for review`);
  console.log(`   Theme: ${themeName}`);
  console.log(`   Feedback items: ${feedbackCount}`);
  console.log(`   Spec ID: ${specId}`);
  console.log(`   Review at: /${project.slug}/specs/${specId}`);

  // Could integrate with email service here:
  // await sendEmail({
  //   to: owner.email,
  //   subject: `📝 Spec Auto-Drafted: ${themeName}`,
  //   body: `A spec has been automatically drafted based on ${feedbackCount} user requests. Review it at: /${project.slug}/specs/${specId}`
  // });
}

/**
 * Main cron job handler
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🤖 Starting Proactive Spec Writer cron job...');

    // Step 1: Detect feedback clusters
    const clusters = await detectFeedbackClusters();
    console.log(`Found ${clusters.length} clusters that need specs`);

    if (clusters.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No clusters found that need specs',
        specsGenerated: 0,
      });
    }

    // Step 2: Generate specs for top 5 clusters (to avoid overwhelming)
    const results = [];
    for (const cluster of clusters.slice(0, 5)) {
      const specId = await autoGenerateSpec(cluster);
      if (specId) {
        await notifyPM(cluster.project_id, specId, cluster.theme_name, cluster.feedback_count);
        results.push({
          theme: cluster.theme_name,
          feedbackCount: cluster.feedback_count,
          specId,
        });
      }
    }

    console.log(`✅ Generated ${results.length} specs`);

    return NextResponse.json({
      success: true,
      message: `Generated ${results.length} specs`,
      specsGenerated: results.length,
      results,
    });
  } catch (error) {
    console.error('Error in Proactive Spec Writer cron:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
