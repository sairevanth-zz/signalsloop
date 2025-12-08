'use client';

import React, { useState, useEffect } from 'react';
import { useCompletion } from 'ai/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, CornerDownLeft } from 'lucide-react';
import { VoiceMicButton } from '@/components/demo/spec/VoiceMicButton';
import { TranscriptionDisplay } from '@/components/demo/spec/TranscriptionDisplay';
import { StreamingPRD } from '@/components/demo/spec/StreamingPRD';
import { TimerDisplay } from '@/components/demo/spec/TimerDisplay';
import { toast } from 'sonner';

const EXAMPLE_PROMPTS = [
    "Add dark mode",
    "Build a mobile app",
    "Create an API",
    "Add team collaboration"
];

export default function SpecDemoPage() {
    const [transcribedText, setTranscribedText] = useState('');

    const {
        completion,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        setInput,
        complete
    } = useCompletion({
        api: '/api/demo/spec/generate',
        onError: (error) => {
            console.error('Generation error:', error);
            toast.error(error.message || 'Failed to generate spec');
        },
        onFinish: (prompt, result) => {
            // Analytics or other finish logic could go here
        }
    });

    // Handle voice updates
    const handleVoiceTranscription = (text: string) => {
        setTranscribedText(text);
        setInput(text);
    };

    const handleVoiceComplete = (text: string) => {
        setTranscribedText(text);
        setInput(text);
        // Trigger generation automatically
        complete(text);
    };

    // Handle text submission
    const onFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        handleSubmit(e);
    };

    const handleChipClick = (prompt: string) => {
        setInput(prompt);
        // Optional: auto-submit on chip click or just fill? 
        // Let's just fill for better UX, user can then hit enter or speak more.
        // Or better, auto-submit to show the "magic".
        complete(prompt);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">

            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-12 md:py-20 flex flex-col items-center">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12 space-y-4"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-2">
                        <Sparkles className="w-3 h-3" />
                        <span>AI-Powered Product Manager</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-transparent pb-2">
                        Describe a Feature.<br />
                        Get a Spec in 30 Seconds.
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Voice or text - we'll write the PRD while you watch.
                        <br className="hidden md:block" />
                        No login required for the demo.
                    </p>
                </motion.div>

                {/* Interaction Area */}
                <div className="w-full max-w-2xl space-y-8 mb-12">

                    {/* Voice Button */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <VoiceMicButton
                            onTranscriptionChange={handleVoiceTranscription}
                            onTranscriptionComplete={handleVoiceComplete}
                            isGenerating={isLoading}
                        />
                    </motion.div>

                    {/* Transcription / Real-time Input Display */}
                    <TranscriptionDisplay
                        text={isLoading ? input : transcribedText} // While loading/generating, show the input that triggered it
                        isListening={transcribedText !== '' && !isLoading} // Ideally passed from Mic button state, but this proxy works for display
                    // Actually TranscriptionDisplay was built to show real-time voice text. 
                    // Let's rely on VoiceButton state logic inside it or just pass what we have.
                    // Refinment: The MicButton handles the "Listening..." state internally for the button itself, 
                    // but TranscriptionDisplay expects 'text' to be the partial transcript.
                    />

                    {/* Text Input Fallback */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="relative group"
                    >
                        <form onSubmit={onFormSubmit} className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                placeholder={isLoading ? "Generating..." : "Or type your feature request here..."}
                                disabled={isLoading}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-full px-6 py-4 pl-6 pr-14 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-lg backdrop-blur-sm"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-colors disabled:opacity-0 disabled:scale-75 transform duration-200"
                            >
                                {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <ArrowRight className="w-4 h-4" />
                                )}
                            </button>
                            {!input && !isLoading && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none text-slate-600">
                                    <CornerDownLeft className="w-3 h-3" />
                                    <span className="text-xs font-medium">Enter</span>
                                </div>
                            )}
                        </form>
                    </motion.div>

                    {/* Example Chips */}
                    {!isLoading && !completion && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex flex-wrap justify-center gap-2"
                        >
                            {EXAMPLE_PROMPTS.map((prompt) => (
                                <button
                                    key={prompt}
                                    onClick={() => handleChipClick(prompt)}
                                    className="px-4 py-1.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-full text-sm text-slate-400 hover:text-indigo-300 transition-colors"
                                >
                                    "{prompt}"
                                </button>
                            ))}
                        </motion.div>
                    )}

                    {/* Generation Timer */}
                    <div className="h-8 flex items-center justify-center">
                        <TimerDisplay isRunning={isLoading} />
                    </div>
                </div>

                {/* Generation Output */}
                <div className="w-full pb-20">
                    <AnimatePresence>
                        {(isLoading || completion) && (
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 40 }}
                                transition={{ type: "spring", bounce: 0.2 }}
                            >
                                <StreamingPRD content={completion} isComplete={!isLoading && completion.length > 0} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* CTA Footer for limit reached or post-demo */}
                {!isLoading && completion.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 1 }}
                        className="mt-8 text-center space-y-4"
                    >
                        <p className="text-slate-400">Want to save this spec and export to Jira?</p>
                        <div className="flex items-center justify-center gap-4">
                            <button className="px-6 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-slate-200 transition-colors">
                                Sign Up Free
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
