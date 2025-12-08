'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Check, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface StreamingPRDProps {
    content: string;
    isComplete: boolean;
}

// Helper to split content into sections based on headers
// This is a naive implementation but works for the structured prompt we're using
const SECTIONS = [
    'Problem Statement',
    'User Stories',
    'Acceptance Criteria',
    'Success Metrics',
    'Technical Notes'
];

export function StreamingPRD({ content, isComplete }: StreamingPRDProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Basic styling for markdown content
    const components = {
        h2: ({ node, ...props }: any) => (
            <h2 className="text-lg font-semibold text-indigo-300 mt-6 mb-3 flex items-center gap-2" {...props} />
        ),
        h3: ({ node, ...props }: any) => (
            <h3 className="text-md font-medium text-slate-200 mt-4 mb-2" {...props} />
        ),
        ul: ({ node, ...props }: any) => (
            <ul className="list-disc pl-5 space-y-1 text-slate-300" {...props} />
        ),
        li: ({ node, ...props }: any) => (
            <li className="text-sm leading-relaxed" {...props} />
        ),
        p: ({ node, ...props }: any) => (
            <p className="text-sm text-slate-300 leading-relaxed mb-3" {...props} />
        ),
    };

    return (
        <div className="w-full max-w-3xl mx-auto mt-8">
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
                {/* Header / Toolbar */}
                <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                        </div>
                        <span className="text-xs font-mono text-slate-400 ml-2">generated-spec.md</span>
                    </div>

                    {content && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopy}
                            className="h-8 text-xs text-slate-400 hover:text-white"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-3 h-3 mr-1.5" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3 h-3 mr-1.5" />
                                    Copy Markdown
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {/* Content Area */}
                <div className="p-6 md:p-8 min-h-[400px] max-h-[800px] overflow-y-auto custom-scrollbar">
                    {content ? (
                        <div className="prose prose-invert max-w-none">
                            <ReactMarkdown components={components}>
                                {content}
                            </ReactMarkdown>

                            {/* Blinking cursor at the end while generating */}
                            {!isComplete && (
                                <span className="inline-block w-2 H-4 bg-indigo-500 animate-pulse ml-1 align-middle">_</span>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                            <div className="w-16 h-16 border-2 border-slate-700 border-dashed rounded-lg flex items-center justify-center mb-4">
                                <span className="font-mono text-2xl">MD</span>
                            </div>
                            <p>Ready to generate your spec</p>
                        </div>
                    )}
                </div>

                {/* Footer Status */}
                {isComplete && (
                    <div className="bg-green-900/20 border-t border-green-900/30 px-4 py-2 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-medium text-green-400">Generation Complete</span>
                    </div>
                )}
            </div>
        </div>
    );
}
