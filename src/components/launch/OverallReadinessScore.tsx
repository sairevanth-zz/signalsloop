'use client';

/**
 * Overall Readiness Score
 * Circular SVG progress ring for launch readiness
 */

import React from 'react';
import { getScoreColor } from '@/types/launch';

interface OverallReadinessScoreProps {
    score: number;
    size?: number;
}

export function OverallReadinessScore({ score, size = 100 }: OverallReadinessScoreProps) {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = getScoreColor(score);

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                style={{ transform: 'rotate(-90deg)' }}
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
            </svg>
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
            >
                <div
                    className="text-[28px] font-bold"
                    style={{ color }}
                >
                    {score}
                </div>
                <div className="text-[9px] text-gray-400">READY</div>
            </div>
        </div>
    );
}

export default OverallReadinessScore;
