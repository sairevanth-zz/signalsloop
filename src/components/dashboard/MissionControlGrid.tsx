/**
 * MissionControlGrid - Main dashboard layout with Bento Grid
 * Displays AI briefing, metrics, opportunities, and threats
 */

'use client';

import React, { useState, useEffect } from 'react';
import { BriefingCard } from './BriefingCard';
import { MetricCard } from './MetricCard';
import { BentoCard } from './BentoCard';
import { RealtimeToasts } from './RealtimeToasts';
import { AgentActivityCard } from './AgentActivityCard';
import { EventActivityWidget } from './EventActivityWidget';
import { Heart, Zap, Shield, TrendingUp, Loader2, BarChart3, Radio } from 'lucide-react';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import type { DailyBriefingContent, DashboardMetrics } from '@/lib/ai/mission-control';

interface MissionControlGridProps {
  briefing: DailyBriefingContent;
  metrics: DashboardMetrics;
  userName?: string;
  projectId: string;
  projectSlug: string;
}

export function MissionControlGrid({ briefing, metrics: initialMetrics, userName, projectId, projectSlug }: MissionControlGridProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<DashboardMetrics>(initialMetrics);

  // Real-time dashboard hook
  const { isConnected, metrics: realtimeMetrics, events } = useRealtimeDashboard({
    projectId,
    enabled: true,
  });

  // Update metrics when real-time data changes
  useEffect(() => {
    if (realtimeMetrics && Object.keys(realtimeMetrics).length > 0) {
      setLiveMetrics(prev => ({
        ...prev,
        ...realtimeMetrics,
      }));
    }
  }, [realtimeMetrics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/dashboard/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (response.ok) {
        // Reload the page to show new briefing
        window.location.reload();
      }
    } catch (error) {
      console.error('Error refreshing briefing:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      {/* Real-time toast notifications */}
      <RealtimeToasts projectId={projectId} enabled={true} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
        {/* Row 1: Hero Briefing Card (takes 2 columns, 2 rows) + Metrics */}
        <BriefingCard
          briefing={briefing}
          userName={userName}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Sentiment Metric - LIVE UPDATES */}
        <MetricCard
          label="Sentiment Score"
          value={`${Math.round(liveMetrics.sentiment?.current_nps || 0)}`}
          trend={liveMetrics.sentiment?.trend || 'stable'}
          trendValue={`${liveMetrics.sentiment?.change_percent > 0 ? '+' : ''}${liveMetrics.sentiment?.change_percent || 0}% vs last week`}
          icon={Heart}
          iconColor="text-pink-400"
          badge={isConnected ? <Radio className="h-3 w-3 text-green-500 animate-pulse" /> : undefined}
        />

        {/* Velocity Metric - LIVE UPDATES */}
        <MetricCard
          label="Feedback Velocity"
          value={`${liveMetrics.feedback?.total_this_week || 0}`}
          trend={liveMetrics.feedback?.trend || 'stable'}
          trendValue={`${Math.round(liveMetrics.feedback?.issues_per_week || 0)} issues/week`}
          icon={Zap}
          iconColor="text-yellow-400"
          badge={isConnected ? <Radio className="h-3 w-3 text-green-500 animate-pulse" /> : undefined}
        />

      {/* Row 2: Threats Card (below sentiment) */}
      <BentoCard>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-400" />
              <h3 className="font-semibold text-white">Threats</h3>
            </div>
            {briefing.threats.length > 0 && (
              <span className="rounded-full bg-red-950/50 px-2 py-1 text-xs font-medium text-red-300">
                {briefing.threats.length} Active
              </span>
            )}
          </div>

          {briefing.threats.length > 0 ? (
            <ul className="space-y-2">
              {briefing.threats.slice(0, 3).map((threat, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span
                    className={
                      threat.severity === 'high'
                        ? 'text-red-400'
                        : threat.severity === 'medium'
                        ? 'text-orange-400'
                        : 'text-yellow-400'
                    }
                  >
                    {threat.severity === 'high' ? '🔴' : threat.severity === 'medium' ? '🟡' : '🟢'}
                  </span>
                  <div>
                    <div className="text-slate-200">{threat.title}</div>
                    <div className="text-xs text-slate-500 capitalize">{threat.severity} priority</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center justify-center py-6 text-sm text-slate-500">
              No active threats detected
            </div>
          )}
        </div>
      </BentoCard>

      {/* Roadmap Pulse (below velocity) */}
      <BentoCard>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-white">Roadmap Pulse</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">In Progress</span>
              <span className="text-lg font-bold text-white">{liveMetrics.roadmap?.in_progress || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Planned</span>
              <span className="text-lg font-bold text-white">{liveMetrics.roadmap?.planned || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Completed This Week</span>
              <span className="text-lg font-bold text-green-400">{liveMetrics.roadmap?.completed_this_week || 0}</span>
            </div>
          </div>
        </div>
      </BentoCard>

      {/* System Events Widget */}
      <EventActivityWidget projectId={projectId} projectSlug={projectSlug} />

      {/* Row 3: Opportunities (spans 2 columns) */}
      <BentoCard colSpan={2}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <h3 className="font-semibold text-white">Top Opportunities</h3>
            </div>
            <span className="text-xs text-slate-500">AI-ranked by impact</span>
          </div>

          {briefing.opportunities.length > 0 ? (
            <div className="space-y-2">
              {briefing.opportunities.slice(0, 4).map((opportunity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 transition-colors hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-600">#{index + 1}</span>
                    <div>
                      <div className="font-medium text-white">{opportunity.title}</div>
                      <div className="text-xs text-slate-500">{opportunity.votes} votes</div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      opportunity.impact === 'high'
                        ? 'bg-green-950/50 text-green-300'
                        : opportunity.impact === 'medium'
                        ? 'bg-blue-950/50 text-blue-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {opportunity.impact} impact
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-sm text-slate-500">
              No opportunities identified yet
            </div>
          )}
        </div>
      </BentoCard>

      {/* Competitive Intelligence (if available) - LIVE UPDATES */}
      {(liveMetrics.competitors?.new_insights_count || 0) > 0 && (
        <BentoCard colSpan={2}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Competitive Intelligence</h3>
              <span className="rounded-full bg-purple-950/50 px-2 py-1 text-xs font-medium text-purple-300">
                {liveMetrics.competitors?.new_insights_count || 0} New
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <div className="text-2xl font-bold text-white">{liveMetrics.competitors?.new_insights_count || 0}</div>
                <div className="text-sm text-slate-400">New Insights (7d)</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <div className="text-2xl font-bold text-red-400">{liveMetrics.competitors?.high_priority_count || 0}</div>
                <div className="text-sm text-slate-400">High Priority</div>
              </div>
            </div>
          </div>
        </BentoCard>
      )}

      {/* Agent Activity Card */}
      <AgentActivityCard projectId={projectId} projectSlug={projectSlug} />
      </div>
    </>
  );
}

/**
 * Loading skeleton for the dashboard
 */
export function MissionControlGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
      {/* Hero card skeleton */}
      <div className="col-span-2 row-span-2 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-48 animate-pulse rounded bg-slate-800" />
              <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
          </div>
        </div>
      </div>

      {/* Metric cards skeleton */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
          </div>
        </div>
      ))}

      {/* Opportunities skeleton */}
      <div className="col-span-2 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-slate-800" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-slate-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
