'use client';

/**
 * Launch Checklist
 * Pre-launch checklist with progress tracking
 */

import React from 'react';
import { Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LaunchChecklistItem } from '@/types/launch';
import { getChecklistProgress } from '@/lib/launch';

interface LaunchChecklistProps {
    items: LaunchChecklistItem[];
    onToggle: (itemId: string, completed: boolean) => void;
    onAdd?: () => void;
}

export function LaunchChecklist({ items, onToggle, onAdd }: LaunchChecklistProps) {
    const progress = getChecklistProgress(items);

    return (
        <div className="bg-[#141b2d] rounded-xl p-4 border border-white/10">
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    ✅ Launch Checklist
                    <span
                        className="text-[11px] px-2 py-0.5 rounded"
                        style={{
                            backgroundColor: progress.completed === progress.total ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                            color: progress.completed === progress.total ? '#10b981' : '#fbbf24',
                        }}
                    >
                        {progress.completed}/{progress.total}
                    </span>
                </h4>
                {onAdd && (
                    <Button variant="outline" size="sm" onClick={onAdd} className="h-6 px-2 text-[10px] border-gray-700">
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                    </Button>
                )}
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-[#1e293b] rounded-full mb-3 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                        width: `${progress.percentage}%`,
                        background: 'linear-gradient(90deg, #10b981, #06d6a0)',
                    }}
                />
            </div>

            {/* Checklist Items */}
            <div className="max-h-[280px] overflow-y-auto space-y-1.5">
                {items.map(item => (
                    <div
                        key={item.id}
                        onClick={() => onToggle(item.id, !item.completed)}
                        className={cn(
                            'flex items-start gap-2.5 p-2 bg-[#0a0f1a] rounded-md cursor-pointer transition-opacity',
                            'border',
                            item.completed ? 'border-emerald-500/30 opacity-70' : 'border-white/5',
                        )}
                    >
                        {/* Checkbox */}
                        <div
                            className={cn(
                                'w-[18px] h-[18px] rounded flex-shrink-0 flex items-center justify-center mt-0.5',
                                'border-2 transition-colors',
                                item.completed
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-gray-600 bg-transparent'
                            )}
                        >
                            {item.completed && <Check className="w-2.5 h-2.5 text-[#0a0f1a]" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div
                                className={cn(
                                    'text-[11px] leading-snug',
                                    item.completed ? 'line-through text-gray-500' : 'text-white'
                                )}
                            >
                                {item.title}
                            </div>
                            <div className="flex gap-1 mt-1 flex-wrap">
                                <span
                                    className="text-[8px] px-1 py-0.5 rounded"
                                    style={{
                                        backgroundColor: item.is_ai ? 'rgba(6, 214, 160, 0.1)' : 'rgba(0, 194, 255, 0.1)',
                                        color: item.is_ai ? '#06d6a0' : '#00c2ff',
                                    }}
                                >
                                    {item.is_ai ? '🤖 AI' : '👤 User'}
                                </span>
                                {item.auto_verified && (
                                    <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400">
                                        ⚡ Auto
                                    </span>
                                )}
                                {item.owner && (
                                    <span className="text-[8px] text-gray-600">{item.owner}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default LaunchChecklist;
