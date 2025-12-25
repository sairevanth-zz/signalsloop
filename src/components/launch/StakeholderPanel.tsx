'use client';

/**
 * Stakeholder Panel
 * Stakeholder list with voting functionality
 */

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LaunchVote, VoteType } from '@/types/launch';
import { getVoteSummary } from '@/types/launch';

interface StakeholderPanelProps {
    votes: LaunchVote[];
    onCastVote: (voteId: string, vote: VoteType, comment?: string) => void;
    onAddStakeholder?: () => void;
}

export function StakeholderPanel({ votes, onCastVote, onAddStakeholder }: StakeholderPanelProps) {
    const summary = getVoteSummary(votes);

    const getVoteColor = (vote: VoteType | undefined) => {
        switch (vote) {
            case 'go': return '#10b981';
            case 'conditional': return '#fbbf24';
            case 'no_go': return '#ef4444';
            default: return '#334155';
        }
    };

    const getVoteLabel = (vote: VoteType | undefined) => {
        switch (vote) {
            case 'go': return 'GO';
            case 'conditional': return 'COND';
            case 'no_go': return 'NO-GO';
            default: return 'PENDING';
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="bg-[#141b2d] rounded-xl p-3.5 border border-white/10">
            {/* Header */}
            <div className="flex justify-between items-center mb-2.5">
                <h4 className="text-[13px] font-semibold">👥 Stakeholders</h4>
                {onAddStakeholder && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onAddStakeholder}
                        className="h-6 px-2 text-[10px] border-gray-700"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Invite
                    </Button>
                )}
            </div>

            {/* Stakeholder List */}
            <div className="space-y-0">
                {votes.map((stakeholder, i) => (
                    <div
                        key={stakeholder.id}
                        className={cn(
                            'py-2',
                            i < votes.length - 1 && 'border-b border-white/5'
                        )}
                    >
                        <div className="flex items-center gap-2">
                            {/* Avatar */}
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-semibold"
                                style={{
                                    backgroundColor: getVoteColor(stakeholder.vote ?? undefined),
                                    color: stakeholder.vote ? '#0a0f1a' : '#94a3b8',
                                }}
                            >
                                {getInitials(stakeholder.name)}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-medium truncate">{stakeholder.name}</span>
                                    {stakeholder.is_required && (
                                        <span className="text-[7px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400">
                                            REQ
                                        </span>
                                    )}
                                </div>
                                <div className="text-[9px] text-gray-500">{stakeholder.role}</div>
                            </div>

                            {/* Vote Badge */}
                            <span
                                className="text-[9px] font-semibold px-2 py-1 rounded"
                                style={{
                                    backgroundColor: `${getVoteColor(stakeholder.vote ?? undefined)}20`,
                                    color: getVoteColor(stakeholder.vote ?? undefined),
                                }}
                            >
                                {getVoteLabel(stakeholder.vote ?? undefined)}
                            </span>
                        </div>

                        {/* Comment */}
                        {stakeholder.comment && (
                            <div className="ml-9 text-[10px] text-gray-500 italic mt-1">
                                "{stakeholder.comment}"
                            </div>
                        )}
                    </div>
                ))}

                {votes.length === 0 && (
                    <div className="text-center py-3 text-gray-500 text-xs">
                        No stakeholders added yet
                    </div>
                )}
            </div>

            {/* Vote Summary */}
            {votes.length > 0 && (
                <div className="bg-[#0a0f1a] rounded-lg p-3 mt-3">
                    <div className="grid grid-cols-3 gap-1.5">
                        {[
                            { label: 'GO', count: summary.go, color: '#10b981' },
                            { label: 'COND', count: summary.conditional, color: '#fbbf24' },
                            { label: 'NO-GO', count: summary.no_go, color: '#ef4444' },
                        ].map(item => (
                            <div key={item.label} className="text-center py-2 rounded-md bg-[#141b2d]">
                                <div className="text-lg font-bold" style={{ color: item.color }}>
                                    {item.count}
                                </div>
                                <div className="text-[8px] text-gray-500">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default StakeholderPanel;
