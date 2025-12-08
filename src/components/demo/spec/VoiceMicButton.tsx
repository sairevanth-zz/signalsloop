'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VoiceMicButtonProps {
    onTranscriptionChange: (text: string) => void;
    onTranscriptionComplete: (text: string) => void;
    isGenerating?: boolean;
}

export function VoiceMicButton({
    onTranscriptionChange,
    onTranscriptionComplete,
    isGenerating = false,
}: VoiceMicButtonProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Refs for speech recognition and silence detection
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const finalTranscriptRef = useRef('');

    // Initialize SpeechRecognition on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition =
                (window as any).SpeechRecognition ||
                (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';
                recognitionRef.current = recognition;
            } else {
                setError('Speech recognition not supported in this browser');
            }
        }

        return () => {
            stopListening();
        };
    }, []);

    const resetSilenceTimer = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }

        // Auto-submit after 2 seconds of silence
        silenceTimerRef.current = setTimeout(() => {
            if (finalTranscriptRef.current.trim()) {
                stopListening();
                onTranscriptionComplete(finalTranscriptRef.current);
            }
        }, 2000);
    }, [onTranscriptionComplete]);

    const startListening = () => {
        if (!recognitionRef.current || isGenerating) return;

        try {
            setError(null);
            setTranscript('');
            finalTranscriptRef.current = '';
            setIsListening(true);

            recognitionRef.current.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTrans = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTrans += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTrans) {
                    finalTranscriptRef.current += finalTrans + ' ';
                }

                const currentDisplay = finalTranscriptRef.current + interimTranscript;
                setTranscript(currentDisplay);
                onTranscriptionChange(currentDisplay);

                resetSilenceTimer();
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                if (event.error === 'not-allowed') {
                    setError('Microphone access denied');
                } else {
                    setError('Error listening');
                }
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                if (isListening) {
                    // If it stopped but we think we're listening, it might be silence or error.
                    // But normally we control stop.
                }
            };

            recognitionRef.current.start();
            resetSilenceTimer();
        } catch (err) {
            console.error('Failed to start recording:', err);
            setError('Failed to start recording');
        }
    };

    const stopListening = () => {
        setIsListening(false);
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // Ignore errors if already stopped
            }
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
            // If manually stopped and we have text, trigger complete
            if (transcript.trim()) {
                onTranscriptionComplete(transcript);
            }
        } else {
            startListening();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
                {/* Pulsing rings animation when listening */}
                <AnimatePresence>
                    {isListening && (
                        <>
                            <motion.div
                                initial={{ opacity: 0.5, scale: 1 }}
                                animate={{ opacity: 0, scale: 2 }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute inset-0 bg-red-500 rounded-full"
                            />
                            <motion.div
                                initial={{ opacity: 0.5, scale: 1 }}
                                animate={{ opacity: 0, scale: 1.5 }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                                className="absolute inset-0 bg-red-500 rounded-full"
                            />
                        </>
                    )}
                </AnimatePresence>

                <button
                    onClick={toggleListening}
                    disabled={isGenerating || !!error}
                    className={cn(
                        "relative z-10 flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 shadow-xl",
                        isListening
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-gradient-to-br from-indigo-600 to-purple-700 hover:shadow-purple-500/25 text-white",
                        (isGenerating || !!error) && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {isGenerating ? (
                        <Loader2 className="w-10 h-10 animate-spin" />
                    ) : isListening ? (
                        <Square className="w-8 h-8 fill-current" />
                    ) : (
                        <Mic className="w-10 h-10" />
                    )}

                    {!isListening && !isGenerating && (
                        <div className="absolute inset-0 rounded-full ring-1 ring-white/20 hover:ring-white/40 transition-all" />
                    )}
                </button>
            </div>

            <div className="text-center h-8">
                <AnimatePresence mode="wait">
                    {error ? (
                        <motion.p
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-red-400 text-sm font-medium"
                        >
                            {error}
                        </motion.p>
                    ) : isListening ? (
                        <motion.p
                            key="listening"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-indigo-300 text-sm font-medium animate-pulse"
                        >
                            Listening...
                        </motion.p>
                    ) : isGenerating ? (
                        <motion.p
                            key="generating"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-purple-300 text-sm font-medium"
                        >
                            Generating Spec...
                        </motion.p>
                    ) : (
                        <motion.p
                            key="idle"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-slate-400 text-sm"
                        >
                            Tap to speak
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
