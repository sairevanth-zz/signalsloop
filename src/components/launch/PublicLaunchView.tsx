'use client';

/**
 * Public Launch View Component
 * Read-only view of a launch board for public sharing
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { OverallReadinessScore } from './OverallReadinessScore';
import type { LaunchBoardWithDetails, LaunchDimension, LaunchRisk, LaunchVote, LaunchChecklistItem } from '@/types/launch';
import { DIMENSION_CONFIG } from '@/types/launch';

interface PublicLaunchViewProps {
    board: LaunchBoardWithDetails;
}

export function PublicLaunchView({ board }: PublicLaunchViewProps) {
    const goVotes = board.votes.filter(v => v.vote === 'go').length;
    const noGoVotes = board.votes.filter(v => v.vote === 'no_go').length;
    const conditionalVotes = board.votes.filter(v => v.vote === 'conditional').length;
    const checklistComplete = board.checklist_items.filter(i => i.completed).length;
    const checklistTotal = board.checklist_items.length;
    const openRisks = board.risks.filter(r => r.status === 'open').length;

    const getDecisionColor = () => {
        switch (board.decision) {
            case 'go': return 'bg-green-500';
            case 'no_go': return 'bg-red-500';
            case 'conditional': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                🚀 {board.title}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {board.target_date ? `Target: ${new Date(board.target_date).toLocaleDateString()}` : 'Go/No-Go Launch Assessment'}
                            </p>
                        </div>
                        {board.decision && (
                            <span className={cn(
                                'px-4 py-2 rounded-lg font-bold text-white',
                                getDecisionColor()
                            )}>
                                {board.decision.replace('_', '-').toUpperCase()}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto p-6">
                {/* Score and Summary Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
                        <OverallReadinessScore score={board.overall_score || 0} />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Overall Readiness</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Vote Summary</h3>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span className="text-green-600 dark:text-green-400">GO</span>
                                <span className="font-bold">{goVotes}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-yellow-600 dark:text-yellow-400">Conditional</span>
                                <span className="font-bold">{conditionalVotes}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-red-600 dark:text-red-400">NO-GO</span>
                                <span className="font-bold">{noGoVotes}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Checklist Progress</h3>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {checklistComplete}/{checklistTotal}
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
                            <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${checklistTotal > 0 ? (checklistComplete / checklistTotal) * 100 : 0}%` }}
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Open Risks</h3>
                        <div className={cn(
                            'text-2xl font-bold',
                            openRisks > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'
                        )}>
                            {openRisks}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {openRisks === 0 ? 'All risks addressed' : 'Requires attention'}
                        </p>
                    </div>
                </div>

                {/* Dimensions */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📊 Dimension Scores</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {board.dimensions.map((dim) => {
                            const config = DIMENSION_CONFIG[dim.dimension_type];
                            return (
                                <div key={dim.id} className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                                    <span className="text-xl">{config.icon}</span>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{config.name}</p>
                                    <p className={cn(
                                        'text-lg font-bold mt-1',
                                        (dim.ai_score || 0) >= 70 ? 'text-green-600 dark:text-green-400' :
                                            (dim.ai_score || 0) >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                                                'text-red-600 dark:text-red-400'
                                    )}>
                                        {dim.ai_score || 0}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Stakeholders */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">👥 Stakeholder Votes</h3>
                    <div className="space-y-2">
                        {board.votes.map((vote) => (
                            <div key={vote.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-900 rounded-lg p-3">
                                <div>
                                    <p className="font-medium text-sm">{vote.name}</p>
                                    {vote.role && <p className="text-xs text-gray-500 dark:text-gray-400">{vote.role}</p>}
                                    {vote.comment && <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-1">"{vote.comment}"</p>}
                                </div>
                                <span className={cn(
                                    'px-3 py-1 rounded-lg text-xs font-bold text-white',
                                    vote.vote === 'go' ? 'bg-green-500' :
                                        vote.vote === 'no_go' ? 'bg-red-500' :
                                            vote.vote === 'conditional' ? 'bg-yellow-500' : 'bg-gray-400'
                                )}>
                                    {vote.vote ? vote.vote.replace('_', '-').toUpperCase() : 'PENDING'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notes */}
                {board.decision_notes && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">📝 Notes & Context</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{board.decision_notes}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
                    Powered by <span className="font-semibold">SignalsLoop</span> • Go/No-Go Launch Dashboard
                </div>
            </div>
        </div>
    );
}

export default PublicLaunchView;
