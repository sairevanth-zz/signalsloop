'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TranscriptionDisplayProps {
    text: string;
    isListening: boolean;
    className?: string;
}

export function TranscriptionDisplay({
    text,
    isListening,
    className = '',
}: TranscriptionDisplayProps) {
    if (!text && !isListening) return null;

    return (
        <div className={`w-full max-w-2xl mx-auto min-h-[60px] flex items-center justify-center p-4 rounded-xl ${text ? 'bg-slate-800/50 border border-slate-700/50' : ''
            } ${className}`}>
            <AnimatePresence mode="wait">
                {text ? (
                    <motion.p
                        key="text"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xl md:text-2xl font-light text-center text-slate-200"
                    >
                        &ldquo;{text}&rdquo;
                    </motion.p>
                ) : isListening ? (
                    <motion.div
                        key="placeholder"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex gap-1"
                    >
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-2 h-2 bg-indigo-500 rounded-full"
                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    delay: i * 0.2
                                }}
                            />
                        ))}
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
