'use client';

/**
 * Metric Strip
 * Display period-specific metrics
 */

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { RetroMetric } from '@/types/retro';

interface MetricStripProps {
    metrics: RetroMetric[];
}

export function MetricStrip({ metrics }: MetricStripProps) {
    if (!metrics || metrics.length === 0) {
        return null;
    }

    return (
        <div className="bg-[#141b2d] rounded-xl p-3 border border-white/10 mb-4">
            <div className="flex gap-6 overflow-x-auto">
                {metrics.map((metric, index) => (
                    <div key={index} className="flex-shrink-0">
                        <div className="text-[10px] text-gray-500 mb-0.5">{metric.label}</div>
                        <div className="flex items-center gap-1">
                            <span className="text-lg font-bold text-white">{metric.value}</span>
                            {metric.trend && (
                                metric.trend === 'up' ? (
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                    <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                                )
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default MetricStrip;
