'use client';

/**
 * Launch Checklist Component
 * Tracks pre-launch tasks with progress and department assignment
 */

import React, { useState } from 'react';
import { CheckCircle2, Circle, Zap, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { LaunchChecklistItem } from '@/types/launch';
import { getChecklistProgress } from '@/lib/launch';

const DEPARTMENTS = ['Engineering', 'Marketing', 'CS', 'Design', 'Product', 'Sales', 'Legal', 'Ops'];

interface LaunchChecklistProps {
    items: LaunchChecklistItem[];
    onToggle: (itemId: string, completed: boolean) => void;
    onAdd?: (title: string, owner?: string) => void;
    onDelete?: (itemId: string) => void;
}

export function LaunchChecklist({ items, onToggle, onAdd, onDelete }: LaunchChecklistProps) {
    const [showAdd, setShowAdd] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newOwner, setNewOwner] = useState('');
    const progress = getChecklistProgress(items);

    const handleAdd = () => {
        if (newTitle.trim() && onAdd) {
            onAdd(newTitle.trim(), newOwner || undefined);
            setNewTitle('');
            setNewOwner('');
            setShowAdd(false);
        }
    };

    const getDepartmentColor = (dept: string) => {
        const colors: Record<string, string> = {
            'Engineering': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
            'Marketing': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
            'CS': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
            'Design': 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
            'Product': 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
            'Sales': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
            'Legal': 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300',
            'Ops': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
        };
        return colors[dept] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-white/10">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                    ✅ Launch Checklist
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded text-[10px]">
                        {progress.percentage}%
                    </span>
                </h3>
                {onAdd && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAdd(!showAdd)}
                        className="h-6 w-6 p-0 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-2 overflow-hidden">
                <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                />
            </div>

            {/* Add form */}
            {showAdd && onAdd && (
                <div className="space-y-2 mb-2 p-2 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="New checklist item..."
                        className="h-7 text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-700"
                    />
                    <div className="flex gap-2">
                        <select
                            value={newOwner}
                            onChange={(e) => setNewOwner(e.target.value)}
                            className="flex-1 h-7 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-2"
                        >
                            <option value="">Select Department...</option>
                            {DEPARTMENTS.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                        <Button size="sm" onClick={handleAdd} className="h-7 text-xs bg-green-600 hover:bg-green-700">
                            Add
                        </Button>
                    </div>
                </div>
            )}

            {/* Checklist items */}
            <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                {items.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">No checklist items yet</p>
                ) : (
                    items.map((item) => (
                        <div
                            key={item.id}
                            className={cn(
                                'flex items-center gap-2 p-1.5 rounded-lg group',
                                'hover:bg-gray-100 dark:hover:bg-white/5 transition-colors'
                            )}
                        >
                            <button
                                onClick={() => onToggle(item.id, !item.completed)}
                                className="flex-shrink-0"
                            >
                                {item.completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : (
                                    <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                )}
                            </button>
                            <div className="flex-1 min-w-0">
                                <div className={cn(
                                    'text-xs font-medium truncate',
                                    item.completed ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'
                                )}>
                                    {item.title}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                    {item.owner && (
                                        <span className={cn(
                                            'text-[9px] px-1.5 py-0.5 rounded font-medium',
                                            getDepartmentColor(item.owner)
                                        )}>
                                            {item.owner}
                                        </span>
                                    )}
                                    {item.is_ai && (
                                        <span className="text-[9px] text-teal-500 dark:text-teal-400 flex items-center gap-0.5">
                                            <Zap className="w-2.5 h-2.5" /> AI
                                        </span>
                                    )}
                                </div>
                            </div>
                            {onDelete && (
                                <button
                                    onClick={() => onDelete(item.id)}
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

export default LaunchChecklist;
