'use client';

/**
 * Dimension Details
 * AI insights, team notes, and customer quotes for a dimension
 */

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import type { LaunchDimension } from '@/types/launch';
import { DIMENSION_CONFIG, getScoreColor } from '@/types/launch';

interface DimensionDetailsProps {
    dimension?: LaunchDimension;
    showAIContent: boolean;
    onUpdateNotes: (dimensionId: string, notes: string) => void;
}

export function DimensionDetails({ dimension, showAIContent, onUpdateNotes }: DimensionDetailsProps) {
    const [teamNotes, setTeamNotes] = useState(dimension?.team_notes || '');

    if (!dimension) {
        return (
            <div className="bg-[#141b2d] rounded-xl p-4 border border-white/10 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Select a dimension to view details</p>
            </div>
        );
    }

    const config = DIMENSION_CONFIG[dimension.dimension_type];
    const score = dimension.ai_score || 0;

    const handleNotesBlur = () => {
        if (teamNotes !== dimension.team_notes) {
            onUpdateNotes(dimension.id, teamNotes);
        }
    };

    return (
        <div className="bg-[#141b2d] rounded-xl p-4 border border-white/10">
            {/* Header */}
            <h3 className="text-[15px] font-semibold mb-3 flex items-center gap-2">
                <span>{config.icon}</span>
                <span>{config.name}</span>
                <span
                    className="text-xs px-2.5 py-0.5 rounded-md"
                    style={{
                        backgroundColor: `${config.color}20`,
                        color: config.color,
                    }}
                >
                    {score}/100
                </span>
            </h3>

            {/* AI Insights */}
            {showAIContent && dimension.ai_insights && dimension.ai_insights.length > 0 && (
                <div className="mb-3.5">
                    <div className="text-[10px] text-teal-400 font-semibold mb-1.5">
                        🤖 AI INSIGHTS
                    </div>
                    <div className="space-y-1">
                        {dimension.ai_insights.map((insight, i) => (
                            <div
                                key={i}
                                className="bg-[#0a0f1a] p-2 px-2.5 rounded-md flex justify-between items-center"
                                style={{
                                    borderLeft: `3px solid ${insight.positive ? '#10b981' : '#f59e0b'}`,
                                }}
                            >
                                <span className="text-xs">
                                    {insight.positive ? '✓' : '⚡'} {insight.text}
                                </span>
                                <span className="text-[9px] text-teal-400 bg-teal-400/10 px-1.5 py-0.5 rounded">
                                    {insight.source}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Team Notes */}
            <div className="mb-3.5">
                <div className="text-[10px] text-cyan-400 font-semibold mb-1.5">
                    👤 TEAM INPUT
                </div>
                <div
                    className="bg-[#0a0f1a] rounded-md"
                    style={{ borderLeft: '3px solid #00c2ff' }}
                >
                    <Textarea
                        value={teamNotes}
                        onChange={(e) => setTeamNotes(e.target.value)}
                        onBlur={handleNotesBlur}
                        placeholder="Add team notes and context..."
                        className="bg-transparent border-0 text-xs min-h-[60px] resize-none"
                    />
                </div>
            </div>

            {/* Customer Quotes (for customer_readiness) */}
            {dimension.customer_quotes && dimension.customer_quotes.length > 0 && (
                <div>
                    <div className="text-[10px] text-purple-400 font-semibold mb-1.5">
                        💬 CUSTOMER QUOTES
                    </div>
                    <div className="space-y-1.5">
                        {dimension.customer_quotes.map((quote, i) => (
                            <div
                                key={i}
                                className="bg-[#0a0f1a] p-2.5 rounded-md border border-white/5"
                            >
                                <p className="text-[11px] italic mb-1.5">"{quote.text}"</p>
                                <div className="flex justify-between text-[11px]">
                                    <span className="font-semibold">{quote.customer}</span>
                                    <span className="text-emerald-400">{quote.mrr} MRR</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Prediction Stats (for success_prediction) */}
            {dimension.prediction_data && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="bg-[#0a0f1a] p-3 rounded-lg text-center">
                        <div className="text-xl font-bold text-emerald-400">
                            {dimension.prediction_data.adoption}%
                        </div>
                        <div className="text-[9px] text-gray-500">Adoption</div>
                    </div>
                    <div className="bg-[#0a0f1a] p-3 rounded-lg text-center">
                        <div className="text-xl font-bold text-teal-400">
                            +{dimension.prediction_data.sentiment.toFixed(2)}
                        </div>
                        <div className="text-[9px] text-gray-500">Sentiment</div>
                    </div>
                    <div className="bg-[#0a0f1a] p-3 rounded-lg text-center">
                        <div className="text-xl font-bold text-cyan-400">
                            ${(dimension.prediction_data.revenue / 1000).toFixed(0)}K
                        </div>
                        <div className="text-[9px] text-gray-500">Revenue</div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DimensionDetails;
