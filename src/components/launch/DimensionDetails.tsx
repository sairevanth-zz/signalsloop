'use client';

/**
 * Dimension Details Component
 * Shows AI insights, team input, and customer quotes for a dimension
 */

import React, { useState } from 'react';
import { Zap, MessageSquare, TrendingUp, Quote, Plus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { LaunchDimension } from '@/types/launch';
import { DIMENSION_CONFIG } from '@/types/launch';

interface DimensionDetailsProps {
    dimension: LaunchDimension | undefined;
    showAIContent: boolean;
    onUpdateNotes: (dimensionId: string, notes: string) => void;
    onAddQuote?: (dimensionId: string, text: string, customer: string, mrr?: string) => void;
}

export function DimensionDetails({ dimension, showAIContent, onUpdateNotes, onAddQuote }: DimensionDetailsProps) {
    const [notes, setNotes] = useState(dimension?.team_notes || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showAddQuote, setShowAddQuote] = useState(false);
    const [quoteText, setQuoteText] = useState('');
    const [quoteCustomer, setQuoteCustomer] = useState('');
    const [quoteMrr, setQuoteMrr] = useState('');

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

    const handleAddQuote = () => {
        if (quoteText.trim() && quoteCustomer.trim() && onAddQuote) {
            onAddQuote(dimension.id, quoteText.trim(), quoteCustomer.trim(), quoteMrr.trim() || undefined);
            setQuoteText('');
            setQuoteCustomer('');
            setQuoteMrr('');
            setShowAddQuote(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{config.icon}</span>
                <div className="flex-1">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{config.name}</h3>
                </div>
                {dimension.ai_score !== undefined && dimension.ai_score !== null && (
                    <div className={cn(
                        'px-2 py-1 rounded font-semibold text-sm',
                        dimension.ai_score >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            dimension.ai_score >= 60 ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' :
                                dimension.ai_score >= 40 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    )}>
                        {dimension.ai_score}
                    </div>
                )}
            </div>

            {/* AI Insights Section */}
            <div className="mb-4">
                <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1 mb-2">
                    <Zap className="w-3 h-3" /> AI INSIGHTS
                </div>
                {showAIContent && insights.length > 0 ? (
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
                ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                        {showAIContent ? 'No AI insights yet. Click "AI Analyze" to generate.' : 'AI content is hidden.'}
                    </p>
                )}
            </div>

            {/* Team Input Section */}
            <div className="mb-4">
                <div className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold flex items-center gap-1 mb-2">
                    <MessageSquare className="w-3 h-3" /> TEAM INPUT
                </div>
                <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={handleSaveNotes}
                    placeholder="Add team notes, context, and manual assessments..."
                    className="bg-gray-50 dark:bg-slate-900 border-gray-300 dark:border-gray-700 text-xs min-h-[60px] resize-y"
                />
            </div>

            {/* Customer Quotes Section */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                        <Quote className="w-3 h-3" /> CUSTOMER QUOTES
                    </div>
                    {onAddQuote && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAddQuote(!showAddQuote)}
                            className="h-5 px-1.5 text-[10px] text-gray-500 dark:text-gray-400"
                        >
                            <Plus className="w-3 h-3 mr-0.5" /> Add
                        </Button>
                    )}
                </div>

                {showAddQuote && onAddQuote && (
                    <div className="space-y-2 p-2 bg-gray-50 dark:bg-slate-900 rounded-lg mb-2">
                        <Textarea
                            value={quoteText}
                            onChange={(e) => setQuoteText(e.target.value)}
                            placeholder="Customer quote..."
                            className="text-xs h-12 bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-700"
                        />
                        <div className="flex gap-2">
                            <Input
                                value={quoteCustomer}
                                onChange={(e) => setQuoteCustomer(e.target.value)}
                                placeholder="Customer name"
                                className="flex-1 h-6 text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-700"
                            />
                            <Input
                                value={quoteMrr}
                                onChange={(e) => setQuoteMrr(e.target.value)}
                                placeholder="MRR (optional)"
                                className="w-20 h-6 text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-700"
                            />
                            <Button size="sm" onClick={handleAddQuote} className="h-6 text-[10px]">
                                Add
                            </Button>
                        </div>
                    </div>
                )}

                {quotes.length > 0 ? (
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
                ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">No customer quotes yet.</p>
                )}
            </div>

            {/* Prediction Data (only for success_prediction dimension) */}
            {showAIContent && prediction && dimension.dimension_type === 'success_prediction' && (
                <div>
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1 mb-2">
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
