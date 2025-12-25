'use client';

/**
 * Dimension List
 * Clickable list of launch dimensions
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { LaunchDimension, DimensionType } from '@/types/launch';
import { DIMENSION_CONFIG, getScoreColor } from '@/types/launch';

interface DimensionListProps {
    dimensions: LaunchDimension[];
    selected: DimensionType;
    onSelect: (type: DimensionType) => void;
}

export function DimensionList({ dimensions, selected, onSelect }: DimensionListProps) {
    const dimensionTypes: DimensionType[] = [
        'customer_readiness',
        'risk_assessment',
        'competitive_timing',
        'success_prediction',
    ];

    return (
        <div className="space-y-1.5">
            {dimensionTypes.map(type => {
                const config = DIMENSION_CONFIG[type];
                const dimension = dimensions.find(d => d.dimension_type === type);
                const score = dimension?.ai_score || 0;
                const isSelected = selected === type;

                return (
                    <button
                        key={type}
                        onClick={() => onSelect(type)}
                        className={cn(
                            'w-full rounded-lg p-2.5 px-3 text-left transition-all',
                            'border',
                            isSelected
                                ? 'bg-[#1e293b]'
                                : 'bg-[#141b2d] hover:bg-[#1a2235]',
                        )}
                        style={{
                            borderColor: isSelected ? config.color : 'rgba(255,255,255,0.1)',
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm">{config.icon}</span>
                                <span className="text-[11px]">{config.name}</span>
                            </div>
                            <span
                                className="text-sm font-bold"
                                style={{ color: getScoreColor(score) }}
                            >
                                {score}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

export default DimensionList;
