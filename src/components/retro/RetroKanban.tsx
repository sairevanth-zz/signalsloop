'use client';

/**
 * Retro Kanban Board
 * Dynamic columns with cards
 */

import React, { useState } from 'react';
import { Plus, ThumbsUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { RetroColumnWithCards, RetroCard } from '@/types/retro';

interface RetroKanbanProps {
    columns: RetroColumnWithCards[];
    showAIContent: boolean;
    onAddCard: (columnId: string, content: string) => void;
    onVoteCard: (cardId: string) => void;
    onCreateAction: (cardId: string, content: string) => void;
}

export function RetroKanban({
    columns,
    showAIContent,
    onAddCard,
    onVoteCard,
    onCreateAction,
}: RetroKanbanProps) {
    const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
    const [newCardContent, setNewCardContent] = useState('');

    const handleAddCard = (columnId: string) => {
        if (newCardContent.trim()) {
            onAddCard(columnId, newCardContent.trim());
            setNewCardContent('');
            setAddingToColumn(null);
        }
    };

    const filteredColumns = columns.map(col => ({
        ...col,
        cards: showAIContent ? col.cards : col.cards.filter(c => !c.is_ai),
    }));

    return (
        <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
        >
            {filteredColumns.map(column => (
                <div
                    key={column.id}
                    className="bg-[#141b2d] rounded-xl border border-white/10 overflow-hidden"
                >
                    {/* Column Header */}
                    <div
                        className="px-3 py-2.5 border-b border-white/10 flex justify-between items-center"
                        style={{ borderBottomColor: `${column.color}40` }}
                    >
                        <div className="flex items-center gap-1.5">
                            <span>{column.emoji}</span>
                            <span className="text-sm font-semibold">{column.title}</span>
                            <span
                                className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: `${column.color}20`, color: column.color }}
                            >
                                {column.cards.length}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAddingToColumn(addingToColumn === column.id ? null : column.id)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Add Card Form */}
                    {addingToColumn === column.id && (
                        <div className="p-2 border-b border-white/10">
                            <Input
                                value={newCardContent}
                                onChange={(e) => setNewCardContent(e.target.value)}
                                placeholder="Add a card..."
                                className="bg-[#0a0f1a] border-gray-700 text-sm mb-1.5"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddCard(column.id);
                                    if (e.key === 'Escape') setAddingToColumn(null);
                                }}
                            />
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    onClick={() => handleAddCard(column.id)}
                                    className="h-6 text-[10px] bg-teal-600 hover:bg-teal-700"
                                >
                                    Add
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setAddingToColumn(null)}
                                    className="h-6 text-[10px]"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Cards */}
                    <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                        {column.cards.map(card => (
                            <RetroCardItem
                                key={card.id}
                                card={card}
                                columnColor={column.color || '#6366f1'}
                                onVote={() => onVoteCard(card.id)}
                                onCreateAction={() => onCreateAction(card.id, card.content)}
                            />
                        ))}

                        {column.cards.length === 0 && (
                            <div className="text-center py-6 text-gray-600 text-xs">
                                No cards yet
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

interface RetroCardItemProps {
    card: RetroCard;
    columnColor: string;
    onVote: () => void;
    onCreateAction: () => void;
}

function RetroCardItem({ card, columnColor, onVote, onCreateAction }: RetroCardItemProps) {
    return (
        <div
            className={cn(
                'bg-[#0a0f1a] rounded-lg p-2.5 border transition-all hover:border-white/20',
                card.is_success && 'border-emerald-500/30',
                card.is_alert && 'border-amber-500/30',
                !card.is_success && !card.is_alert && 'border-white/5'
            )}
        >
            {/* Source Badge */}
            {card.is_ai && (
                <div className="flex gap-1 mb-1.5">
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400">
                        🤖 AI
                    </span>
                    {card.source && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                            {card.source}
                        </span>
                    )}
                </div>
            )}

            {/* Content */}
            <p className="text-[11px] text-gray-200 leading-relaxed mb-2">{card.content}</p>

            {/* Data Badge */}
            {card.data_badge && (
                <div
                    className="inline-block text-[9px] px-1.5 py-0.5 rounded mb-2"
                    style={{
                        backgroundColor: card.is_success ? 'rgba(16, 185, 129, 0.1)' : card.is_alert ? 'rgba(245, 158, 11, 0.1)' : `${columnColor}15`,
                        color: card.is_success ? '#10b981' : card.is_alert ? '#f59e0b' : columnColor,
                    }}
                >
                    {card.data_badge}
                </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center mt-1">
                <button
                    onClick={onVote}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors"
                >
                    <ThumbsUp className="w-3 h-3" />
                    <span>{card.vote_count}</span>
                </button>

                <button
                    onClick={onCreateAction}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-teal-400 transition-colors"
                >
                    <ArrowRight className="w-3 h-3" />
                    <span>→ Action</span>
                </button>
            </div>
        </div>
    );
}

export default RetroKanban;
