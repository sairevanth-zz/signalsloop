'use client';

/**
 * Priority History Viewer
 *
 * Displays automatic priority adjustments made by the Dynamic Roadmap Agent
 * Shows why priorities changed and what triggered the changes
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  History,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Calendar,
  Zap,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/supabase-client';

interface PriorityChange {
  id: string;
  theme_name: string;
  old_priority: string;
  new_priority: string;
  old_score: number;
  new_score: number;
  score_change: number;
  adjustment_reason: string;
  triggers: string[];
  adjustment_type: 'automatic' | 'manual';
  adjusted_by_agent?: string;
  created_at: string;
}

interface PriorityHistoryViewerProps {
  projectId: string;
  days?: number; // How many days back to show
}

export function PriorityHistoryViewer({ projectId, days = 7 }: PriorityHistoryViewerProps) {
  const [changes, setChanges] = useState<PriorityChange[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .rpc('get_recent_priority_changes', {
          p_project_id: projectId,
          p_days: days
        });

      if (error) {
        console.error('Error loading priority history:', error);
      } else {
        setChanges(data || []);
      }
    } catch (error) {
      console.error('Failed to load priority history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [projectId, days]);

  const getPriorityColor = (priority: string) => {
    const colors = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-500';
  };

  const getTriggerIcon = (trigger: string) => {
    if (trigger.includes('velocity')) return <TrendingUp className="w-3 h-3" />;
    if (trigger.includes('sentiment')) return <TrendingDown className="w-3 h-3" />;
    if (trigger.includes('competitive')) return <Zap className="w-3 h-3" />;
    return <ChevronRight className="w-3 h-3" />;
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      'feedback_velocity_spike': 'Feedback Spike',
      'sentiment_deterioration': 'Sentiment Drop',
      'competitive_pressure': 'Competitive Pressure',
      'revenue_impact': 'Revenue Impact'
    };
    return labels[trigger] || trigger;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </Card>
    );
  }

  if (changes.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No priority changes in the last {days} days</p>
          <p className="text-sm text-gray-400 mt-1">
            The Dynamic Roadmap Agent automatically adjusts priorities based on signals
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Priority Changes</h3>
          <Badge variant="secondary">{changes.length}</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadHistory}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="space-y-3">
        {changes.map((change) => (
          <div
            key={change.id}
            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{change.theme_name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-2">
                    <Badge className={`${getPriorityColor(change.old_priority)} text-white text-xs`}>
                      {change.old_priority}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <Badge className={`${getPriorityColor(change.new_priority)} text-white text-xs`}>
                      {change.new_priority}
                    </Badge>
                  </div>
                  <span className={`text-sm font-medium ${
                    change.score_change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {change.score_change > 0 ? '+' : ''}{change.score_change.toFixed(1)} pts
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                {new Date(change.created_at).toLocaleDateString()}
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-2">{change.adjustment_reason}</p>

            {change.triggers && change.triggers.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {change.triggers.map((trigger, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    <span className="mr-1">{getTriggerIcon(trigger)}</span>
                    {getTriggerLabel(trigger)}
                  </Badge>
                ))}
              </div>
            )}

            {change.adjustment_type === 'automatic' && change.adjusted_by_agent && (
              <div className="mt-2 pt-2 border-t">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Automatically adjusted by {change.adjusted_by_agent}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
