'use client';

/**
 * Dimension Details Component
 * Shows AI insights and team notes for a dimension
 */

import React, { useState } from 'react';
import { Zap, MessageSquare, TrendingUp, BarChart3 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { LaunchDimension } from '@/types/launch';
import { DIMENSION_CONFIG } from '@/types/launch';

interface DimensionDetailsProps {
    dimension: LaunchDimension | undefined;
    showAIContent: boolean;
    onUpdateNotes: (dimensionId: string, notes: string) => void;
}

export function DimensionDetails({ dimension, showAIContent, onUpdateNotes }: DimensionDetailsProps) {
    const [notes, setNotes] = useState(dimension?.team_notes || '');
    const [isSaving, setIsSaving] = useState(false);

    if (!dimension) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-white/10">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Select a dimension to view details</p>
            </div>
        );
    }

    const config = DIMENSION_CONFIG[dimension.dimension_type];
    const insights = dimension.ai_insights || [];
    const quotes = dimension.customer_quotes || [];
    const prediction = dimension.prediction_data;

    const handleSaveNotes = async () => {
        setIsSaving(true);
        await onUpdateNotes(dimension.id, notes);
        setIsSaving(false);
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{config.icon}</span>
                <div>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{config.name}</h3>
                </div>
                {dimension.ai_score !== undefined && dimension.ai_score !== null && (
                    <div className={cn(
                        'ml-auto px-2 py-1 rounded font-semibold text-sm',
                        dimension.ai_score >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            dimension.ai_score >= 60 ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' :
                                dimension.ai_score >= 40 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    )}>
                        {dimension.ai_score}
                    </div>
                )}
            </div>

            {/* AI Insights */}
            {showAIContent && insights.length > 0 && (
                <div className="mb-3">
                    <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1 mb-1.5">
                        <Zap className="w-3 h-3" /> AI INSIGHTS
                    </div>
                    <div className="space-y-1.5">
                        {insights.map((insight, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    'text-xs p-2 rounded-lg border',
                                    insight.positive
                                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-700/40 text-green-800 dark:text-green-300'
                                        : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-700/40 text-red-800 dark:text-red-300'
                                )}
                            >
                                <span className="mr-1">{insight.positive ? '✓' : '⚠'}</span>
                                {insight.text}
                                <span className="text-[10px] text-gray-500 dark:text-gray-500 ml-1">— {insight.source}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Team Notes */}
            <div className="mb-3">
                <div className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold flex items-center gap-1 mb-1.5">
                    <MessageSquare className="w-3 h-3" /> TEAM NOTES
                </div>
                <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={handleSaveNotes}
                    placeholder="Add team notes and context..."
                    className="bg-gray-50 dark:bg-slate-900 border-gray-300 dark:border-gray-700 text-sm min-h-[60px] resize-y"
                />
            </div>

            {/* Customer Quotes */}
            {showAIContent && quotes.length > 0 && (
                <div className="mb-3">
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 mb-1.5">
                        💬 CUSTOMER QUOTES
                    </div>
                    <div className="space-y-1.5">
                        {quotes.map((quote, idx) => (
                            <div
                                key={idx}
                                className="text-xs p-2 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700/40"
                            >
                                <p className="text-gray-800 dark:text-gray-300 italic">"{quote.text}"</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
                                    — {quote.customer} {quote.mrr && quote.mrr !== 'N/A' && `($${quote.mrr} MRR)`}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Prediction Data */}
            {showAIContent && prediction && dimension.dimension_type === 'success_prediction' && (
                <div>
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1 mb-1.5">
                        <TrendingUp className="w-3 h-3" /> PREDICTIONS
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-700/40 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{prediction.adoption}%</div>
                            <div className="text-[10px] text-purple-600 dark:text-purple-400">Adoption</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-700/40 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-purple-700 dark:text-purple-300">+{(prediction.sentiment * 100).toFixed(0)}%</div>
                            <div className="text-[10px] text-purple-600 dark:text-purple-400">Sentiment</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-700/40 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-purple-700 dark:text-purple-300">${(prediction.revenue / 1000).toFixed(0)}K</div>
                            <div className="text-[10px] text-purple-600 dark:text-purple-400">Revenue</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DimensionDetails;
