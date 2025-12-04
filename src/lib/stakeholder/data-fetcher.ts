/**
 * Component Data Fetcher
 * Fetches data from database based on component data_query specifications
 */

import { createClient } from '@supabase/supabase-js';
import { ComponentSpec, ComponentDataResult } from '@/types/stakeholder';

/**
 * Fetch data for a component with a data_query
 */
export async function fetchComponentData(
  component: ComponentSpec,
  projectId: string
): Promise<ComponentDataResult> {
  if (!component.data_query) {
    return { data: component.props };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      data: component.props,
      error: 'Supabase credentials not configured',
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { type, filter, limit, params } = component.data_query;

    switch (type) {
      case 'feedback':
        return await fetchFeedbackData(supabase, projectId, filter, limit, params);

      case 'themes':
        return await fetchThemesData(supabase, projectId, limit, params);

      case 'competitors':
        return await fetchCompetitorsData(supabase, projectId, params);

      case 'metrics':
        return await fetchMetricsData(supabase, projectId, params);

      case 'events':
        return await fetchEventsData(supabase, projectId, filter, limit, params);

      default:
        return {
          data: component.props,
          error: `Unknown data_query type: ${type}`,
        };
    }
  } catch (error) {
    console.error('[Data Fetcher] Error fetching data:', error);
    return {
      data: component.props,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch feedback data
 */
async function fetchFeedbackData(
  supabase: any,
  projectId: string,
  filter?: string,
  limit: number = 10,
  params?: Record<string, any>
): Promise<ComponentDataResult> {
  try {
    let query = supabase
      .from('posts')
      .select(
        `
        id,
        title,
        content,
        created_at,
        source,
        sentiment_scores (
          score,
          label
        ),
        posts_themes (
          themes (
            theme_name
          )
        )
      `
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters if provided
    if (params?.sentiment === 'negative') {
      // Filter for negative sentiment
      query = query.lt('sentiment_scores.score', -0.3);
    } else if (params?.sentiment === 'positive') {
      query = query.gt('sentiment_scores.score', 0.3);
    }

    if (params?.timeRange) {
      const days = parseInt(params.timeRange.replace('d', ''));
      const date = new Date();
      date.setDate(date.getDate() - days);
      query = query.gte('created_at', date.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data for FeedbackList component
    const items = data?.map((post: any) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      sentiment: post.sentiment_scores?.[0]?.score || 0,
      source: post.source,
      created_at: post.created_at,
      themes: post.posts_themes?.map((pt: any) => pt.themes?.theme_name).filter(Boolean) || [],
    })) || [];

    return { data: { items } };
  } catch (error) {
    console.error('[Data Fetcher] Error fetching feedback:', error);
    return {
      data: { items: [] },
      error: error instanceof Error ? error.message : 'Failed to fetch feedback',
    };
  }
}

/**
 * Fetch themes data
 */
async function fetchThemesData(
  supabase: any,
  projectId: string,
  limit: number = 15,
  params?: Record<string, any>
): Promise<ComponentDataResult> {
  try {
    const { data, error } = await supabase
      .from('themes')
      .select('theme_name, frequency, first_seen')
      .eq('project_id', projectId)
      .order('frequency', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Transform data for ThemeCloud component
    const themes = data?.map((theme: any) => ({
      name: theme.theme_name,
      count: theme.frequency,
      sentiment: 0, // TODO: Calculate sentiment per theme
      trend: 'stable' as const,
    })) || [];

    return { data: { themes } };
  } catch (error) {
    console.error('[Data Fetcher] Error fetching themes:', error);
    return {
      data: { themes: [] },
      error: error instanceof Error ? error.message : 'Failed to fetch themes',
    };
  }
}

/**
 * Fetch competitors data
 */
async function fetchCompetitorsData(
  supabase: any,
  projectId: string,
  params?: Record<string, any>
): Promise<ComponentDataResult> {
  try {
    const { data, error } = await supabase
      .from('competitors')
      .select('id, name')
      .eq('project_id', projectId)
      .limit(5);

    if (error) throw error;

    const competitors = ['Your Product', ...(data?.map((c: any) => c.name) || [])];
    const metrics = [
      { name: 'Features', value: '47', advantage: 'yours' as const },
      { name: 'Customer Mentions', value: '142', advantage: 'yours' as const },
      { name: 'Market Position', value: 'Strong', advantage: 'tie' as const },
    ];

    return { data: { competitors, metrics } };
  } catch (error) {
    console.error('[Data Fetcher] Error fetching competitors:', error);
    return {
      data: { competitors: [], metrics: [] },
      error: error instanceof Error ? error.message : 'Failed to fetch competitors',
    };
  }
}

/**
 * Fetch metrics data
 */
async function fetchMetricsData(
  supabase: any,
  projectId: string,
  params?: Record<string, any>
): Promise<ComponentDataResult> {
  try {
    // Fetch various metrics
    const [postsCount, avgSentiment, themesCount] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.rpc('get_average_sentiment', { p_project_id: projectId }),
      supabase.from('themes').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    ]);

    return {
      data: {
        feedback_count: postsCount.count || 0,
        avg_sentiment: avgSentiment.data || 0,
        theme_count: themesCount.count || 0,
        recent_activity: 0, // TODO: Calculate recent activity
      },
    };
  } catch (error) {
    console.error('[Data Fetcher] Error fetching metrics:', error);
    return {
      data: {
        feedback_count: 0,
        avg_sentiment: 0,
        theme_count: 0,
        recent_activity: 0,
      },
      error: error instanceof Error ? error.message : 'Failed to fetch metrics',
    };
  }
}

/**
 * Fetch events data
 */
async function fetchEventsData(
  supabase: any,
  projectId: string,
  filter?: string,
  limit: number = 10,
  params?: Record<string, any>
): Promise<ComponentDataResult> {
  try {
    // For now, return mock events
    // TODO: Implement real events tracking
    const events = [];

    return { data: { events } };
  } catch (error) {
    console.error('[Data Fetcher] Error fetching events:', error);
    return {
      data: { events: [] },
      error: error instanceof Error ? error.message : 'Failed to fetch events',
    };
  }
}

/**
 * Fetch context data for all projects
 */
export async function fetchProjectContext(projectId: string): Promise<any> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {};
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Fetch various context data in parallel
    const [
      { data: recentFeedback },
      { data: themes },
      { data: competitors },
      { count: feedbackCount },
    ] = await Promise.all([
      supabase
        .from('posts')
        .select('id, title, sentiment_scores(score)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('themes')
        .select('theme_name, frequency')
        .eq('project_id', projectId)
        .order('frequency', { ascending: false })
        .limit(10),
      supabase
        .from('competitors')
        .select('name')
        .eq('project_id', projectId)
        .limit(5),
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId),
    ]);

    // Calculate average sentiment
    const avgSentiment =
      recentFeedback && recentFeedback.length > 0
        ? recentFeedback.reduce(
            (sum: number, fb: any) => sum + (fb.sentiment_scores?.[0]?.score || 0),
            0
          ) / recentFeedback.length
        : 0;

    return {
      sentiment: avgSentiment,
      themes: themes?.map((t: any) => ({
        name: t.theme_name,
        count: t.frequency,
      })) || [],
      competitor_events: [],
      metrics: {
        feedback_count: feedbackCount || 0,
        avg_sentiment: avgSentiment,
        theme_count: themes?.length || 0,
        recent_activity: recentFeedback?.length || 0,
      },
      recent_feedback: recentFeedback?.map((fb: any) => ({
        id: fb.id,
        title: fb.title,
        sentiment: fb.sentiment_scores?.[0]?.score || 0,
      })) || [],
    };
  } catch (error) {
    console.error('[Data Fetcher] Error fetching project context:', error);
    return {};
  }
}
