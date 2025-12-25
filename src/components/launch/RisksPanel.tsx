'use client';

/**
 * Risks Panel
 * Expandable risk cards with severity and status
 */

import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LaunchRisk } from '@/types/launch';
import { getSeverityColor, getStatusColor } from '@/types/launch';
import { getOpenRisksCount } from '@/lib/launch';

interface RisksPanelProps {
    risks: LaunchRisk[];
    onUpdateStatus: (riskId: string, status: string) => void;
    onAdd?: () => void;
}

export function RisksPanel({ risks, onUpdateStatus, onAdd }: RisksPanelProps) {
    const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
    const openCount = getOpenRisksCount(risks);

    return (
        <div className="bg-[#141b2d] rounded-xl p-4 border border-white/10">
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    ⚠️ Risks & Blockers
                    <span
                        className="text-[11px] px-2 py-0.5 rounded"
                        style={{
                            backgroundColor: openCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: openCount > 0 ? '#ef4444' : '#10b981',
                        }}
                    >
                        {openCount} open
                    </span>
                </h4>
                {onAdd && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onAdd}
                        className="h-6 px-2 text-[10px] border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                    </Button>
                )}
            </div>

            {/* Risk Items */}
            <div className="max-h-[200px] overflow-y-auto space-y-1.5">
                {risks.map(risk => {
                    const isExpanded = expandedRisk === risk.id;

                    return (
                        <div
                            key={risk.id}
                            className="bg-[#0a0f1a] rounded-md overflow-hidden border border-white/5"
                            style={{
                                borderLeft: `3px solid ${getSeverityColor(risk.severity)}`,
                            }}
                        >
                            {/* Risk Header */}
                            <div
                                onClick={() => setExpandedRisk(isExpanded ? null : risk.id)}
                                className="p-2.5 cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex gap-1 flex-wrap">
                                        <span
                                            className="text-[8px] px-1.5 py-0.5 rounded font-bold"
                                            style={{
                                                backgroundColor: `${getSeverityColor(risk.severity)}30`,
                                                color: getSeverityColor(risk.severity),
                                            }}
                                        >
                                            {risk.severity.toUpperCase()}
                                        </span>
                                        <span
                                            className="text-[8px] px-1.5 py-0.5 rounded"
                                            style={{
                                                backgroundColor: `${getStatusColor(risk.status)}20`,
                                                color: getStatusColor(risk.status),
                                            }}
                                        >
                                            {risk.status.toUpperCase()}
                                        </span>
                                    </div>
                                    {risk.source && (
                                        <span className="text-[8px] text-teal-400 bg-teal-400/10 px-1 py-0.5 rounded">
                                            {risk.is_ai ? '🤖' : '👤'} {risk.source}
                                        </span>
                                    )}
                                </div>
                                <div className="text-[11px] font-medium flex items-center gap-1">
                                    {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
                                    {risk.title}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="px-2.5 pb-2.5 border-t border-white/5">
                                    {risk.mitigation && (
                                        <>
                                            <div className="text-[9px] text-gray-500 mt-2 mb-1">MITIGATION</div>
                                            <div className="text-[11px] text-gray-400">{risk.mitigation}</div>
                                        </>
                                    )}
                                    <div className="flex gap-1.5 mt-2">
                                        {risk.status !== 'mitigated' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onUpdateStatus(risk.id, 'mitigated');
                                                }}
                                                className="h-6 px-2 text-[9px] border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                                            >
                                                Mark Mitigated
                                            </Button>
                                        )}
                                        {risk.status === 'open' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onUpdateStatus(risk.id, 'acknowledged');
                                                }}
                                                className="h-6 px-2 text-[9px] border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                                            >
                                                Acknowledge
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {risks.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-xs">
                        No risks identified yet
                    </div>
                )}
            </div>
        </div>
    );
}

export default RisksPanel;
