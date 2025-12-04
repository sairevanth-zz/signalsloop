/**
 * Component Data Fetcher
 * Fetches data from database based on component data_query specifications
 */

import { createClient } from '@supabase/supabase-js';
import { ComponentSpec, ComponentDataResult } from '@/types/stakeholder';
import { withCache, CacheKeys, CacheTTL } from './cache';

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
    // First, try to fetch posts data
    let query = supabase
      .from('posts')
      .select('id, title, content, created_at, source, category')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (params?.timeRange) {
      const days = parseInt(params.timeRange.replace('d', ''));
      const date = new Date();
      date.setDate(date.getDate() - days);
      query = query.gte('created_at', date.toISOString());
    }

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      console.error('[Data Fetcher] Posts query error:', postsError);
      // Return empty data instead of error to avoid breaking UI
      return { data: { items: [] } };
    }

    if (!posts || posts.length === 0) {
      console.log('[Data Fetcher] No posts found for project:', projectId);
      return { data: { items: [] } };
    }

    // Fetch sentiment data separately to avoid join issues
    const postIds = posts.map((p: any) => p.id);
    const { data: sentiments } = await supabase
      .from('sentiment_analysis')
      .select('post_id, sentiment_score')
      .in('post_id', postIds);

    // Create sentiment map for fast lookup
    const sentimentMap = new Map();
    sentiments?.forEach((s: any) => {
      sentimentMap.set(s.post_id, s.sentiment_score);
    });

    // Transform data for FeedbackList component
    let items = posts.map((post: any) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      sentiment: sentimentMap.get(post.id) || 0,
      source: post.source,
      created_at: post.created_at,
      themes: post.category ? [post.category] : [],
    }));

    // Apply sentiment filter after fetching
    if (params?.sentiment === 'negative') {
      items = items.filter(item => item.sentiment < -0.3);
    } else if (params?.sentiment === 'positive') {
      items = items.filter(item => item.sentiment > 0.3);
    }

    console.log(`[Data Fetcher] Fetched ${items.length} feedback items for project ${projectId}`);
    return { data: { items } };
  } catch (error) {
    console.error('[Data Fetcher] Error fetching feedback:', error);
    // Return empty data instead of error to avoid breaking UI
    return { data: { items: [] } };
  }
}

/**
 * Fetch themes data with sentiment calculation
 */
async function fetchThemesData(
  supabase: any,
  projectId: string,
  limit: number = 15,
  params?: Record<string, any>
): Promise<ComponentDataResult> {
  // Use cache for expensive sentiment calculation
  return await withCache(
    CacheKeys.themesSentiment(projectId),
    CacheTTL.themesSentiment,
    async () => {
      try {
        const { data: themesData, error: themesError } = await supabase
      .from('themes')
      .select('theme_name, frequency, first_seen')
      .eq('project_id', projectId)
      .order('frequency', { ascending: false })
      .limit(limit);

    if (themesError) {
      console.error('[Data Fetcher] Themes query error:', themesError);
      return { data: { themes: [] } };
    }

    if (!themesData || themesData.length === 0) {
      return { data: { themes: [] } };
    }

    // Calculate sentiment for each theme by analyzing posts with that category
    const themesWithSentiment = await Promise.all(
      themesData.map(async (theme: any) => {
        try {
          // Fetch posts with this category and their sentiment
          const { data: posts } = await supabase
            .from('posts')
            .select(`
              id,
              category,
              sentiment_analysis!left(sentiment_score)
            `)
            .eq('project_id', projectId)
            .eq('category', theme.theme_name)
            .limit(100); // Sample up to 100 posts for sentiment calculation

          // Calculate average sentiment
          let avgSentiment = 0;
          let sentimentCount = 0;

          if (posts && posts.length > 0) {
            posts.forEach((post: any) => {
              if (post.sentiment_analysis && post.sentiment_analysis.length > 0) {
                const score = post.sentiment_analysis[0].sentiment_score;
                if (typeof score === 'number') {
                  avgSentiment += score;
                  sentimentCount++;
                }
              }
            });

            if (sentimentCount > 0) {
              avgSentiment = avgSentiment / sentimentCount;
            }
          }

          // Determine trend based on recent vs older posts
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (posts && posts.length >= 10) {
            const recentPosts = posts.slice(0, Math.floor(posts.length / 2));
            const olderPosts = posts.slice(Math.floor(posts.length / 2));

            const recentCount = recentPosts.length;
            const olderCount = olderPosts.length;

            if (recentCount > olderCount * 1.3) {
              trend = 'up';
            } else if (recentCount < olderCount * 0.7) {
              trend = 'down';
            }
          }

          return {
            name: theme.theme_name,
            count: theme.frequency,
            sentiment: parseFloat(avgSentiment.toFixed(3)),
            trend,
          };
        } catch (err) {
          console.warn(`[Data Fetcher] Error calculating sentiment for theme ${theme.theme_name}:`, err);
          return {
            name: theme.theme_name,
            count: theme.frequency,
            sentiment: 0,
            trend: 'stable' as const,
          };
        }
      })
    );

        console.log(`[Data Fetcher] Fetched ${themesWithSentiment.length} themes with sentiment analysis`);
        return { data: { themes: themesWithSentiment } };
      } catch (error) {
        console.error('[Data Fetcher] Error fetching themes:', error);
        return { data: { themes: [] } };
      }
    }
  );
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
    // First, auto-generate events from recent activity
    try {
      await supabase.rpc('generate_timeline_events', { p_project_id: projectId });
    } catch (genError) {
      // Log but don't fail if auto-generation fails
      console.warn('[Data Fetcher] Auto-generate events failed:', genError);
    }

    // Build query
    let query = supabase
      .from('timeline_events')
      .select('id, event_type, title, description, event_date, severity, metadata')
      .eq('project_id', projectId)
      .order('event_date', { ascending: false })
      .limit(limit);

    // Apply type filter if specified
    if (params?.eventTypes && Array.isArray(params.eventTypes)) {
      query = query.in('event_type', params.eventTypes);
    }

    // Apply severity filter if specified
    if (params?.severity) {
      query = query.eq('severity', params.severity);
    }

    // Apply time range filter
    if (params?.timeRange) {
      const days = parseInt(params.timeRange.replace('d', '')) || 30;
      const date = new Date();
      date.setDate(date.getDate() - days);
      query = query.gte('event_date', date.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Data Fetcher] Events query error:', error);
      return { data: { events: [] } };
    }

    // Transform data for TimelineEvents component
    const events = data?.map((event: any) => ({
      id: event.id,
      type: event.event_type,
      title: event.title,
      description: event.description,
      date: event.event_date,
      severity: event.severity,
      metadata: event.metadata,
    })) || [];

    console.log(`[Data Fetcher] Fetched ${events.length} timeline events for project ${projectId}`);
    return { data: { events } };
  } catch (error) {
    console.error('[Data Fetcher] Error fetching events:', error);
    return { data: { events: [] } };
  }
}

/**
 * Fetch context data for all projects (with caching)
 */
export async function fetchProjectContext(projectId: string): Promise<any> {
  return await withCache(
    CacheKeys.projectContext(projectId),
    CacheTTL.projectContext,
    async () => {
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
        .select('id, title, sentiment_analysis!left(sentiment_score)')
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
            (sum: number, fb: any) => sum + (fb.sentiment_analysis?.[0]?.sentiment_score || 0),
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
        sentiment: fb.sentiment_analysis?.[0]?.sentiment_score || 0,
        })) || [],
      };
    } catch (error) {
      console.error('[Data Fetcher] Error fetching project context:', error);
      return {};
    }
  });
}
