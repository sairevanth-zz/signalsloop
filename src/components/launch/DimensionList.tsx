'use client';

/**
 * Dimension List Component
 * Clickable list of dimensions with scores
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { LaunchDimension, DimensionType } from '@/types/launch';
import { DIMENSION_CONFIG } from '@/types/launch';

interface DimensionListProps {
    dimensions: LaunchDimension[];
    selected: DimensionType;
    onSelect: (dimension: DimensionType) => void;
}

export function DimensionList({ dimensions, selected, onSelect }: DimensionListProps) {
    const orderedTypes: DimensionType[] = [
        'customer_readiness',
        'risk_assessment',
        'competitive_timing',
        'success_prediction',
    ];

    return (
        <div className="space-y-1.5">
            {orderedTypes.map((type) => {
                const dimension = dimensions.find(d => d.dimension_type === type);
                const config = DIMENSION_CONFIG[type];
                const score = dimension?.ai_score ?? 0;
                const isSelected = selected === type;

                return (
                    <button
                        key={type}
                        onClick={() => onSelect(type)}
                        className={cn(
                            'w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left',
                            'hover:bg-gray-100 dark:hover:bg-white/5',
                            isSelected && 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700/40'
                        )}
                    >
                        <span className="text-sm">{config.icon}</span>
                        <span className={cn(
                            'text-xs font-medium flex-1',
                            isSelected ? 'text-teal-700 dark:text-teal-300' : 'text-gray-700 dark:text-gray-300'
                        )}>
                            {config.name}
                        </span>
                        <span className={cn(
                            'text-xs font-bold px-1.5 py-0.5 rounded',
                            score >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                score >= 60 ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' :
                                    score >= 40 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        )}>
                            {score}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

export default DimensionList;
