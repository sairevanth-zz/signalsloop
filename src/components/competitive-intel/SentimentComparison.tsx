import React from 'react';
import { CompetitiveAnalysis } from '@/lib/competitive-intel/types';

interface SentimentComparisonProps {
    data: CompetitiveAnalysis['sentiment_comparison'];
}

export function SentimentComparison({ data }: SentimentComparisonProps) {
    const products = Object.values(data);

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">Sentiment Score</h3>
            <div className="grid gap-6">
                {products.map((item) => (
                    <div key={item.product} className="space-y-2">
                        <div className="flex justify-between items-end">
                            <span className="font-medium">{item.product}</span>
                            <span className="text-sm font-bold">
                                {item.positive_pct}% Positive
                            </span>
                        </div>

                        <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                            <div
                                className="bg-green-500 h-full"
                                style={{ width: `${item.positive_pct}%` }}
                                title={`${item.positive_pct}% Positive`}
                            />
                            <div
                                className="bg-gray-400 h-full"
                                style={{ width: `${item.neutral_pct}%` }}
                                title={`${item.neutral_pct}% Neutral`}
                            />
                            <div
                                className="bg-red-500 h-full"
                                style={{ width: `${item.negative_pct}%` }}
                                title={`${item.negative_pct}% Negative`}
                            />
                        </div>

                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                            <span>{item.review_count} reviews analyzed</span>
                            <div className="flex gap-3">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Pos</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-400" /> Neu</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Neg</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
