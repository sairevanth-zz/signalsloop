'use client';

import React, { useEffect, useState, useRef } from 'react';

interface TimerDisplayProps {
    isRunning: boolean;
    className?: string;
}

export function TimerDisplay({ isRunning, className = '' }: TimerDisplayProps) {
    const [time, setTime] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (isRunning) {
            startTimeRef.current = Date.now();

            const update = () => {
                const now = Date.now();
                if (startTimeRef.current) {
                    setTime((now - startTimeRef.current) / 1000);
                    rafRef.current = requestAnimationFrame(update);
                }
            };

            rafRef.current = requestAnimationFrame(update);
        } else {
            // Don't reset time immediately, keep the final time displayed
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        }

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [isRunning]);

    // Reset logic is handled by parent unmounting or key change if needed, 
    // or we can add a reset trigger prop. For now, it just counts up.
    useEffect(() => {
        if (!isRunning && time > 0) {
            // Keep the value
        } else if (!isRunning && time === 0) {
            setTime(0);
        }
    }, [isRunning, time]);

    if (time === 0 && !isRunning) return null;

    return (
        <div className={`font-mono text-sm tabular-nums ${isRunning ? 'text-indigo-400' : 'text-slate-400'
            } ${className}`}>
            {time.toFixed(1)}s
        </div>
    );
}
