'use client';

/**
 * Stakeholder Panel Component
 * Add and manage stakeholders with votes and comments
 * Simplified - admin adds stakeholders directly (no invite flow)
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { LaunchVote, VoteType } from '@/types/launch';

interface StakeholderPanelProps {
    votes: LaunchVote[];
    onCastVote: (voteId: string, vote: VoteType, comment?: string) => void;
    onAdd?: (name: string, role: string) => void;
    onUpdate?: (voteId: string, name: string, role: string, comment?: string) => void;
    onDelete?: (voteId: string) => void;
}

export function StakeholderPanel({ votes, onCastVote, onAdd, onUpdate, onDelete }: StakeholderPanelProps) {
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('');
    const [editComment, setEditComment] = useState('');

    const goVotes = votes.filter(v => v.vote === 'go').length;
    const noGoVotes = votes.filter(v => v.vote === 'no_go').length;
    const conditionalVotes = votes.filter(v => v.vote === 'conditional').length;

    const handleAdd = () => {
        if (newName.trim() && onAdd) {
            onAdd(newName.trim(), newRole.trim() || 'Stakeholder');
            setNewName('');
            setNewRole('');
            setShowAdd(false);
        }
    };

    const startEdit = (vote: LaunchVote) => {
        setEditingId(vote.id);
        setEditName(vote.name);
        setEditRole(vote.role || '');
        setEditComment(vote.comment || '');
    };

    const saveEdit = (voteId: string) => {
        if (onUpdate && editName.trim()) {
            onUpdate(voteId, editName.trim(), editRole.trim(), editComment.trim() || undefined);
            setEditingId(null);
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditRole('');
        setEditComment('');
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
                        <Plus className="w-3 h-3 mr-1" />
                        Add
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
                                placeholder="Role (e.g., VP Product)"
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
                                    {editingId === vote.id ? (
                                        // Edit mode
                                        <div className="space-y-2">
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                placeholder="Name"
                                                className="h-7 text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-700"
                                            />
                                            <Input
                                                value={editRole}
                                                onChange={(e) => setEditRole(e.target.value)}
                                                placeholder="Role"
                                                className="h-7 text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-700"
                                            />
                                            <Textarea
                                                value={editComment}
                                                onChange={(e) => setEditComment(e.target.value)}
                                                placeholder="Comment on vote..."
                                                className="text-xs h-12 bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-700"
                                            />
                                            <div className="flex gap-1">
                                                <Button size="sm" onClick={() => saveEdit(vote.id)} className="h-6 text-xs">
                                                    <Check className="w-3 h-3 mr-1" /> Save
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-6 text-xs">
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Display mode
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                                                    getAvatarColor(vote.name)
                                                )}>
                                                    {getInitials(vote.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                                            {vote.name}
                                                        </p>
                                                    </div>
                                                    {vote.role && (
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-500 truncate">{vote.role}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    {/* Vote buttons */}
                                                    <button
                                                        onClick={() => onCastVote(vote.id, 'go', vote.comment || undefined)}
                                                        className={cn(
                                                            'p-1 rounded transition-colors',
                                                            vote.vote === 'go' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-green-500'
                                                        )}
                                                        title="GO"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => onCastVote(vote.id, 'no_go', vote.comment || undefined)}
                                                        className={cn(
                                                            'p-1 rounded transition-colors',
                                                            vote.vote === 'no_go' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-red-500'
                                                        )}
                                                        title="NO-GO"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => onCastVote(vote.id, 'conditional', vote.comment || undefined)}
                                                        className={cn(
                                                            'p-1 rounded transition-colors',
                                                            vote.vote === 'conditional' ? 'bg-yellow-500 text-white' : 'text-gray-400 hover:text-yellow-500'
                                                        )}
                                                        title="Conditional"
                                                    >
                                                        <AlertCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => startEdit(vote)}
                                                        className="p-1 text-gray-400 hover:text-teal-500 transition-colors"
                                                        title="Edit"
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
