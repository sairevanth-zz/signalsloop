/**
 * StrategyShiftsCard - Mission Control card for strategy shifts
 * Shows today's proposed strategy shifts with approve/decline actions
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
    Zap,
    ArrowUp,
    ArrowDown,
    Pause,
    RotateCcw,
    Beaker,
    Check,
    X,
    ChevronDown,
    ChevronUp,
    Loader2,
    RefreshCw,
    TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { StrategyShift, ShiftType } from '@/types/strategy-shifts';

interface StrategyShiftsCardProps {
    projectId: string;
    projectSlug: string;
}

const SHIFT_ICONS: Record<ShiftType, React.ReactNode> = {
    pause: <Pause className="w-4 h-4" />,
    accelerate: <ArrowUp className="w-4 h-4" />,
    pivot: <RotateCcw className="w-4 h-4" />,
    deprioritize: <ArrowDown className="w-4 h-4" />,
    experiment: <Beaker className="w-4 h-4" />,
};

const SHIFT_COLORS: Record<ShiftType, string> = {
    pause: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    accelerate: 'bg-green-500/20 text-green-400 border-green-500/30',
    pivot: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    deprioritize: 'bg-red-500/20 text-red-400 border-red-500/30',
    experiment: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

function ShiftPill({ shift, onClick, isExpanded }: {
    shift: StrategyShift;
    onClick: () => void;
    isExpanded: boolean;
}) {
    const icon = SHIFT_ICONS[shift.type];
    const colorClass = SHIFT_COLORS[shift.type];

    return (
        <div
            className={`p-3 rounded-lg border cursor-pointer transition-all ${colorClass} ${isExpanded ? 'ring-2 ring-white/20' : 'hover:ring-1 hover:ring-white/10'
                }`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-xs font-medium uppercase tracking-wide">
                        {shift.type}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                        {(shift.confidence * 100).toFixed(0)}%
                    </Badge>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </div>
            </div>
            <p className="text-sm font-medium text-white mb-1">{shift.action}</p>
            <p className="text-xs text-slate-400">{shift.targetFeature}</p>
            {shift.expectedImpact && (
                <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    {shift.expectedImpact}
                </div>
            )}
        </div>
    );
}

function ShiftDetail({ shift, onApprove, onReject, isProcessing }: {
    shift: StrategyShift;
    onApprove: () => void;
    onReject: () => void;
    isProcessing: boolean;
}) {
    return (
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4">
            <div>
                <h4 className="text-xs text-slate-400 mb-1">Rationale</h4>
                <p className="text-sm text-slate-200">{shift.rationale}</p>
            </div>

            {shift.signals.length > 0 && (
                <div>
                    <h4 className="text-xs text-slate-400 mb-2">Signals</h4>
                    <div className="space-y-1">
                        {shift.signals.slice(0, 3).map((signal, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                                <span className={`w-2 h-2 rounded-full ${signal.severity === 'critical' ? 'bg-red-500' :
                                        signal.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                                    }`} />
                                <span className="text-slate-300">{signal.signal}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-2 pt-2">
                <Button
                    size="sm"
                    onClick={onApprove}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                >
                    {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                        </>
                    )}
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onReject}
                    disabled={isProcessing}
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                    <X className="w-4 h-4 mr-1" />
                    Decline
                </Button>
            </div>
        </div>
    );
}

export function StrategyShiftsCard({ projectId, projectSlug }: StrategyShiftsCardProps) {
    const [shifts, setShifts] = useState<StrategyShift[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchShifts = async () => {
        try {
            const response = await fetch(`/api/strategy/shifts?projectId=${projectId}&pending=true`);
            const data = await response.json();
            if (data.success) {
                setShifts(data.shifts);
            }
        } catch (error) {
            console.error('Error fetching shifts:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateShifts = async () => {
        setGenerating(true);
        try {
            const response = await fetch('/api/strategy/shifts/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });
            const data = await response.json();
            if (data.success && data.shiftsGenerated > 0) {
                toast.success(`Generated ${data.shiftsGenerated} strategy shift${data.shiftsGenerated > 1 ? 's' : ''}`);
                fetchShifts();
            } else if (data.success && data.shiftsGenerated === 0) {
                toast.info('No new shifts detected - signals are stable');
            } else {
                toast.error(data.error || 'Failed to generate shifts');
            }
        } catch (error) {
            toast.error('Failed to generate shifts');
        } finally {
            setGenerating(false);
        }
    };

    const handleApprove = async (shiftId: string) => {
        setProcessingId(shiftId);
        try {
            const response = await fetch('/api/strategy/shifts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve', shiftId }),
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Strategy shift approved');
                setShifts(shifts.filter(s => s.id !== shiftId));
                setExpandedId(null);
            } else {
                toast.error('Failed to approve shift');
            }
        } catch (error) {
            toast.error('Failed to approve shift');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (shiftId: string) => {
        setProcessingId(shiftId);
        try {
            const response = await fetch('/api/strategy/shifts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', shiftId }),
            });
            const data = await response.json();
            if (data.success) {
                toast.info('Strategy shift declined');
                setShifts(shifts.filter(s => s.id !== shiftId));
                setExpandedId(null);
            } else {
                toast.error('Failed to decline shift');
            }
        } catch (error) {
            toast.error('Failed to decline shift');
        } finally {
            setProcessingId(null);
        }
    };

    useEffect(() => {
        fetchShifts();
    }, [projectId]);

    return (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/50 p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Strategy Shifts
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                        {shifts.length} pending
                    </span>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={generateShifts}
                        disabled={generating}
                        className="h-7 px-2 text-slate-400 hover:text-white"
                    >
                        {generating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                    </div>
                ) : shifts.length === 0 ? (
                    <div className="text-center py-8">
                        <Zap className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">No pending shifts</p>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={generateShifts}
                            disabled={generating}
                            className="mt-3 border-slate-600"
                        >
                            {generating ? 'Analyzing...' : 'Analyze Signals'}
                        </Button>
                    </div>
                ) : (
                    shifts.map((shift) => (
                        <div key={shift.id} className="space-y-2">
                            <ShiftPill
                                shift={shift}
                                onClick={() => setExpandedId(expandedId === shift.id ? null : shift.id)}
                                isExpanded={expandedId === shift.id}
                            />
                            {expandedId === shift.id && (
                                <ShiftDetail
                                    shift={shift}
                                    onApprove={() => handleApprove(shift.id)}
                                    onReject={() => handleReject(shift.id)}
                                    isProcessing={processingId === shift.id}
                                />
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export function StrategyShiftsCardSkeleton() {
    return (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/50 p-5 h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-32 bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-16 bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-800/50 animate-pulse">
                        <div className="h-4 w-20 bg-slate-700 rounded mb-2" />
                        <div className="h-5 w-3/4 bg-slate-700 rounded mb-1" />
                        <div className="h-4 w-1/2 bg-slate-700 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
