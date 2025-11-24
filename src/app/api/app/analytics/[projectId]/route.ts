import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { secureAPI, validateAuth } from '@/lib/api-security';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

const paramsSchema = z.object({
  projectId: z.string(),
});

const querySchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d']).optional().default('7d'),
});

export const GET = secureAPI(
  async ({ user, params, query }) => {
    try {
      const projectId = params.projectId;
      if (!projectId) {
        return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
      }

      const { timeRange } = querySchema.parse(query || {});
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

      const supabase = getSupabaseServiceRoleClient();
      if (!supabase) {
        return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
      }

      // Verify user has access to this project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name, slug, owner_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Check if user is owner or member
      const isOwner = project.owner_id === user.id;
      let isMember = false;

      if (!isOwner) {
        const { data: membership } = await supabase
          .from('members')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .single();

        isMember = !!membership;
      }

      if (!isOwner && !isMember) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // Calculate date ranges
      const now = new Date();
      const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      const previousStartDate = new Date(startDate.getTime() - (days * 24 * 60 * 60 * 1000));

      // Fetch posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, title, created_at, status, vote_count')
        .eq('project_id', projectId);

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
      }

      const allPosts = posts || [];
      const currentPeriodPosts = allPosts.filter(p => new Date(p.created_at) >= startDate);
      const previousPeriodPosts = allPosts.filter(p => {
        const created = new Date(p.created_at);
        return created >= previousStartDate && created < startDate;
      });

      // Fetch votes
      const postIds = allPosts.map(p => p.id);
      const { data: votes, error: votesError } = postIds.length > 0
        ? await supabase
            .from('votes')
            .select('id, post_id, created_at, voter_email')
            .in('post_id', postIds)
        : { data: [], error: null };

      if (votesError) {
        console.error('Error fetching votes:', votesError);
        return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
      }

      const allVotes = votes || [];
      const currentPeriodVotes = allVotes.filter(v => new Date(v.created_at) >= startDate);
      const previousPeriodVotes = allVotes.filter(v => {
        const created = new Date(v.created_at);
        return created >= previousStartDate && created < startDate;
      });

      // Fetch analytics events
      const { data: analyticsEvents, error: analyticsError } = await supabase
        .from('analytics_events')
        .select('event_name, timestamp, properties, ip_address')
        .eq('project_id', projectId)
        .gte('timestamp', previousStartDate.toISOString());

      if (analyticsError) {
        console.error('Error fetching analytics events:', analyticsError);
        // Don't fail the request if analytics events are not available
      }

      const events = analyticsEvents || [];
      const currentPeriodEvents = events.filter(e => new Date(e.timestamp) >= startDate);
      const previousPeriodEvents = events.filter(e => {
        const timestamp = new Date(e.timestamp);
        return timestamp >= previousStartDate && timestamp < startDate;
      });

      // Calculate metrics
      const calculateChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      // Page views (widget_loaded events)
      const currentPageViews = currentPeriodEvents.filter(e =>
        e.event_name === 'widget_loaded' || e.event_name === 'page_view'
      ).length;
      const previousPageViews = previousPeriodEvents.filter(e =>
        e.event_name === 'widget_loaded' || e.event_name === 'page_view'
      ).length;

      // Unique visitors (unique IPs)
      const currentUniqueIPs = new Set(
        currentPeriodEvents
          .filter(e => e.event_name === 'widget_loaded' || e.event_name === 'page_view')
          .map(e => e.ip_address)
      ).size;
      const previousUniqueIPs = new Set(
        previousPeriodEvents
          .filter(e => e.event_name === 'widget_loaded' || e.event_name === 'page_view')
          .map(e => e.ip_address)
      ).size;

      // Widget loads
      const currentWidgetLoads = currentPeriodEvents.filter(e => e.event_name === 'widget_loaded').length;
      const previousWidgetLoads = previousPeriodEvents.filter(e => e.event_name === 'widget_loaded').length;

      // Conversions (feedback submissions)
      const currentConversions = currentPeriodEvents.filter(e => e.event_name === 'feedback_submitted').length;
      const previousConversions = previousPeriodEvents.filter(e => e.event_name === 'feedback_submitted').length;

      // Prepare metrics
      const metrics = {
        pageViews: {
          value: currentPageViews,
          change: calculateChange(currentPageViews, previousPageViews),
          trend: currentPageViews >= previousPageViews ? 'up' as const : 'down' as const,
          timeframe: timeRange,
        },
        uniqueVisitors: {
          value: currentUniqueIPs,
          change: calculateChange(currentUniqueIPs, previousUniqueIPs),
          trend: currentUniqueIPs >= previousUniqueIPs ? 'up' as const : 'down' as const,
          timeframe: timeRange,
        },
        newPosts: {
          value: currentPeriodPosts.length,
          change: calculateChange(currentPeriodPosts.length, previousPeriodPosts.length),
          trend: currentPeriodPosts.length >= previousPeriodPosts.length ? 'up' as const : 'down' as const,
          timeframe: timeRange,
        },
        totalVotes: {
          value: currentPeriodVotes.length,
          change: calculateChange(currentPeriodVotes.length, previousPeriodVotes.length),
          trend: currentPeriodVotes.length >= previousPeriodVotes.length ? 'up' as const : 'down' as const,
          timeframe: timeRange,
        },
        widgetLoads: {
          value: currentWidgetLoads,
          change: calculateChange(currentWidgetLoads, previousWidgetLoads),
          trend: currentWidgetLoads >= previousWidgetLoads ? 'up' as const : 'down' as const,
          timeframe: timeRange,
        },
        conversions: {
          value: currentConversions,
          change: calculateChange(currentConversions, previousConversions),
          trend: currentConversions >= previousConversions ? 'up' as const : 'down' as const,
          timeframe: timeRange,
        },
      };

      // Generate time series data
      const generateTimeSeries = (days: number) => {
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);

          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);

          // Page views for this day
          const dayPageViews = events.filter(e => {
            const timestamp = new Date(e.timestamp);
            return (e.event_name === 'widget_loaded' || e.event_name === 'page_view') &&
                   timestamp >= date && timestamp < nextDate;
          }).length;

          // Posts for this day
          const dayPosts = allPosts.filter(p => {
            const created = new Date(p.created_at);
            return created >= date && created < nextDate;
          }).length;

          // Votes for this day
          const dayVotes = allVotes.filter(v => {
            const created = new Date(v.created_at);
            return created >= date && created < nextDate;
          }).length;

          // Conversions for this day
          const dayConversions = events.filter(e => {
            const timestamp = new Date(e.timestamp);
            return e.event_name === 'feedback_submitted' &&
                   timestamp >= date && timestamp < nextDate;
          }).length;

          data.push({
            date: date.toISOString().split('T')[0],
            label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            pageViews: dayPageViews,
            posts: dayPosts,
            votes: dayVotes,
            conversions: dayConversions,
          });
        }
        return data;
      };

      const timeSeriesData = generateTimeSeries(days);

      // Traffic sources (from events)
      const trafficSources = events.reduce((acc, event) => {
        if (event.event_name !== 'widget_loaded' && event.event_name !== 'page_view') return acc;

        const source = (event.properties as any)?.source || 'direct';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalTraffic = Object.values(trafficSources).reduce((sum, count) => sum + count, 0);
      const trafficSourcesData = Object.entries(trafficSources).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        percentage: totalTraffic > 0 ? Math.round((value / totalTraffic) * 100) : 0,
      }));

      // Add default sources if none exist
      const defaultSources = [
        { name: 'Direct', value: 0, percentage: 0 },
        { name: 'Widget', value: 0, percentage: 0 },
        { name: 'Search', value: 0, percentage: 0 },
        { name: 'Social', value: 0, percentage: 0 },
        { name: 'Other', value: 0, percentage: 0 },
      ];

      const finalTrafficSources = trafficSourcesData.length > 0
        ? trafficSourcesData
        : defaultSources;

      return NextResponse.json({
        metrics,
        chartData: {
          pageViews: timeSeriesData.map(d => ({ date: d.date, label: d.label, value: d.pageViews })),
          posts: timeSeriesData.map(d => ({ date: d.date, label: d.label, value: d.posts })),
          votes: timeSeriesData.map(d => ({ date: d.date, label: d.label, value: d.votes })),
          conversions: timeSeriesData.map(d => ({ date: d.date, label: d.label, value: d.conversions })),
        },
        trafficSources: finalTrafficSources,
      });
    } catch (error) {
      console.error('Analytics API error:', error);
      return NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAuth,
    paramsSchema,
    querySchema: querySchema.optional(),
  }
);
