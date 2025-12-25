'use client';

/**
 * Stakeholder Panel Component
 * Displays stakeholder votes with comments and vote summary
 * Allows voting and changing votes
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock, Plus, Trash2, Edit2, X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
    const [editingVote, setEditingVote] = useState<string | null>(null);
    const [voteComment, setVoteComment] = useState('');
    const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);

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

    const startVoting = (voteId: string, currentVote?: VoteType | null, currentComment?: string | null) => {
        setEditingVote(voteId);
        setSelectedVote(currentVote || null);
        setVoteComment(currentComment || '');
    };

    const submitVote = (voteId: string) => {
        if (selectedVote) {
            onCastVote(voteId, selectedVote, voteComment);
            setEditingVote(null);
            setSelectedVote(null);
            setVoteComment('');
        }
    };

    const cancelVoting = () => {
        setEditingVote(null);
        setSelectedVote(null);
        setVoteComment('');
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

    const getAvatarColor = (name: string) => {
        const colors = [
            'bg-green-500', 'bg-blue-500', 'bg-purple-500',
            'bg-pink-500', 'bg-orange-500', 'bg-teal-500'
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10">
            {/* Header */}
            <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    👥 Stakeholders
                </h3>
                {onAdd && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAdd(!showAdd)}
                        className="h-6 px-2 text-xs border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                    >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Invite
                    </Button>
                )}
            </div>

            <div className="p-3">
                {/* Add form */}
                {showAdd && onAdd && (
                    <div className="space-y-2 mb-3 p-2 bg-gray-50 dark:bg-slate-900 rounded-lg">
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">No stakeholders added yet</p>
                ) : (
                    <>
                        {/* Stakeholder list */}
                        <div className="space-y-2 mb-3 max-h-[200px] overflow-y-auto">
                            {votes.map((vote) => (
                                <div
                                    key={vote.id}
                                    className="p-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 group"
                                >
                                    {editingVote === vote.id ? (
                                        // Voting mode
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold',
                                                    getAvatarColor(vote.name)
                                                )}>
                                                    {getInitials(vote.name)}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-medium text-gray-900 dark:text-white">{vote.name}</p>
                                                    {vote.role && <p className="text-[10px] text-gray-500">{vote.role}</p>}
                                                </div>
                                            </div>

                                            {/* Vote buttons */}
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setSelectedVote('go')}
                                                    className={cn(
                                                        'flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors',
                                                        selectedVote === 'go'
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                                                    )}
                                                >
                                                    GO
                                                </button>
                                                <button
                                                    onClick={() => setSelectedVote('no_go')}
                                                    className={cn(
                                                        'flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors',
                                                        selectedVote === 'no_go'
                                                            ? 'bg-red-500 text-white'
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                                                    )}
                                                >
                                                    NO-GO
                                                </button>
                                                <button
                                                    onClick={() => setSelectedVote('conditional')}
                                                    className={cn(
                                                        'flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors',
                                                        selectedVote === 'conditional'
                                                            ? 'bg-yellow-500 text-white'
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                                                    )}
                                                >
                                                    COND
                                                </button>
                                            </div>

                                            {/* Comment */}
                                            <Textarea
                                                value={voteComment}
                                                onChange={(e) => setVoteComment(e.target.value)}
                                                placeholder="Add your reasoning..."
                                                className="text-xs h-16 bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-700"
                                            />

                                            {/* Submit/Cancel */}
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => submitVote(vote.id)}
                                                    disabled={!selectedVote}
                                                    className="flex-1 h-7 text-xs"
                                                >
                                                    Submit Vote
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={cancelVoting}
                                                    className="h-7 text-xs"
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Display mode
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold',
                                                    getAvatarColor(vote.name)
                                                )}>
                                                    {getInitials(vote.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                                            {vote.name}
                                                        </p>
                                                        {vote.is_required && (
                                                            <span className="text-[9px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1 rounded">REQ</span>
                                                        )}
                                                    </div>
                                                    {vote.role && (
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-500 truncate">{vote.role}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {vote.vote ? (
                                                        <span className={cn(
                                                            'text-[10px] px-2 py-0.5 rounded font-medium',
                                                            vote.vote === 'go' && 'bg-green-500 text-white',
                                                            vote.vote === 'no_go' && 'bg-red-500 text-white',
                                                            vote.vote === 'conditional' && 'bg-yellow-500 text-white'
                                                        )}>
                                                            {vote.vote === 'no_go' ? 'NO-GO' : vote.vote.toUpperCase()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                                            PENDING
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => startVoting(vote.id, vote.vote, vote.comment)}
                                                        className="p-1 text-gray-400 hover:text-teal-500 transition-colors"
                                                        title={vote.vote ? "Change vote" : "Cast vote"}
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                    {onDelete && (
                                                        <button
                                                            onClick={() => onDelete(vote.id)}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Comment display */}
                                            {vote.comment && (
                                                <p className="mt-1.5 text-[10px] text-gray-600 dark:text-gray-400 italic pl-10">
                                                    "{vote.comment}"
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Vote summary card */}
                        <div className="grid grid-cols-3 gap-2 p-2 bg-gray-100 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="text-center">
                                <div className="text-lg font-bold text-green-600 dark:text-green-400">{goVotes}</div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400">GO</div>
                            </div>
                            <div className="text-center border-x border-gray-200 dark:border-gray-700">
                                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{conditionalVotes}</div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400">COND</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-red-600 dark:text-red-400">{noGoVotes}</div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400">NO-GO</div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default StakeholderPanel;
