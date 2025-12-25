'use client';

/**
 * Outcomes Timeline Component
 * Shows shipped features and their outcomes
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutcomeItem {
    feature: string;
    shipped?: string;
    status: 'success' | 'partial' | 'failed';
    adoption?: string;
    predicted?: string;
    sentiment?: string;
}

interface OutcomesTimelineProps {
    items: OutcomeItem[];
    showAI?: boolean;
}

export function OutcomesTimeline({ items, showAI = true }: OutcomesTimelineProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'text-green-500 dark:text-green-400';
            case 'partial': return 'text-yellow-500 dark:text-yellow-400';
            case 'failed': return 'text-red-500 dark:text-red-400';
            default: return 'text-gray-500 dark:text-gray-400';
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'success': return 'bg-green-100 dark:bg-green-900/20';
            case 'partial': return 'bg-yellow-100 dark:bg-yellow-900/20';
            case 'failed': return 'bg-red-100 dark:bg-red-900/20';
            default: return 'bg-gray-100 dark:bg-gray-800';
        }
    };

    const getTrendIcon = (value: string) => {
        if (!value) return null;
        if (value.startsWith('+')) return <TrendingUp className="w-3 h-3 text-green-500" />;
        if (value.startsWith('-')) return <TrendingDown className="w-3 h-3 text-red-500" />;
        return <Minus className="w-3 h-3 text-gray-400" />;
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10">
            <div className="p-3 border-b border-gray-200 dark:border-white/10">
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    📊 Outcomes Timeline
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">
                        Shipped → Measured
                    </span>
                </h3>
            </div>

            <div className="p-2 space-y-2 max-h-[300px] overflow-y-auto">
                {items.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                        No outcomes tracked yet. Data will appear after AI analysis.
                    </p>
                ) : (
                    items.map((item, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                'rounded-lg p-2.5 border',
                                getStatusBg(item.status),
                                'border-gray-200 dark:border-white/5'
                            )}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="text-xs font-medium text-gray-900 dark:text-white">
                                    {item.feature}
                                </h4>
                                {item.adoption && (
                                    <div className={cn(
                                        'text-sm font-bold',
                                        getStatusColor(item.status)
                                    )}>
                                        {item.adoption}
                                    </div>
                                )}
                            </div>

                            {item.shipped && (
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">
                                    Shipped {item.shipped}
                                </p>
                            )}

                            <div className="flex items-center gap-3 text-[10px]">
                                {item.predicted && (
                                    <span className="flex items-center gap-0.5 text-gray-600 dark:text-gray-400">
                                        {getTrendIcon(item.predicted)}
                                        {item.predicted} pred
                                    </span>
                                )}
                                {item.sentiment && (
                                    <span className="flex items-center gap-0.5 text-gray-600 dark:text-gray-400">
                                        {getTrendIcon(item.sentiment)}
                                        {item.sentiment}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showAI && items.length > 0 && (
                <div className="p-3 border-t border-gray-200 dark:border-white/10 bg-teal-50 dark:bg-teal-900/10">
                    <div className="flex items-center gap-2 text-xs text-teal-700 dark:text-teal-400">
                        <Sparkles className="w-3 h-3" />
                        <span className="font-medium">SignalsLoop Insight</span>
                    </div>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">
                        {items.filter(i => i.status === 'success').length} of {items.length} features beat predictions. Prediction accuracy: {Math.round((items.filter(i => i.status === 'success').length / items.length) * 100)}%
                    </p>
                </div>
            )}
        </div>
    );
}

export default OutcomesTimeline;
