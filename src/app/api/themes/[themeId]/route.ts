import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import {
  ThemeDetailsResponse,
  ThemeWithDetails,
  FeedbackItem,
  ThemeTrendPoint,
} from '@/types/themes';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/themes/[themeId]
 * Get detailed information about a specific theme
 *
 * Query params:
 *   - includeRelatedFeedback: boolean (default: true)
 *   - includeTrend: boolean (default: true)
 *   - timeRange: number (default: 30 days)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { themeId: string } },
) {
  try {
    const { themeId } = params;
    const { searchParams } = new URL(request.url);

    const includeRelatedFeedback = searchParams.get('includeRelatedFeedback') !== 'false';
    const includeTrend = searchParams.get('includeTrend') !== 'false';
    const timeRange = parseInt(searchParams.get('timeRange') || '30');

    if (!themeId) {
      return NextResponse.json(
        { error: 'Theme ID is required' },
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

    // Fetch theme with details from view
    const { data: theme, error: themeError } = await supabase
      .from('themes_with_details')
      .select('*')
      .eq('id', themeId)
      .single();

    if (themeError || !theme) {
      console.error('[THEME DETAILS] Error fetching theme:', themeError);
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 },
      );
    }

    const themeWithDetails = theme as ThemeWithDetails;

    // Fetch related feedback items
    let relatedFeedback: FeedbackItem[] | undefined;
    if (includeRelatedFeedback) {
      const { data: feedbackThemes, error: ftError } = await supabase
        .from('feedback_themes')
        .select(`
          feedback_id,
          confidence,
          posts!inner (
            id,
            title,
            description,
            category,
            created_at
          )
        `)
        .eq('theme_id', themeId)
        .order('confidence', { ascending: false })
        .limit(10);

      if (!ftError && feedbackThemes) {
        // Fetch sentiment for these posts
        const postIds = feedbackThemes
          .map((ft: any) => ft.posts?.id)
          .filter(Boolean);

        const { data: sentiments } = await supabase
          .from('sentiment_analysis')
          .select('post_id, sentiment_category, sentiment_score')
          .in('post_id', postIds);

        const sentimentMap = new Map(
          (sentiments || []).map((s) => [s.post_id, s])
        );

        relatedFeedback = feedbackThemes
          .filter((ft: any) => ft.posts)
          .map((ft: any) => {
            const post = ft.posts;
            const sentiment = sentimentMap.get(post.id);
            return {
              id: post.id,
              title: post.title,
              description: post.description || '',
              category: post.category,
              created_at: post.created_at,
              sentiment_category: sentiment?.sentiment_category,
              sentiment_score: sentiment?.sentiment_score,
            };
          });
      }
    }

    // Fetch trend data
    let trend: ThemeTrendPoint[] | undefined;
    if (includeTrend) {
      const { data: trendData, error: trendError } = await supabase
        .rpc('get_theme_trend', {
          p_theme_id: themeId,
          p_days_ago: timeRange,
        });

      if (!trendError && trendData) {
        trend = trendData.map((point: any) => ({
          date: point.date,
          feedback_count: point.feedback_count,
          avg_sentiment: point.avg_sentiment || 0,
        }));
      }
    }

    // Fetch related themes (themes with similar categories or from same cluster)
    const { data: relatedThemes, error: relatedError } = await supabase
      .from('themes')
      .select('*')
      .eq('project_id', themeWithDetails.project_id)
      .neq('id', themeId)
      .or(
        themeWithDetails.cluster_id
          ? `cluster_id.eq.${themeWithDetails.cluster_id}`
          : 'cluster_id.is.null',
      )
      .order('frequency', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      theme: themeWithDetails,
      relatedFeedback,
      trend,
      relatedThemes: relatedThemes || [],
    } as ThemeDetailsResponse);

  } catch (error) {
    console.error('[THEME DETAILS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch theme details',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as ThemeDetailsResponse,
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/themes/[themeId]
 * Delete a theme
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { themeId: string } },
) {
  try {
    const { themeId } = params;

    if (!themeId) {
      return NextResponse.json(
        { error: 'Theme ID is required' },
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

    // Delete theme (cascades to feedback_themes)
    const { error: deleteError } = await supabase
      .from('themes')
      .delete()
      .eq('id', themeId);

    if (deleteError) {
      console.error('[THEME DELETE] Error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete theme' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Theme deleted successfully',
    });

  } catch (error) {
    console.error('[THEME DELETE] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete theme',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/themes/[themeId]
 * Update theme metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { themeId: string } },
) {
  try {
    const { themeId } = params;
    const body = await request.json();

    if (!themeId) {
      return NextResponse.json(
        { error: 'Theme ID is required' },
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

    // Allow updating specific fields
    const allowedFields = ['theme_name', 'description', 'cluster_id', 'is_emerging'];
    const updates: any = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('themes')
      .update(updates)
      .eq('id', themeId)
      .select()
      .single();

    if (updateError) {
      console.error('[THEME UPDATE] Error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update theme' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      theme: updated,
      message: 'Theme updated successfully',
    });

  } catch (error) {
    console.error('[THEME UPDATE] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update theme',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
