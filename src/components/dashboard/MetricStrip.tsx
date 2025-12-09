/**
 * MetricStrip - Horizontal metrics bar for Mission Control
 * 
 * Displays 4 key metrics in a compact horizontal strip at the top of the dashboard.
 * Replaces the 4 separate MetricCard components with a unified, glanceable view.
 */

'use client';

import React from 'react';
import { Heart, Zap, Activity, Users, Radio, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { DashboardMetrics } from '@/lib/ai/mission-control';

interface MetricStripProps {
    metrics: DashboardMetrics;
    isConnected?: boolean;
}

interface MetricItemProps {
    icon: React.ElementType;
    iconColor: string;
    bgColor: string;
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'stable';
    trendValue?: string;
    isLive?: boolean;
}

function MetricItem({ icon: Icon, iconColor, bgColor, label, value, trend, trendValue, isLive }: MetricItemProps) {
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-slate-500';

    return (
        <div className="flex items-center gap-4 px-6 py-3">
            <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white">{value}</span>
                    {trend && (
                        <span className={`flex items-center gap-0.5 text-xs ${trendColor}`}>
                            <TrendIcon className="w-3 h-3" />
                            {trendValue}
                        </span>
                    )}
                    {isLive && (
                        <Radio className="w-3 h-3 text-green-500 animate-pulse ml-1" />
                    )}
                </div>
                <span className="text-sm text-slate-400">{label}</span>
            </div>
        </div>
    );
}

export function MetricStrip({ metrics, isConnected = false }: MetricStripProps) {
    const sentimentValue = Math.round(metrics.sentiment?.current_nps || 0);
    const sentimentTrend = metrics.sentiment?.trend || 'stable';
    const sentimentChange = metrics.sentiment?.change_percent || 0;

    const velocityValue = metrics.feedback?.total_this_week || 0;
    const velocityTrend = metrics.feedback?.trend || 'stable';

    const healthValue = metrics.health_score?.overall_score || 0;
    const healthTrend = metrics.health_score?.trend || 'stable';

    const usageValue = metrics.usage?.weekly_active || 0;
    const usageTrend = metrics.usage?.trend || 'stable';

    return (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/50 backdrop-blur-sm overflow-hidden">
            <div className="grid grid-cols-4 divide-x divide-slate-800/50">
                <MetricItem
                    icon={Heart}
                    iconColor="text-pink-400"
                    bgColor="bg-pink-500/20"
                    label="Sentiment"
                    value={sentimentValue}
                    trend={sentimentTrend}
                    trendValue={`${sentimentChange > 0 ? '+' : ''}${sentimentChange}%`}
                    isLive={isConnected}
                />
                <MetricItem
                    icon={Zap}
                    iconColor="text-yellow-400"
                    bgColor="bg-yellow-500/20"
                    label="Feedback/wk"
                    value={velocityValue}
                    trend={velocityTrend}
                    trendValue={`${Math.round(metrics.feedback?.issues_per_week || 0)}/wk`}
                    isLive={isConnected}
                />
                <MetricItem
                    icon={Activity}
                    iconColor="text-emerald-400"
                    bgColor="bg-emerald-500/20"
                    label="Health Score"
                    value={healthValue}
                    trend={healthTrend}
                />
                <MetricItem
                    icon={Users}
                    iconColor="text-blue-400"
                    bgColor="bg-blue-500/20"
                    label="Weekly Active"
                    value={`${usageValue} WAU`}
                    trend={usageTrend}
                    trendValue={`${metrics.usage?.events_per_user || 0}/user`}
                />
            </div>
        </div>
    );
}

export function MetricStripSkeleton() {
    return (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/50 backdrop-blur-sm overflow-hidden">
            <div className="grid grid-cols-4 divide-x divide-slate-800/50">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-6 w-16 bg-slate-800 rounded animate-pulse" />
                            <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
