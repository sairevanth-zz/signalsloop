/**
 * MissionControlGrid - Redesigned Mission Control Dashboard
 * 
 * Hybrid design combining:
 * - Design 1 (Command Center): Structured layout with metrics strip, tabs
 * - Design 2 (AI-First): Conversational briefing, warm greeting
 * 
 * Layout:
 * 1. RoadmapAdjustmentBanner - Self-correcting roadmap proposals
 * 2. MetricStrip - Horizontal metrics bar at top
 * 3. CommandBar - Feature navigation 
 * 4. Hero Zone - AI Briefing (60%) + Attention Stack (40%)
 * 5. DashboardTabs - Deep-dive sections
 */

'use client';

import React, { useState, useEffect } from 'react';
import { BriefingCard } from './BriefingCard';
import { RealtimeToasts } from './RealtimeToasts';
import { MetricStrip, MetricStripSkeleton } from './MetricStrip';
import { AttentionStack, AttentionStackSkeleton } from './AttentionStack';
import { CommandBar, CommandBarCompact } from './CommandBar';
import { DashboardTabs } from './DashboardTabs';
import { RoadmapAdjustmentBanner } from '@/components/roadmap/RoadmapAdjustmentBanner';
import { StrategyShiftsCard } from './StrategyShiftsCard';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import type { DailyBriefingContent, DashboardMetrics } from '@/lib/ai/mission-control';

interface MissionControlGridProps {
  briefing: DailyBriefingContent;
  briefingId?: string;
  metrics: DashboardMetrics;
  userName?: string;
  projectId: string;
  projectSlug: string;
  isAdmin?: boolean;
}

export function MissionControlGrid({
  briefing,
  briefingId,
  metrics: initialMetrics,
  userName,
  projectId,
  projectSlug,
  isAdmin = false
}: MissionControlGridProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [actionQueueCount, setActionQueueCount] = useState(0);

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

  // Fetch action queue count for attention stack
  useEffect(() => {
    async function fetchActionQueueCount() {
      try {
        const res = await fetch(`/api/actions/queue?projectId=${projectId}&count=true`);
        if (res.ok) {
          const data = await res.json();
          setActionQueueCount(data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching action queue count:', error);
      }
    }
    fetchActionQueueCount();
  }, [projectId]);

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

  // Calculate anomaly count from metrics (safely access property that may not exist)
  const anomalyCount = (liveMetrics as any).anomalies?.count || 0;

  return (
    <>
      {/* Real-time toast notifications */}
      <RealtimeToasts projectId={projectId} enabled={true} />

      <div data-tour="mission-control" className="space-y-6">
        {/* Row 0: Self-Correcting Roadmap Banner */}
        <RoadmapAdjustmentBanner projectId={projectId} />

        {/* Row 1: Metric Strip */}
        <MetricStrip metrics={liveMetrics} isConnected={isConnected} />

        {/* Row 2: Command Bar */}
        <div className="hidden lg:block">
          <CommandBar projectSlug={projectSlug} isAdmin={isAdmin} />
        </div>
        <div className="lg:hidden">
          <CommandBarCompact projectSlug={projectSlug} isAdmin={isAdmin} />
        </div>

        {/* Row 3: Hero Zone - Briefing + Attention Stack */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* AI Briefing - 3 columns (60%) */}
          <div className="lg:col-span-3">
            <BriefingCard
              briefing={briefing}
              briefingId={briefingId}
              projectId={projectId}
              userName={userName}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              className="h-full"
            />
          </div>

          {/* Attention Stack - 2 columns (40%) */}
          <div className="lg:col-span-2">
            <AttentionStack
              projectSlug={projectSlug}
              threats={briefing.threats}
              actionQueueCount={actionQueueCount}
              hasWeeklyInsight={true}
              anomalyCount={anomalyCount}
            />
          </div>
        </div>

        {/* Row 4: Strategy Shifts - Live Strategy Co-Pilot */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StrategyShiftsCard
            projectId={projectId}
            projectSlug={projectSlug}
          />
        </div>

        {/* Row 6: Deep-Dive Tabs */}
        <DashboardTabs
          projectId={projectId}
          projectSlug={projectSlug}
          briefing={briefing}
          metrics={liveMetrics}
        />
      </div>
    </>
  );
}

/**
 * Loading skeleton for the dashboard
 */
export function MissionControlGridSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metric Strip Skeleton */}
      <MetricStripSkeleton />

      {/* Command Bar Skeleton */}
      <div className="h-12 bg-slate-900/50 rounded-xl animate-pulse" />

      {/* Hero Zone Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 h-80 rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse" />
        <div className="lg:col-span-2">
          <AttentionStackSkeleton />
        </div>
      </div>

      {/* Secondary Metrics Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse" />
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="h-96 rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse" />
    </div>
  );
}
