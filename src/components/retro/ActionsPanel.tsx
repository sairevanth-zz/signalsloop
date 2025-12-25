'use client';

/**
 * Actions Panel Component
 * Displays and manages retrospective action items
 */

import React, { useState } from 'react';
import { Plus, Check, Clock, Circle, Trash2 } from 'lucide-react';
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
    onDeleteAction?: (actionId: string) => void;
}

export function ActionsPanel({ actions, onUpdateStatus, onAddAction, onDeleteAction }: ActionsPanelProps) {
    const [showAdd, setShowAdd] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const openCount = getOpenActionsCount(actions);

    const handleAdd = () => {
        if (newTitle.trim()) {
            onAddAction(newTitle.trim());
            setNewTitle('');
            setShowAdd(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <Check className="w-3.5 h-3.5 text-green-500" />;
            case 'in_progress':
                return <Clock className="w-3.5 h-3.5 text-yellow-500" />;
            default:
                return <Circle className="w-3.5 h-3.5 text-gray-400" />;
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-white/10">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                    📋 Action Items
                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                        {openCount} open
                    </span>
                </h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdd(!showAdd)}
                    className="h-6 px-2 text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                </Button>
            </div>

            {/* Add form */}
            {showAdd && (
                <div className="flex gap-2 mb-2">
                    <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="New action item..."
                        className="h-7 text-xs bg-gray-50 dark:bg-slate-900 border-gray-300 dark:border-gray-700"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <Button size="sm" onClick={handleAdd} className="h-7 text-xs">
                        Add
                    </Button>
                </div>
            )}

            {/* Actions list */}
            <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                {actions.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">No action items yet</p>
                ) : (
                    actions.map((action) => (
                        <div
                            key={action.id}
                            className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 group"
                        >
                            <button
                                onClick={() => {
                                    const nextStatus =
                                        action.status === 'not_started' ? 'in_progress' :
                                            action.status === 'in_progress' ? 'completed' :
                                                'not_started';
                                    onUpdateStatus(action.id, nextStatus);
                                }}
                                className="mt-0.5 flex-shrink-0"
                            >
                                {getStatusIcon(action.status)}
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    'text-xs font-medium',
                                    action.status === 'completed' ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'
                                )}>
                                    {action.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {action.owner && (
                                        <span className="text-[10px] text-gray-500 dark:text-gray-500">👤 {action.owner}</span>
                                    )}
                                    <span className={cn(
                                        'text-[10px] px-1 py-0.5 rounded',
                                        getActionStatusColor(action.status)
                                    )}>
                                        {action.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                            {onDeleteAction && (
                                <button
                                    onClick={() => onDeleteAction(action.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default ActionsPanel;
