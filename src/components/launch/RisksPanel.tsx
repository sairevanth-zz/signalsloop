'use client';

/**
 * Risks Panel Component
 * Displays and manages launch risks and blockers
 */

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Zap, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { LaunchRisk } from '@/types/launch';
import { getSeverityColor, getStatusColor } from '@/types/launch';
import { getOpenRisksCount } from '@/lib/launch';

interface RisksPanelProps {
    risks: LaunchRisk[];
    onUpdateStatus: (riskId: string, status: string) => void;
    onAdd?: (title: string, severity: 'low' | 'medium' | 'high') => void;
    onDelete?: (riskId: string) => void;
}

export function RisksPanel({ risks, onUpdateStatus, onAdd, onDelete }: RisksPanelProps) {
    const [expandedRisks, setExpandedRisks] = useState<Set<string>>(new Set());
    const [showAdd, setShowAdd] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newSeverity, setNewSeverity] = useState<'low' | 'medium' | 'high'>('medium');
    const openCount = getOpenRisksCount(risks);

    const toggleExpand = (id: string) => {
        setExpandedRisks(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleAdd = () => {
        if (newTitle.trim() && onAdd) {
            onAdd(newTitle.trim(), newSeverity);
            setNewTitle('');
            setNewSeverity('medium');
            setShowAdd(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-white/10">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    ⚠️ Risks & Blockers
                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                        {openCount} open
                    </span>
                </h3>
                {onAdd && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAdd(!showAdd)}
                        className="h-6 w-6 p-0 text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Add form */}
            {showAdd && onAdd && (
                <div className="space-y-2 mb-2 p-2 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Describe the risk..."
                        className="h-7 text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-700"
                    />
                    <div className="flex gap-2">
                        <select
                            value={newSeverity}
                            onChange={(e) => setNewSeverity(e.target.value as 'low' | 'medium' | 'high')}
                            className="flex-1 h-7 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                        <Button size="sm" onClick={handleAdd} className="h-7 text-xs bg-amber-600 hover:bg-amber-700">
                            Add Risk
                        </Button>
                    </div>
                </div>
            )}

            {/* Risks list */}
            <div className="space-y-1.5">
                {risks.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">No risks identified yet</p>
                ) : (
                    risks.map((risk) => {
                        const isExpanded = expandedRisks.has(risk.id);
                        return (
                            <div
                                key={risk.id}
                                className={cn(
                                    'p-2 rounded-lg border group',
                                    'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-gray-700',
                                    risk.status === 'open' && risk.severity === 'high' && 'border-red-500/50'
                                )}
                            >
                                <div className="flex items-start gap-2">
                                    <button
                                        onClick={() => toggleExpand(risk.id)}
                                        className="mt-0.5 flex-shrink-0"
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                                        ) : (
                                            <ChevronRight className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                                        )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className={cn(
                                                'text-[9px] px-1 py-0.5 rounded font-medium',
                                                getSeverityColor(risk.severity)
                                            )}>
                                                {risk.severity.toUpperCase()}
                                            </span>
                                            <span className={cn(
                                                'text-[9px] px-1 py-0.5 rounded',
                                                getStatusColor(risk.status)
                                            )}>
                                                {risk.status}
                                            </span>
                                            {risk.is_ai && (
                                                <span className="text-[9px] text-teal-500 dark:text-teal-400 flex items-center gap-0.5">
                                                    <Zap className="w-2.5 h-2.5" /> AI
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{risk.title}</p>
                                    </div>
                                    {onDelete && (
                                        <button
                                            onClick={() => onDelete(risk.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <div className="mt-2 pl-5 text-xs space-y-1 border-t border-gray-200 dark:border-gray-700 pt-2">
                                        {risk.description && (
                                            <p className="text-gray-600 dark:text-gray-400">{risk.description}</p>
                                        )}
                                        {risk.mitigation && (
                                            <p className="text-gray-600 dark:text-gray-400">
                                                <span className="font-medium">Mitigation:</span> {risk.mitigation}
                                            </p>
                                        )}
                                        {risk.source && (
                                            <p className="text-[10px] text-gray-500 dark:text-gray-500">Source: {risk.source}</p>
                                        )}
                                        <div className="flex gap-1 pt-1">
                                            {['open', 'mitigated', 'acknowledged'].map((status) => (
                                                <button
                                                    key={status}
                                                    onClick={() => onUpdateStatus(risk.id, status)}
                                                    className={cn(
                                                        'text-[10px] px-2 py-0.5 rounded transition-colors',
                                                        risk.status === status
                                                            ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                    )}
                                                >
                                                    {status}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default RisksPanel;
