'use client';

/**
 * Period Selector
 * Select retrospective period type
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { RetroPeriod } from '@/types/retro';
import { PERIOD_CONFIGS } from '@/types/retro';

interface PeriodSelectorProps {
    selected: RetroPeriod;
    onSelect: (period: RetroPeriod) => void;
}

export function PeriodSelector({ selected, onSelect }: PeriodSelectorProps) {
    const periods: RetroPeriod[] = ['sprint', 'monthly', 'quarterly', 'yearly', 'custom'];

    return (
        <div className="flex gap-1.5 flex-wrap">
            {periods.map(period => {
                const config = PERIOD_CONFIGS[period];
                const isSelected = selected === period;

                return (
                    <button
                        key={period}
                        onClick={() => onSelect(period)}
                        className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                            'border',
                            isSelected
                                ? 'bg-teal-500/20 border-teal-500/50 text-teal-400'
                                : 'bg-[#141b2d] border-white/10 text-gray-400 hover:bg-[#1a2235]'
                        )}
                    >
                        <span className="mr-1">{config.icon}</span>
                        {config.label}
                    </button>
                );
            })}
        </div>
    );
}

export default PeriodSelector;
