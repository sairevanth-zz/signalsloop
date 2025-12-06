import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { generateUserStoryWithRetry } from '@/lib/user-stories/generation';
import { GenerateStoryInput, FeedbackItemForStory } from '@/types/user-stories';
import { Theme } from '@/types/themes';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/user-stories/generate
 * Generate a user story from a theme using GPT-4
 *
 * Body: {
 *   theme_id: string;
 *   project_id: string;
 *   template_id?: string;
 *   custom_instructions?: string;
 *   include_feedback_ids?: string[];
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      theme_id,
      project_id,
      template_id,
      custom_instructions,
      include_feedback_ids,
    } = body;

    // Validate required fields
    if (!theme_id || !project_id) {
      return NextResponse.json(
        { error: 'theme_id and project_id are required' },
        { status: 400 }
      );
    }

    console.log(`[USER-STORIES-API] Generating story for theme: ${theme_id}`);

    // Get Supabase client
    const supabase = getSupabaseServiceRoleClient();

    // Fetch theme data
    const { data: theme, error: themeError } = await supabase
      .from('themes')
      .select('*')
      .eq('id', theme_id)
      .single();

    if (themeError || !theme) {
      console.error('[USER-STORIES-API] Theme not found:', themeError);
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      );
    }

    // Fetch feedback items linked to this theme
    let feedbackQuery = supabase
      .from('feedback_themes')
      .select(`
        feedback_id,
        posts:feedback_id (
          id,
          title,
          description,
          created_at,
          author_name,
          sentiment_analysis (
            sentiment_score
          )
        )
      `)
      .eq('theme_id', theme_id)
      .limit(20); // Limit to 20 most relevant feedback items

    if (include_feedback_ids && include_feedback_ids.length > 0) {
      feedbackQuery = feedbackQuery.in('feedback_id', include_feedback_ids);
    }

    const { data: feedbackLinks, error: feedbackError } = await feedbackQuery;

    if (feedbackError) {
      console.error('[USER-STORIES-API] Error fetching feedback:', feedbackError);
      // Continue anyway, we can generate story from theme alone
    }

    // Transform feedback data
    const feedbackItems: FeedbackItemForStory[] = (feedbackLinks || [])
      .map((link: any) => {
        const post = link.posts;
        if (!post) return null;

        return {
          id: post.id,
          content: post.description || post.title,
          title: post.title,
          sentiment_score: post.sentiment_analysis?.[0]?.sentiment_score,
          created_at: post.created_at,
          author_username: post.author_name,
        };
      })
      .filter((item): item is FeedbackItemForStory => item !== null);

    console.log(`[USER-STORIES-API] Found ${feedbackItems.length} feedback items for theme`);

    // Fetch template if specified
    let template = undefined;
    if (template_id) {
      const { data: templateData } = await supabase
        .from('story_templates')
        .select('*')
        .eq('id', template_id)
        .single();

      if (templateData) {
        template = templateData;
      }
    }

    // Prepare generation input
    const input: GenerateStoryInput = {
      theme: theme as Theme,
      feedbackItems,
      template,
      customInstructions: custom_instructions,
    };

    // Generate the user story
    const generatedStory = await generateUserStoryWithRetry(input);

    const generationTime = Date.now() - startTime;

    // Save the generated story to database
    const { data: savedStory, error: saveError } = await supabase
      .from('user_stories')
      .insert({
        project_id,
        theme_id,
        title: generatedStory.title,
        user_type: generatedStory.user_type,
        user_goal: generatedStory.user_goal,
        user_benefit: generatedStory.user_benefit,
        full_story: generatedStory.full_story,
        acceptance_criteria: generatedStory.acceptance_criteria,
        story_points: generatedStory.suggested_story_points,
        complexity_score: generatedStory.complexity_score,
        uncertainty_score: generatedStory.uncertainty_score,
        effort_score: generatedStory.effort_score,
        estimation_reasoning: generatedStory.estimation_reasoning,
        labels: generatedStory.suggested_labels,
        technical_notes: generatedStory.technical_notes,
        definition_of_done: generatedStory.definition_of_done,
        priority_level: generatedStory.priority_level,
        generated_by_ai: true,
        generation_model: 'gpt-4',
        generation_timestamp: new Date().toISOString(),
        supporting_feedback_ids: feedbackItems.map((f) => f.id),
        feedback_count: feedbackItems.length,
      })
      .select()
      .single();

    if (saveError) {
      console.error('[USER-STORIES-API] Error saving story:', saveError);
      // Return the generated story anyway, even if save failed
      return NextResponse.json({
        success: false,
        story: generatedStory,
        error: 'Story generated but failed to save to database',
        generation_time_ms: generationTime,
      });
    }

    // Log the generation
    await supabase.from('story_generation_logs').insert({
      project_id,
      theme_id,
      user_story_id: savedStory.id,
      model_used: 'gpt-4',
      generation_time_ms: generationTime,
      success: true,
      input_context: {
        theme_name: theme.theme_name,
        feedback_count: feedbackItems.length,
      },
    });

    console.log(`[USER-STORIES-API] ✓ Story generated and saved: ${savedStory.id} (${generationTime}ms)`);

    return NextResponse.json({
      success: true,
      story: savedStory,
      generation_time_ms: generationTime,
    });
  } catch (error) {
    const generationTime = Date.now() - startTime;

    console.error('[USER-STORIES-API] Generation error:', error);

    // Log the failure
    try {
      const supabase = getSupabaseServiceRoleClient();
      const body = await request.clone().json();
      await supabase.from('story_generation_logs').insert({
        project_id: body.project_id,
        theme_id: body.theme_id,
        model_used: 'gpt-4',
        generation_time_ms: generationTime,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.error('[USER-STORIES-API] Error logging failure:', logError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        generation_time_ms: generationTime,
      },
      { status: 500 }
    );
  }
}
