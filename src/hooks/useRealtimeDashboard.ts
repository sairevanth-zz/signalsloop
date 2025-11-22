/**
 * Real-Time Dashboard Hook
 * Subscribes to Supabase Realtime events for live dashboard updates
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { DashboardMetrics } from '@/lib/ai/mission-control';

export interface RealtimeEvent {
  type: 'feedback_created' | 'sentiment_analyzed' | 'theme_detected' | 'competitor_updated' | 'metrics_updated';
  data: any;
  timestamp: string;
}

export interface UseRealtimeDashboardOptions {
  projectId: string;
  onEvent?: (event: RealtimeEvent) => void;
  enabled?: boolean;
}

export function useRealtimeDashboard({ projectId, onEvent, enabled = true }: UseRealtimeDashboardOptions) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState<Partial<DashboardMetrics>>({});

  // Initialize Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const addEvent = useCallback((event: RealtimeEvent) => {
    setEvents(prev => [event, ...prev].slice(0, 50)); // Keep last 50 events
    onEvent?.(event);
  }, [onEvent]);

  // Refresh metrics from database
  const refreshMetrics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_dashboard_metrics', { p_project_id: projectId });

      if (!error && data) {
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error refreshing metrics:', error);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    if (!enabled || !projectId) return;

    console.log('🔴 Initializing real-time dashboard for project:', projectId);

    // Subscribe to posts (feedback) changes
    const postsChannel = supabase
      .channel(`posts:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log('📬 New feedback received:', payload.new);
          addEvent({
            type: 'feedback_created',
            data: {
              id: payload.new.id,
              title: payload.new.title,
              author: payload.new.author_name,
            },
            timestamp: new Date().toISOString(),
          });
          refreshMetrics();
        }
      )
      .subscribe((status) => {
        console.log('Posts channel status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });

    // Subscribe to sentiment analysis changes
    const sentimentChannel = supabase
      .channel(`sentiment:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sentiment_analysis',
        },
        (payload) => {
          console.log('😊 Sentiment analyzed:', payload.new);
          addEvent({
            type: 'sentiment_analyzed',
            data: {
              post_id: payload.new.post_id,
              sentiment: payload.new.sentiment,
              score: payload.new.sentiment_score,
            },
            timestamp: new Date().toISOString(),
          });
          refreshMetrics();
        }
      )
      .subscribe();

    // Subscribe to theme detection
    const themesChannel = supabase
      .channel(`themes:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'themes',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log('🏷️ Theme updated:', payload);
          addEvent({
            type: 'theme_detected',
            data: {
              theme: payload.new?.theme_name || payload.old?.theme_name,
              event: payload.eventType,
            },
            timestamp: new Date().toISOString(),
          });
        }
      )
      .subscribe();

    // Subscribe to competitive intelligence updates
    const competitiveChannel = supabase
      .channel(`competitive:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'competitors',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log('🎯 Competitor updated:', payload);
          addEvent({
            type: 'competitor_updated',
            data: {
              competitor: payload.new?.name || payload.old?.name,
              event: payload.eventType,
            },
            timestamp: new Date().toISOString(),
          });
          refreshMetrics();
        }
      )
      .subscribe();

    // Initial metrics load
    refreshMetrics();

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🔴 Cleaning up real-time subscriptions');
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(sentimentChannel);
      supabase.removeChannel(themesChannel);
      supabase.removeChannel(competitiveChannel);
      setIsConnected(false);
    };
  }, [projectId, enabled, supabase, addEvent, refreshMetrics]);

  return {
    events,
    isConnected,
    metrics,
    refreshMetrics,
  };
}
