'use client';

/**
 * AI Summary Panel Component
 * Generates and displays AI summary
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AISummaryPanelProps {
    summary: string | null | undefined;
    onGenerate: () => void;
    isGenerating: boolean;
}

export function AISummaryPanel({ summary, onGenerate, isGenerating }: AISummaryPanelProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-white/10">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mb-2">
                🤖 AI Summary
            </h3>

            {summary ? (
                <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                    {summary}
                </div>
            ) : (
                <div className="text-center py-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Generate an AI summary of this retrospective
                    </p>
                    <Button
                        size="sm"
                        onClick={onGenerate}
                        disabled={isGenerating}
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {isGenerating ? 'Generating...' : 'Generate Summary'}
                    </Button>
                </div>
            )}
        </div>
    );
}

export default AISummaryPanel;
