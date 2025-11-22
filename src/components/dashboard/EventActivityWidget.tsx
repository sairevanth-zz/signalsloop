/**
 * Event Activity Widget
 * Shows recent event activity and agent status on main dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { BentoCard } from './BentoCard';
import { Activity, Radio, Eye, TrendingUp, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

interface EventActivityProps {
  projectId: string;
  projectSlug: string;
}

interface RecentActivity {
  last_hour_events: number;
  active_agents: number;
  health_status: 'healthy' | 'warning' | 'critical';
  recent_events: Array<{
    type: string;
    created_at: string;
  }>;
}

export function EventActivityWidget({ projectId, projectSlug }: EventActivityProps) {
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadActivity();
    // Refresh every 30 seconds
    const interval = setInterval(loadActivity, 30000);
    return () => clearInterval(interval);
  }, [projectId]);

  const loadActivity = async () => {
    try {
      const response = await fetch(`/api/events/activity-summary?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setActivity(data);
      }
    } catch (error) {
      console.error('Error loading event activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = () => {
    router.push(`/${projectSlug}/events`);
  };

  if (loading) {
    return (
      <BentoCard>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      </BentoCard>
    );
  }

  if (!activity) {
    return null;
  }

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Warning</Badge>;
      case 'critical':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Critical</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">Unknown</Badge>;
    }
  };

  return (
    <BentoCard>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-white">System Events</h3>
          </div>
          <button
            onClick={handleViewDetails}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Eye className="h-3 w-3" />
            View All
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Events Last Hour */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-slate-400">Last Hour</span>
            </div>
            <div className="text-xl font-bold text-white">
              {activity.last_hour_events}
            </div>
            <div className="text-xs text-slate-500">events</div>
          </div>

          {/* Active Agents */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Radio className="h-4 w-4 text-green-400 animate-pulse" />
              <span className="text-xs text-slate-400">Active Agents</span>
            </div>
            <div className="text-xl font-bold text-white">
              {activity.active_agents}
            </div>
            <div className="text-xs text-slate-500">running</div>
          </div>
        </div>

        {/* Health Status */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-sm text-slate-400">System Health</span>
          {getHealthBadge(activity.health_status)}
        </div>

        {/* Recent Events */}
        {activity.recent_events.length > 0 && (
          <div className="pt-2 border-t border-slate-800">
            <div className="text-xs text-slate-400 mb-2">Recent Events</div>
            <div className="space-y-1">
              {activity.recent_events.slice(0, 3).map((event, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 truncate">
                    {event.type}
                  </span>
                  <span className="text-slate-500">
                    {new Date(event.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BentoCard>
  );
}
