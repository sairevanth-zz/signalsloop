
"use client";

import { motion } from "framer-motion";

interface ConfidenceGaugeProps {
    score: number;
}

export function ConfidenceGauge({ score }: ConfidenceGaugeProps) {
    // Determine color based on score
    const getColor = (s: number) => {
        if (s >= 80) return "#22c55e"; // green-500
        if (s >= 50) return "#eab308"; // yellow-500
        return "#ef4444"; // red-500
    };

    const color = getColor(score);
    const circumference = 2 * Math.PI * 40; // r=40
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center w-32 h-32">
            {/* Background Circle */}
            <svg className="w-full h-full transform -rotate-90">
                <circle
                    cx="64"
                    cy="64"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-200 dark:text-gray-800"
                />
                {/* Progress Circle */}
                <motion.circle
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    cx="64"
                    cy="64"
                    r="40"
                    stroke={color}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeLinecap="round"
                />
            </svg>
            {/* Score Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="text-3xl font-bold"
                    style={{ color }}
                >
                    {score}
                </motion.span>
                <span className="text-xs text-gray-500 font-medium">CONFIDENCE</span>
            </div>
        </div>
    );
}
