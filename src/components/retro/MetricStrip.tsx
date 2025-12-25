'use client';

/**
 * Metric Strip Component
 * Displays period-specific metrics
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RetroMetric } from '@/types/retro';

interface MetricStripProps {
    metrics: RetroMetric[] | null | undefined;
}

export function MetricStrip({ metrics }: MetricStripProps) {
    if (!metrics || metrics.length === 0) {
        return null;
    }

    const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
        switch (trend) {
            case 'up':
                return <TrendingUp className="w-3 h-3 text-green-500" />;
            case 'down':
                return <TrendingDown className="w-3 h-3 text-red-500" />;
            default:
                return <Minus className="w-3 h-3 text-gray-400" />;
        }
    };

    const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
        switch (trend) {
            case 'up':
                return 'text-green-600 dark:text-green-400';
            case 'down':
                return 'text-red-600 dark:text-red-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    return (
        <div className="flex gap-3 mb-4 overflow-x-auto pb-1">
            {metrics.map((metric, idx) => (
                <div
                    key={idx}
                    className="flex-shrink-0 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 min-w-[120px]"
                >
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 truncate">
                        {metric.label}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className={cn('text-sm font-bold', getTrendColor(metric.trend))}>
                            {metric.value}
                        </span>
                        {getTrendIcon(metric.trend)}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default MetricStrip;
