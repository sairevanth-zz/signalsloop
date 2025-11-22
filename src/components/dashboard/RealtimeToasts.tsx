/**
 * Real-Time Toast Notifications for Dashboard
 * Shows live notifications when AI agents process feedback
 */

'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useRealtimeDashboard, type RealtimeEvent } from '@/hooks/useRealtimeDashboard';
import { Bell, MessageSquare, Heart, Tag, Target } from 'lucide-react';

interface RealtimeToastsProps {
  projectId: string;
  enabled?: boolean;
}

export function RealtimeToasts({ projectId, enabled = true }: RealtimeToastsProps) {
  const hasShownConnectionToast = useRef(false);

  const { events, isConnected } = useRealtimeDashboard({
    projectId,
    enabled,
    onEvent: handleRealtimeEvent,
  });

  function handleRealtimeEvent(event: RealtimeEvent) {
    switch (event.type) {
      case 'feedback_created':
        toast.success(
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">New Feedback Received</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                {event.data.title}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                from {event.data.author}
              </p>
            </div>
          </div>,
          {
            duration: 5000,
            dismissible: true,
          }
        );
        break;

      case 'sentiment_analyzed':
        const sentimentEmoji = getSentimentEmoji(event.data.sentiment);
        const sentimentColor = getSentimentColor(event.data.sentiment);

        toast(
          <div className="flex items-start gap-3">
            <Heart className={`h-5 w-5 ${sentimentColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <p className="font-medium text-sm">Sentiment Analyzed</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {sentimentEmoji} {capitalize(event.data.sentiment)} sentiment detected
              </p>
            </div>
          </div>,
          {
            duration: 3000,
          }
        );
        break;

      case 'theme_detected':
        toast.info(
          <div className="flex items-start gap-3">
            <Tag className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm">Theme Updated</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {event.data.theme}
              </p>
            </div>
          </div>,
          {
            duration: 3000,
          }
        );
        break;

      case 'competitor_updated':
        toast.warning(
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm">Competitor Update</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {event.data.competitor} - {event.data.event}
              </p>
            </div>
          </div>,
          {
            duration: 5000,
          }
        );
        break;
    }
  }

  // Show connection status only once when first connected
  useEffect(() => {
    if (isConnected && !hasShownConnectionToast.current) {
      hasShownConnectionToast.current = true;
      toast.success(
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="text-sm">Live updates connected</span>
        </div>,
        {
          id: `realtime-connected-${projectId}`, // Unique ID to prevent duplicates
          duration: 2000,
          position: 'bottom-right',
          id: 'realtime-connected', // Prevents duplicate toasts
        }
      );
    }
  }, [isConnected, projectId]);

  return null; // This component only handles side effects
}

// Helper functions
function getSentimentEmoji(sentiment: string): string {
  switch (sentiment?.toLowerCase()) {
    case 'positive':
      return '😊';
    case 'negative':
      return '😞';
    case 'neutral':
      return '😐';
    case 'mixed':
      return '🤔';
    default:
      return '📊';
  }
}

function getSentimentColor(sentiment: string): string {
  switch (sentiment?.toLowerCase()) {
    case 'positive':
      return 'text-green-500';
    case 'negative':
      return 'text-red-500';
    case 'neutral':
      return 'text-gray-500';
    case 'mixed':
      return 'text-yellow-500';
    default:
      return 'text-blue-500';
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
