'use client';

/**
 * Period Selector Component
 * Dropdown for selecting retrospective period
 */

import React from 'react';
import type { RetroPeriod } from '@/types/retro';
import { PERIOD_CONFIGS } from '@/types/retro';

interface PeriodSelectorProps {
    value: RetroPeriod;
    onChange: (period: RetroPeriod) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
    const periods: RetroPeriod[] = ['sprint', 'monthly', 'quarterly', 'yearly', 'custom'];

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value as RetroPeriod)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
            {periods.map((period) => (
                <option key={period} value={period}>
                    {PERIOD_CONFIGS[period].icon} {PERIOD_CONFIGS[period].label}
                </option>
            ))}
        </select>
    );
}

export default PeriodSelector;
