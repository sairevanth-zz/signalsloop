/**
 * Agent Activity Card
 * Shows recent autonomous agent activity on the dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { BentoCard } from './BentoCard';
import { Activity, Zap, TrendingUp, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AgentActivityProps {
  projectId: string;
  projectSlug: string;
}

interface ActivitySummary {
  last_24_hours: {
    total_events: number;
    feedback_created: number;
    sentiment_analyzed: number;
    specs_drafted: number;
  };
  agent_stats: {
    sentiment_agent: { posts_analyzed: number };
    spec_writer_agent: { specs_created: number };
    competitive_intel_agent: { competitors_found: number };
  };
}

export function AgentActivityCard({ projectId, projectSlug }: AgentActivityProps) {
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadActivity();
  }, [projectId]);

  const loadActivity = async () => {
    try {
      const response = await fetch(`/api/agents/activity?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setActivity(data.activity);
      }
    } catch (error) {
      console.error('Error loading agent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAgents = () => {
    router.push(`/${projectSlug}/settings?tab=agents`);
  };

  if (loading) {
    return (
      <BentoCard colSpan={2}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      </BentoCard>
    );
  }

  if (!activity) {
    return null;
  }

  return (
    <BentoCard colSpan={2}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-white">Autonomous Agents</h3>
          </div>
          <button
            onClick={handleViewAgents}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            View All
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Sentiment Agent */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-slate-400">Sentiment</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {activity.last_24_hours.sentiment_analyzed}
            </div>
            <div className="text-xs text-slate-500">analyzed today</div>
          </div>

          {/* Spec Writer Agent */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xs text-slate-400">Specs</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {activity.agent_stats.spec_writer_agent.specs_created}
            </div>
            <div className="text-xs text-slate-500">auto-drafted</div>
          </div>

          {/* Competitive Intel */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-slate-400">Competitors</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {activity.agent_stats.competitive_intel_agent.competitors_found}
            </div>
            <div className="text-xs text-slate-500">tracked</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>7 agents running 24/7 • &lt;10s latency</span>
        </div>
      </div>
    </BentoCard>
  );
}
