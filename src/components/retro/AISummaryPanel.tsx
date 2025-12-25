'use client';

/**
 * AI Summary Panel
 * Generate and display AI summary
 */

import React from 'react';
import { Sparkles, FileDown, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AISummaryPanelProps {
    summary?: string;
    onGenerate: () => void;
    isGenerating: boolean;
}

export function AISummaryPanel({ summary, onGenerate, isGenerating }: AISummaryPanelProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        if (summary) {
            await navigator.clipboard.writeText(summary);
            setCopied(true);
            toast.success('Summary copied!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div
            className="rounded-xl p-4 border"
            style={{
                background: 'linear-gradient(135deg, rgba(6, 214, 160, 0.05), rgba(20, 184, 166, 0.05))',
                borderColor: 'rgba(6, 214, 160, 0.2)',
            }}
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    AI Summary
                </h4>
                {summary && (
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopy}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        >
                            <FileDown className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Content */}
            {summary ? (
                <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {summary}
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-xs text-gray-500 mb-3">
                        Generate an AI summary of this retrospective
                    </p>
                    <Button
                        onClick={onGenerate}
                        disabled={isGenerating}
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-xs"
                    >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        {isGenerating ? 'Generating...' : 'Generate Summary'}
                    </Button>
                </div>
            )}

            {/* Regenerate button */}
            {summary && (
                <Button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 text-[10px] border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
                >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {isGenerating ? 'Regenerating...' : 'Regenerate Summary'}
                </Button>
            )}
        </div>
    );
}

export default AISummaryPanel;
