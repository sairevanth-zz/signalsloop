'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HealthScoreGrade } from '@/lib/health-score/types';

interface HealthScoreGaugeProps {
    score: number;
    grade: HealthScoreGrade;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    animated?: boolean;
    showLabel?: boolean;
    className?: string;
}

const sizeConfig = {
    sm: { width: 120, strokeWidth: 8, fontSize: 24, labelSize: 10 },
    md: { width: 180, strokeWidth: 12, fontSize: 36, labelSize: 12 },
    lg: { width: 240, strokeWidth: 14, fontSize: 48, labelSize: 14 },
    xl: { width: 320, strokeWidth: 18, fontSize: 64, labelSize: 16 },
};

const gradeColors = {
    green: { primary: '#22c55e', secondary: '#86efac', bg: '#dcfce7' },
    blue: { primary: '#3b82f6', secondary: '#93c5fd', bg: '#dbeafe' },
    yellow: { primary: '#eab308', secondary: '#fde047', bg: '#fef9c3' },
    red: { primary: '#ef4444', secondary: '#fca5a5', bg: '#fee2e2' },
};

export function HealthScoreGauge({
    score,
    grade,
    size = 'lg',
    animated = true,
    showLabel = true,
    className = '',
}: HealthScoreGaugeProps) {
    const [animatedScore, setAnimatedScore] = useState(0);
    const config = sizeConfig[size];
    const colors = gradeColors[grade.color];

    const radius = (config.width - config.strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (animatedScore / 100) * circumference;
    const offset = circumference - progress;

    useEffect(() => {
        if (animated) {
            // Animate score from 0 to target
            const duration = 1500;
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Easing function (ease-out-cubic)
                const eased = 1 - Math.pow(1 - progress, 3);
                setAnimatedScore(Math.round(eased * score));

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        } else {
            setAnimatedScore(score);
        }
    }, [score, animated]);

    return (
        <div className={`relative inline-flex flex-col items-center ${className}`}>
            <svg
                width={config.width}
                height={config.width}
                viewBox={`0 0 ${config.width} ${config.width}`}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={config.width / 2}
                    cy={config.width / 2}
                    r={radius}
                    fill="none"
                    stroke={colors.bg}
                    strokeWidth={config.strokeWidth}
                />

                {/* Progress circle with gradient */}
                <defs>
                    <linearGradient id={`gauge-gradient-${grade.color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={colors.primary} />
                        <stop offset="100%" stopColor={colors.secondary} />
                    </linearGradient>
                </defs>

                <motion.circle
                    cx={config.width / 2}
                    cy={config.width / 2}
                    r={radius}
                    fill="none"
                    stroke={`url(#gauge-gradient-${grade.color})`}
                    strokeWidth={config.strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    initial={animated ? { strokeDashoffset: circumference } : undefined}
                    style={{
                        filter: `drop-shadow(0 4px 8px ${colors.primary}40)`,
                    }}
                />
            </svg>

            {/* Score number in center */}
            <div
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{ transform: 'translateY(-4px)' }}
            >
                <motion.span
                    className="font-bold tabular-nums tracking-tight"
                    style={{
                        fontSize: config.fontSize,
                        color: colors.primary,
                        lineHeight: 1,
                    }}
                    initial={animated ? { scale: 0.5, opacity: 0 } : undefined}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                >
                    {animatedScore}
                </motion.span>

                {showLabel && (
                    <motion.div
                        className="flex items-center gap-1 mt-1"
                        initial={animated ? { opacity: 0, y: 10 } : undefined}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.3 }}
                    >
                        <span style={{ fontSize: config.labelSize }} className="text-gray-500">
                            {grade.emoji}
                        </span>
                        <span
                            className="font-semibold uppercase tracking-wider"
                            style={{ fontSize: config.labelSize, color: colors.primary }}
                        >
                            {grade.label}
                        </span>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
