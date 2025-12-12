/**
 * FloatingAskAI - Persistent AI assistant button
 * 
 * Fixed position button in bottom-right corner that opens the AI chat interface.
 * Always visible regardless of scroll position.
 */

'use client';

import React, { useState } from 'react';
import { Brain, X, Send, Loader2, AlertCircle } from 'lucide-react';

interface FloatingAskAIProps {
    projectId: string;
    projectSlug: string;
}

export function FloatingAskAI({ projectId, projectSlug }: FloatingAskAIProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [completion, setCompletion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const query = input.trim();
        setInput('');
        setCompletion('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/ask/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, projectId }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let result = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                result += chunk;
                setCompletion(result);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get response');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 max-h-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-teal-500/10 z-50 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-gradient-to-r from-teal-600/20 to-teal-700/20">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                                <Brain className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Ask AI</h3>
                                <p className="text-xs text-slate-400">Powered by GPT-4</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>

                    {/* Chat Content */}
                    <div className="flex-1 p-4 overflow-y-auto min-h-[200px]">
                        {error ? (
                            <div className="text-center py-8">
                                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                                <p className="text-red-400 text-sm mb-2">Error getting response</p>
                                <p className="text-slate-500 text-xs">{error}</p>
                                <button
                                    onClick={() => setError(null)}
                                    className="mt-4 px-4 py-2 bg-slate-800 rounded-lg text-slate-300 text-sm hover:bg-slate-700"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : completion ? (
                            <div className="prose prose-invert prose-sm max-w-none">
                                <p className="text-slate-300 whitespace-pre-wrap">{completion}</p>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400 text-sm">
                                    Ask me anything about your product, feedback, or roadmap
                                </p>
                                <div className="mt-4 space-y-2">
                                    {[
                                        'What are the top pain points this week?',
                                        'Summarize recent feedback trends',
                                        'What should I prioritize next?',
                                    ].map((suggestion, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setInput(suggestion)}
                                            className="block w-full text-left px-3 py-2 text-xs text-slate-500 bg-slate-800/50 rounded-lg hover:bg-slate-800 hover:text-slate-300 transition-colors"
                                        >
                                            "{suggestion}"
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask a question..."
                                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="p-3 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 group ${isOpen ? 'rotate-0' : ''
                    }`}
            >
                <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full blur-lg opacity-60 group-hover:opacity-80 transition-opacity" />

                    {/* Button */}
                    <div className="relative w-14 h-14 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                        {isOpen ? (
                            <X className="w-6 h-6 text-white" />
                        ) : (
                            <Brain className="w-6 h-6 text-white" />
                        )}
                    </div>

                    {/* Pulse animation when closed */}
                    {!isOpen && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 animate-ping opacity-30" />
                    )}
                </div>
            </button>
        </>
    );
}
