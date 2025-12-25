'use client';

/**
 * Go/No-Go Dashboard
 * Main dashboard for launch readiness assessment
 * Layout: Score | Dimensions + Details | Checklist + Risks | Stakeholders
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket, Share2, Sparkles, Plus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { OverallReadinessScore } from './OverallReadinessScore';
import { DimensionList } from './DimensionList';
import { DimensionDetails } from './DimensionDetails';
import { LaunchChecklist } from './LaunchChecklist';
import { RisksPanel } from './RisksPanel';
import { StakeholderPanel } from './StakeholderPanel';
import { DecisionPanel } from './DecisionPanel';
import type {
    LaunchBoardWithDetails,
    DimensionType,
    VoteType,
} from '@/types/launch';

interface GoNoGoDashboardProps {
    boardId: string;
    projectSlug: string;
}

export function GoNoGoDashboard({ boardId, projectSlug }: GoNoGoDashboardProps) {
    const router = useRouter();
    const [board, setBoard] = useState<LaunchBoardWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAIContent, setShowAIContent] = useState(true);
    const [selectedDimension, setSelectedDimension] = useState<DimensionType>('customer_readiness');
    const [isPopulating, setIsPopulating] = useState(false);
    const [notes, setNotes] = useState('');

    // Fetch board data
    useEffect(() => {
        async function fetchBoard() {
            try {
                const response = await fetch(`/api/launch/${boardId}`);
                if (!response.ok) throw new Error('Failed to fetch board');
                const data = await response.json();
                setBoard(data.board);
                setNotes(data.board.decision_notes || '');
            } catch (error) {
                console.error('Error fetching board:', error);
                toast.error('Failed to load launch board');
            } finally {
                setLoading(false);
            }
        }
        fetchBoard();
    }, [boardId]);

    // Trigger AI population
    const handleAIPopulate = async () => {
        setIsPopulating(true);
        try {
            const response = await fetch(`/api/launch/${boardId}/ai-populate`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error('Failed to populate');
            const data = await response.json();

            // Refresh board data
            const boardResponse = await fetch(`/api/launch/${boardId}`);
            const boardData = await boardResponse.json();
            setBoard(boardData.board);

            toast.success('AI analysis complete!');
        } catch (error) {
            console.error('Error populating:', error);
            toast.error('Failed to run AI analysis');
        } finally {
            setIsPopulating(false);
        }
    };

    // Toggle checklist item
    const handleToggleChecklist = async (itemId: string, completed: boolean) => {
        try {
            await fetch(`/api/launch/${boardId}/checklist`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, completed }),
            });

            setBoard(prev => prev ? {
                ...prev,
                checklist_items: prev.checklist_items.map(item =>
                    item.id === itemId ? { ...item, completed } : item
                ),
            } : null);
        } catch (error) {
            toast.error('Failed to update checklist');
        }
    };

    // Update risk status
    const handleUpdateRisk = async (riskId: string, status: string) => {
        try {
            await fetch(`/api/launch/${boardId}/risks`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ riskId, status }),
            });

            setBoard(prev => prev ? {
                ...prev,
                risks: prev.risks.map(risk =>
                    risk.id === riskId ? { ...risk, status: status as 'open' | 'mitigated' | 'acknowledged' } : risk
                ),
            } : null);
        } catch (error) {
            toast.error('Failed to update risk');
        }
    };

    // Cast vote
    const handleCastVote = async (voteId: string, vote: VoteType, comment?: string) => {
        try {
            await fetch(`/api/launch/${boardId}/votes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voteId, vote, comment }),
            });

            setBoard(prev => prev ? {
                ...prev,
                votes: prev.votes.map(v =>
                    v.id === voteId ? { ...v, vote, comment, voted_at: new Date().toISOString() } : v
                ),
            } : null);

            toast.success('Vote recorded');
        } catch (error) {
            toast.error('Failed to cast vote');
        }
    };

    // Make final decision
    const handleDecision = async (decision: 'go' | 'no_go' | 'conditional') => {
        try {
            await fetch(`/api/launch/${boardId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    decision,
                    decision_notes: notes,
                    status: 'decided',
                }),
            });

            toast.success(`Decision recorded: ${decision.toUpperCase().replace('_', '-')}`);

            // Refresh board
            const response = await fetch(`/api/launch/${boardId}`);
            const data = await response.json();
            setBoard(data.board);
        } catch (error) {
            toast.error('Failed to record decision');
        }
    };

    // Update dimension notes
    const handleUpdateDimensionNotes = async (dimensionId: string, team_notes: string) => {
        try {
            await fetch(`/api/launch/${boardId}/dimensions`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dimensionId, team_notes }),
            });

            setBoard(prev => prev ? {
                ...prev,
                dimensions: prev.dimensions.map(d =>
                    d.id === dimensionId ? { ...d, team_notes } : d
                ),
            } : null);
        } catch (error) {
            toast.error('Failed to update notes');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            </div>
        );
    }

    if (!board) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center text-white">
                <div className="text-center">
                    <p className="text-gray-400 mb-4">Launch board not found</p>
                    <Button onClick={() => router.push(`/${projectSlug}/launch`)}>
                        Back to Launches
                    </Button>
                </div>
            </div>
        );
    }

    const overallScore = board.overall_score || 0;
    const selectedDimensionData = board.dimensions.find(d => d.dimension_type === selectedDimension);

    return (
        <div className="min-h-screen bg-[#0a0f1a] text-gray-50 font-sans">
            {/* Header */}
            <div className="bg-[#141b2d] border-b border-white/10 px-6 py-3.5">
                <div className="max-w-[1800px] mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/${projectSlug}/launch`)}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </button>
                        <span className="text-2xl">🚀</span>
                        <div>
                            <h1 className="text-lg font-bold">Go/No-Go: {board.title}</h1>
                            <p className="text-xs text-gray-400">
                                {board.target_date ? `Target: ${new Date(board.target_date).toLocaleDateString()}` : 'No target date set'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAIPopulate}
                            disabled={isPopulating}
                            className={`border-gray-700 ${showAIContent ? 'bg-teal-500/10 text-teal-400 border-teal-500/50' : 'text-gray-400'}`}
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {isPopulating ? 'Analyzing...' : 'AI Analyze'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAIContent(!showAIContent)}
                            className={`border-gray-700 ${showAIContent ? 'bg-teal-500/10 text-teal-400' : 'text-gray-400'}`}
                        >
                            🤖 AI {showAIContent ? 'ON' : 'OFF'}
                        </Button>
                        <Button variant="outline" size="sm" className="border-gray-700 text-gray-400">
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content - 4 Column Grid */}
            <div className="p-5 max-w-[1800px] mx-auto">
                <div className="grid grid-cols-[200px_1fr_340px_280px] gap-4">
                    {/* Column 1: Score & Dimensions */}
                    <div>
                        <div className="bg-[#141b2d] rounded-xl p-5 border border-white/10 text-center mb-3">
                            <OverallReadinessScore score={overallScore} />
                            <div className="text-xs text-gray-500 mt-2">Overall Readiness</div>
                        </div>

                        <div className="text-[10px] text-gray-500 mb-1.5 font-semibold tracking-wide">
                            DIMENSIONS
                        </div>
                        <DimensionList
                            dimensions={board.dimensions}
                            selected={selectedDimension}
                            onSelect={setSelectedDimension}
                        />
                    </div>

                    {/* Column 2: Dimension Details */}
                    <DimensionDetails
                        dimension={selectedDimensionData}
                        showAIContent={showAIContent}
                        onUpdateNotes={handleUpdateDimensionNotes}
                    />

                    {/* Column 3: Checklist & Risks */}
                    <div>
                        <LaunchChecklist
                            items={board.checklist_items}
                            onToggle={handleToggleChecklist}
                        />
                        <div className="mt-3">
                            <RisksPanel
                                risks={board.risks}
                                onUpdateStatus={handleUpdateRisk}
                            />
                        </div>
                    </div>

                    {/* Column 4: Stakeholders & Decision */}
                    <div>
                        <StakeholderPanel
                            votes={board.votes}
                            onCastVote={handleCastVote}
                        />

                        {/* Notes Section */}
                        <div className="bg-[#141b2d] rounded-xl p-3 border border-white/10 mt-3">
                            <div className="text-[10px] text-gray-500 mb-1.5 font-semibold">
                                📝 NOTES & CONTEXT
                            </div>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add launch context, dependencies, timing notes..."
                                className="bg-[#0a0f1a] border-gray-700 text-sm min-h-[60px] resize-y"
                            />
                        </div>

                        {/* Decision Panel */}
                        <div className="mt-3">
                            <DecisionPanel
                                currentDecision={board.decision}
                                onDecision={handleDecision}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GoNoGoDashboard;
