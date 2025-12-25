'use client';

/**
 * Actions Panel
 * Display and manage action items
 */

import React, { useState } from 'react';
import { Plus, Check, Clock, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { RetroAction } from '@/types/retro';
import { getActionStatusColor } from '@/types/retro';
import { getOpenActionsCount } from '@/lib/retro';

interface ActionsPanelProps {
    actions: RetroAction[];
    onUpdateStatus: (actionId: string, status: string) => void;
    onAddAction: (title: string) => void;
}

export function ActionsPanel({ actions, onUpdateStatus, onAddAction }: ActionsPanelProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newActionTitle, setNewActionTitle] = useState('');
    const openCount = getOpenActionsCount(actions);

    const handleAdd = () => {
        if (newActionTitle.trim()) {
            onAddAction(newActionTitle.trim());
            setNewActionTitle('');
            setIsAdding(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <Check className="w-3 h-3" />;
            case 'in_progress': return <Clock className="w-3 h-3" />;
            default: return <Circle className="w-3 h-3" />;
        }
    };

    const cycleStatus = (currentStatus: string) => {
        switch (currentStatus) {
            case 'not_started': return 'in_progress';
            case 'in_progress': return 'completed';
            case 'completed': return 'not_started';
            default: return 'not_started';
        }
    };

    return (
        <div className="bg-[#141b2d] rounded-xl p-4 border border-white/10">
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    📋 Action Items
                    <span
                        className="text-[11px] px-2 py-0.5 rounded"
                        style={{
                            backgroundColor: openCount > 0 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: openCount > 0 ? '#fbbf24' : '#10b981',
                        }}
                    >
                        {openCount} open
                    </span>
                </h4>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAdding(!isAdding)}
                    className="h-6 px-2 text-[10px] border-gray-700"
                >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                </Button>
            </div>

            {/* Add Form */}
            {isAdding && (
                <div className="mb-3">
                    <Input
                        value={newActionTitle}
                        onChange={(e) => setNewActionTitle(e.target.value)}
                        placeholder="New action item..."
                        className="bg-[#0a0f1a] border-gray-700 text-sm mb-1.5"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAdd();
                            if (e.key === 'Escape') setIsAdding(false);
                        }}
                    />
                    <div className="flex gap-1">
                        <Button size="sm" onClick={handleAdd} className="h-6 text-[10px] bg-teal-600">
                            Add Action
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="h-6 text-[10px]">
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Action Items */}
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {actions.map(action => (
                    <div
                        key={action.id}
                        className={cn(
                            'flex items-start gap-2 p-2 bg-[#0a0f1a] rounded-md border',
                            action.status === 'completed' ? 'border-emerald-500/30 opacity-60' : 'border-white/5'
                        )}
                    >
                        {/* Status Button */}
                        <button
                            onClick={() => onUpdateStatus(action.id, cycleStatus(action.status))}
                            className="mt-0.5 p-1 rounded hover:bg-white/10 transition-colors"
                            style={{ color: getActionStatusColor(action.status) }}
                        >
                            {getStatusIcon(action.status)}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div
                                className={cn(
                                    'text-[11px]',
                                    action.status === 'completed' ? 'line-through text-gray-500' : 'text-white'
                                )}
                            >
                                {action.title}
                            </div>
                            <div className="flex gap-2 mt-1 text-[9px] text-gray-500">
                                {action.owner && <span>👤 {action.owner}</span>}
                                {action.due_date && (
                                    <span>📅 {new Date(action.due_date).toLocaleDateString()}</span>
                                )}
                                {action.from_source && (
                                    <span className="text-purple-400">{action.from_source}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {actions.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-xs">
                        No action items yet
                    </div>
                )}
            </div>
        </div>
    );
}

export default ActionsPanel;
