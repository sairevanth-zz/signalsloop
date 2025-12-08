import React from 'react';
import { Theme } from '@/lib/user-feedback/types';
import { motion } from 'framer-motion';

interface ThemeCloudProps {
    themes: Theme[];
}

export function ThemeCloud({ themes }: ThemeCloudProps) {
    // Normalize sizes
    const maxMentions = Math.max(...themes.map(t => t.mention_count), 1);
    const minMentions = Math.min(...themes.map(t => t.mention_count), 1);

    // Helper for color based on sentiment
    const getSentimentColor = (score: number) => {
        if (score >= 0.5) return 'text-green-600 dark:text-green-400';
        if (score >= 0.1) return 'text-green-500 dark:text-green-300';
        if (score >= -0.1) return 'text-gray-600 dark:text-gray-400';
        if (score >= -0.5) return 'text-orange-500 dark:text-orange-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getFontSize = (count: number) => {
        // Linear scale between 0.8rem and 2.5rem
        const minSize = 0.8;
        const maxSize = 2.5;
        if (maxMentions === minMentions) return '1.2rem';

        const size = minSize + ((count - minMentions) / (maxMentions - minMentions)) * (maxSize - minSize);
        return `${size}rem`;
    };

    return (
        <div className="flex flex-wrap justify-center gap-4 p-8 bg-card border rounded-xl min-h-[300px] content-center">
            {themes.map((theme, i) => (
                <motion.div
                    key={theme.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`cursor-pointer hover:underline transition-all font-bold ${getSentimentColor(theme.sentiment)}`}
                    style={{ fontSize: getFontSize(theme.mention_count) }}
                    title={`${theme.mention_count} mentions | Sentiment: ${theme.sentiment}`}
                >
                    {theme.name}
                </motion.div>
            ))}
        </div>
    );
}
