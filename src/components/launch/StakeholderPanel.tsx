'use client';

/**
 * Stakeholder Panel Component
 * Displays stakeholder votes and allows voting
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { LaunchVote, VoteType } from '@/types/launch';

interface StakeholderPanelProps {
    votes: LaunchVote[];
    onCastVote: (voteId: string, vote: VoteType, comment?: string) => void;
    onAdd?: (name: string, role: string) => void;
    onDelete?: (voteId: string) => void;
}

export function StakeholderPanel({ votes, onCastVote, onAdd, onDelete }: StakeholderPanelProps) {
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('');

    const goVotes = votes.filter(v => v.vote === 'go').length;
    const noGoVotes = votes.filter(v => v.vote === 'no_go').length;
    const conditionalVotes = votes.filter(v => v.vote === 'conditional').length;
    const pendingVotes = votes.filter(v => !v.vote).length;

    const handleAdd = () => {
        if (newName.trim() && onAdd) {
            onAdd(newName.trim(), newRole.trim() || 'Stakeholder');
            setNewName('');
            setNewRole('');
            setShowAdd(false);
        }
    };

    const getVoteIcon = (vote: VoteType | null | undefined) => {
        switch (vote) {
            case 'go':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'no_go':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'conditional':
                return <AlertCircle className="w-4 h-4 text-yellow-500" />;
            default:
                return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-white/10">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    👥 Stakeholders
                </h3>
                {onAdd && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAdd(!showAdd)}
                        className="h-6 w-6 p-0 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Add form */}
            {showAdd && onAdd && (
                <div className="space-y-2 mb-2 p-2 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Stakeholder name..."
                        className="h-7 text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-700"
                    />
                    <div className="flex gap-2">
                        <Input
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            placeholder="Role (optional)"
                            className="flex-1 h-7 text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-700"
                        />
                        <Button size="sm" onClick={handleAdd} className="h-7 text-xs">
                            Add
                        </Button>
                    </div>
                </div>
            )}

            {votes.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">No stakeholders added yet</p>
            ) : (
                <>
                    {/* Stakeholder list */}
                    <div className="space-y-1.5 mb-3">
                        {votes.map((vote) => (
                            <div
                                key={vote.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 group"
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {getVoteIcon(vote.vote)}
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                            {vote.name}
                                            {vote.is_required && (
                                                <span className="text-red-500 ml-0.5">*</span>
                                            )}
                                        </p>
                                        {vote.role && (
                                            <p className="text-[10px] text-gray-500 dark:text-gray-500 truncate">{vote.role}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {!vote.vote ? (
                                        <div className="flex gap-0.5">
                                            <button
                                                onClick={() => onCastVote(vote.id, 'go')}
                                                className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                                                title="Vote GO"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onCastVote(vote.id, 'no_go')}
                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Vote NO-GO"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onCastVote(vote.id, 'conditional')}
                                                className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                                                title="Vote Conditional"
                                            >
                                                <AlertCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className={cn(
                                            'text-[10px] px-1.5 py-0.5 rounded font-medium',
                                            vote.vote === 'go' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                                            vote.vote === 'no_go' && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                                            vote.vote === 'conditional' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                        )}>
                                            {vote.vote.replace('_', '-').toUpperCase()}
                                        </span>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={() => onDelete(vote.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity ml-1"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Vote summary */}
                    <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                        <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 py-1 rounded">
                            GO: {goVotes}
                        </div>
                        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 py-1 rounded">
                            NO: {noGoVotes}
                        </div>
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 py-1 rounded">
                            COND: {conditionalVotes}
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 py-1 rounded">
                            ⏳ {pendingVotes}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default StakeholderPanel;
