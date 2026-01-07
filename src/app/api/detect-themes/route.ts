import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import {
  detectThemesBatch,
  mergeThemesAcrossBatches,
} from '@/lib/openai/themes';
import {
  mergeAndRankThemes,
  rankThemes,
  createThemeClusters,
  assignThemesToClusters,
} from '@/lib/themes/clustering';
import {
  FeedbackItem,
  DetectThemesRequest,
  DetectThemesResponse,
  Theme,
} from '@/types/themes';
import { captureThemeDetectionReasoning } from '@/lib/reasoning/integrations';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for processing

/**
 * POST /api/detect-themes
 * Detects themes and patterns from feedback items using AI
 *
 * Body: {
 *   projectId: string,
 *   force?: boolean  // If true, re-analyzes all feedback
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: DetectThemesRequest = await request.json();
    const { projectId, force = false } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 },
      );
    }

    console.log('[THEME DETECTION] Starting theme detection for project:', projectId);

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 },
      );
    }

    // Check if project exists and has Pro plan
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, plan')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      console.error('[THEME DETECTION] Project not found:', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 },
      );
    }

    // Optional: Enforce Pro plan requirement
    // if (projectData.plan !== 'pro') {
    //   return NextResponse.json(
    //     { error: 'Theme detection requires a Pro plan' },
    //     { status: 403 },
    //   );
    // }

    // Fetch existing themes for this project
    const { data: existingThemes, error: themesError } = await supabase
      .from('themes')
      .select('*')
      .eq('project_id', projectId);

    if (themesError) {
      console.error('[THEME DETECTION] Error fetching existing themes:', themesError);
      return NextResponse.json(
        { error: 'Failed to fetch existing themes' },
        { status: 500 },
      );
    }

    // Fetch feedback items for analysis
    let postsQuery = supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        category,
        created_at
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // If not forcing, only get unanalyzed posts (last 100)
    // In a real implementation, you'd track which posts have been analyzed
    if (!force) {
      postsQuery = postsQuery.limit(100);
    }

    const { data: posts, error: postsError } = await postsQuery;

    if (postsError) {
      console.error('[THEME DETECTION] Error fetching posts:', postsError);
      return NextResponse.json(
        { error: 'Failed to fetch feedback items' },
        { status: 500 },
      );
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        success: true,
        themes: existingThemes || [],
        newCount: 0,
        updatedCount: 0,
        processedItems: 0,
        message: 'No feedback items to analyze',
      } as DetectThemesResponse);
    }

    console.log(`[THEME DETECTION] Analyzing ${posts.length} feedback items...`);

    // Fetch sentiment data for posts
    const { data: sentimentData } = await supabase
      .from('sentiment_analysis')
      .select('post_id, sentiment_category, sentiment_score')
      .in('post_id', posts.map(p => p.id));

    // Create sentiment map
    const sentimentMap = new Map(
      (sentimentData || []).map(s => [s.post_id, s])
    );

    // Prepare feedback items with sentiment
    const feedbackItems: FeedbackItem[] = posts.map(post => ({
      id: post.id,
      title: post.title,
      description: post.description || '',
      category: post.category || undefined,
      created_at: post.created_at,
      sentiment_score: sentimentMap.get(post.id)?.sentiment_score,
      sentiment_category: sentimentMap.get(post.id)?.sentiment_category,
    }));

    // Detect themes using AI
    const batchResults = await detectThemesBatch(feedbackItems);

    if (batchResults.length === 0) {
      return NextResponse.json({
        success: true,
        themes: existingThemes || [],
        newCount: 0,
        updatedCount: 0,
        processedItems: posts.length,
        message: 'No themes detected from feedback',
      } as DetectThemesResponse);
    }

    // Merge themes across batches
    const detectedThemes = mergeThemesAcrossBatches(batchResults);

    console.log(`[THEME DETECTION] Detected ${detectedThemes.length} unique themes`);

    // Merge with existing themes
    const { newThemes, updatedThemes } = mergeAndRankThemes(
      detectedThemes,
      existingThemes || [],
      feedbackItems,
      projectId,
    );

    console.log(`[THEME DETECTION] ${newThemes.length} new, ${updatedThemes.length} updated`);

    // Insert new themes
    let insertedThemes: Theme[] = [];
    if (newThemes.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('themes')
        .insert(newThemes)
        .select();

      if (insertError) {
        console.error('[THEME DETECTION] Error inserting themes:', insertError);
        return NextResponse.json(
          { error: 'Failed to save new themes' },
          { status: 500 },
        );
      }

      insertedThemes = inserted || [];
    }

    // Update existing themes
    let updatedThemeRecords: Theme[] = [];
    if (updatedThemes.length > 0) {
      for (const update of updatedThemes) {
        const { data: updated, error: updateError } = await supabase
          .from('themes')
          .update({
            frequency: update.frequency,
            avg_sentiment: update.avg_sentiment,
            first_seen: update.first_seen,
            last_seen: update.last_seen,
            is_emerging: update.is_emerging,
            updated_at: update.updated_at,
          })
          .eq('id', update.id)
          .select()
          .single();

        if (updateError) {
          console.error(`[THEME DETECTION] Error updating theme ${update.id}:`, updateError);
        } else if (updated) {
          updatedThemeRecords.push(updated);
        }
      }
    }

    // Create feedback-theme mappings
    const feedbackThemeMappings: Array<{
      feedback_id: string;
      theme_id: string;
      confidence: number;
    }> = [];

    // Map detected themes to database themes
    // Include ALL existing themes, not just newly inserted/updated ones
    const themeNameToId = new Map<string, string>();

    // First add inserted and updated themes
    for (const theme of [...insertedThemes, ...updatedThemeRecords]) {
      themeNameToId.set(theme.theme_name.toLowerCase(), theme.id);
    }

    // Also add all existing themes to ensure mappings are created even if theme wasn't updated
    if (existingThemes && existingThemes.length > 0) {
      for (const theme of existingThemes) {
        if (!themeNameToId.has(theme.theme_name.toLowerCase())) {
          themeNameToId.set(theme.theme_name.toLowerCase(), theme.id);
        }
      }
    }

    for (const detected of detectedThemes) {
      const themeId = themeNameToId.get(detected.theme_name.toLowerCase());
      if (!themeId) continue;

      for (const itemIndex of detected.item_indices) {
        const feedbackId = feedbackItems[itemIndex]?.id;
        if (!feedbackId) continue;

        feedbackThemeMappings.push({
          feedback_id: feedbackId,
          theme_id: themeId,
          confidence: detected.confidence,
        });
      }
    }

    // Insert feedback-theme mappings (upsert to handle duplicates)
    if (feedbackThemeMappings.length > 0) {
      const { error: mappingError } = await supabase
        .from('feedback_themes')
        .upsert(feedbackThemeMappings, {
          onConflict: 'feedback_id,theme_id',
          ignoreDuplicates: false,
        });

      if (mappingError) {
        console.error('[THEME DETECTION] Error creating mappings:', mappingError);
        // Don't fail the request, just log the error
      } else {
        console.log(`[THEME DETECTION] Created ${feedbackThemeMappings.length} theme mappings`);
      }
    }

    // Fetch all themes to return
    const { data: allThemes, error: fetchError } = await supabase
      .from('themes')
      .select(`
        *,
        theme_clusters(cluster_name)
      `)
      .eq('project_id', projectId)
      .order('frequency', { ascending: false });

    if (fetchError) {
      console.error('[THEME DETECTION] Error fetching final themes:', fetchError);
    }

    // Flatten cluster data
    const themesWithClusters = (allThemes || []).map((theme: any) => ({
      ...theme,
      cluster_name: theme.theme_clusters?.cluster_name || null,
      theme_clusters: undefined, // Remove the nested object
    }));

    const rankedThemes = rankThemes(themesWithClusters);

    // Create theme clusters
    if (rankedThemes.length > 0) {
      console.log(`[THEME CLUSTERING] Creating clusters for ${rankedThemes.length} themes`);

      const clusterDefinitions = createThemeClusters(rankedThemes, projectId);

      if (clusterDefinitions.length > 0) {
        // Insert or update clusters in database
        const { data: insertedClusters, error: clusterError } = await supabase
          .from('theme_clusters')
          .upsert(clusterDefinitions, {
            onConflict: 'project_id,cluster_name',
            ignoreDuplicates: false,
          })
          .select();

        if (clusterError) {
          console.error('[THEME CLUSTERING] Error saving clusters:', clusterError);
        } else if (insertedClusters) {
          console.log(`[THEME CLUSTERING] Created ${insertedClusters.length} clusters`);

          // Assign themes to clusters
          const themeClusterMap = assignThemesToClusters(rankedThemes, insertedClusters);

          // Update each theme with its cluster_id
          for (const [themeId, clusterId] of themeClusterMap.entries()) {
            await supabase
              .from('themes')
              .update({ cluster_id: clusterId })
              .eq('id', themeId);
          }

          console.log(`[THEME CLUSTERING] Assigned ${themeClusterMap.size} themes to clusters`);
        }
      }
    }

    // Capture reasoning traces for AI Reasoning Layer (sample up to 3 themes)
    const themesToCapture = rankedThemes.slice(0, 3);
    for (const theme of themesToCapture) {
      try {
        // Get the feedback items associated with this theme
        const themeDetected = detectedThemes.find(d =>
          d.theme_name.toLowerCase() === theme.theme_name.toLowerCase()
        );
        const sampleFeedbackId = themeDetected && feedbackItems[themeDetected.item_indices[0]]?.id;

        await captureThemeDetectionReasoning({
          projectId,
          postId: sampleFeedbackId || theme.id,
          themes: [{ name: theme.theme_name, confidence: theme.avg_sentiment || 0.8 }],
          feedbackText: `Detected from ${theme.frequency} feedback items`,
        });
      } catch (reasoningError) {
        // Don't fail if reasoning capture fails
        console.error('[THEME DETECTION] Reasoning capture failed:', reasoningError);
      }
    }
    console.log(`[THEME DETECTION] Captured ${themesToCapture.length} reasoning traces`);

    return NextResponse.json({
      success: true,
      themes: rankedThemes,
      newCount: newThemes.length,
      updatedCount: updatedThemes.length,
      processedItems: posts.length,
      message: `Successfully detected themes from ${posts.length} feedback items`,
    } as DetectThemesResponse);

  } catch (error) {
    console.error('[THEME DETECTION] Error:', error);
    return NextResponse.json(
      {
        success: false,
        themes: [],
        newCount: 0,
        updatedCount: 0,
        processedItems: 0,
        error: 'Failed to detect themes',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as DetectThemesResponse,
      { status: 500 },
    );
  }
}

/**
 * GET /api/detect-themes?projectId=xxx
 * Get theme detection status for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 },
      );
    }

    // Get theme statistics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_theme_statistics', {
        p_project_id: projectId,
        p_days_ago: 30,
      });

    if (statsError) {
      console.error('[THEME DETECTION] Error fetching stats:', statsError);
    }

    // Get all themes with cluster data
    const { data: themes, error: themesError } = await supabase
      .from('themes')
      .select(`
        *,
        theme_clusters(cluster_name)
      `)
      .eq('project_id', projectId)
      .order('frequency', { ascending: false });

    if (themesError) {
      return NextResponse.json(
        { error: 'Failed to fetch themes' },
        { status: 500 },
      );
    }

    // Flatten cluster data
    const themesWithClusters = (themes || []).map((theme: any) => ({
      ...theme,
      cluster_name: theme.theme_clusters?.cluster_name || null,
      theme_clusters: undefined, // Remove the nested object
    }));

    return NextResponse.json({
      success: true,
      themes: themesWithClusters,
      statistics: stats?.[0] || {
        total_themes: 0,
        emerging_themes: 0,
        total_feedback_items: 0,
        avg_theme_frequency: 0,
      },
    });

  } catch (error) {
    console.error('[THEME DETECTION] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get theme detection status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
