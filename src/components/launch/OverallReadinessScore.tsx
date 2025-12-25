'use client';

/**
 * Overall Readiness Score Component
 * Circular SVG progress ring
 */

import React from 'react';

interface OverallReadinessScoreProps {
    score: number;
}

export function OverallReadinessScore({ score }: OverallReadinessScoreProps) {
    const radius = 50;
    const stroke = 8;
    const normalizedRadius = radius - stroke / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getColor = (s: number) => {
        if (s >= 80) return '#22c55e'; // green
        if (s >= 60) return '#14b8a6'; // teal
        if (s >= 40) return '#eab308'; // yellow
        return '#ef4444'; // red
    };

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg
                height={radius * 2}
                width={radius * 2}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    stroke="currentColor"
                    className="text-gray-200 dark:text-gray-700"
                    fill="transparent"
                    strokeWidth={stroke}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                {/* Progress circle */}
                <circle
                    stroke={getColor(score)}
                    fill="transparent"
                    strokeWidth={stroke}
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ strokeDashoffset }}
                    strokeLinecap="round"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                    className="transition-all duration-500"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{score}</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">READY</span>
            </div>
        </div>
    );
}

export default OverallReadinessScore;
