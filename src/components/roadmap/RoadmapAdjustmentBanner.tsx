'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    AlertTriangle,
    ArrowRight,
    Check,
    X,
    Zap,
    ChevronDown,
    ChevronUp,
    TrendingUp,
    TrendingDown,
    Users,
    Target
} from 'lucide-react'
import { toast } from 'sonner'

interface PriorityChange {
    suggestionId: string
    themeId: string
    themeName: string
    oldPriority: string
    newPriority: string
    oldScore: number
    newScore: number
    reasoning: string
    impactIfIgnored: string
}

interface AdjustmentProposal {
    id: string
    triggerType: 'sentiment_shift' | 'competitor_move' | 'theme_spike' | 'churn_signal'
    triggerSeverity: 'low' | 'medium' | 'high' | 'critical'
    triggerDescription: string
    proposedChanges: PriorityChange[]
    confidenceScore: number
    expiresAt: string
    createdAt: string
}

const TRIGGER_ICONS = {
    sentiment_shift: TrendingDown,
    competitor_move: Target,
    theme_spike: TrendingUp,
    churn_signal: Users
}

const TRIGGER_LABELS = {
    sentiment_shift: 'Sentiment Shift',
    competitor_move: 'Competitor Move',
    theme_spike: 'Theme Spike',
    churn_signal: 'Churn Signal'
}

const SEVERITY_COLORS = {
    critical: 'bg-red-500/10 border-red-500/50 text-red-400',
    high: 'bg-orange-500/10 border-orange-500/50 text-orange-400',
    medium: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400',
    low: 'bg-blue-500/10 border-blue-500/50 text-blue-400'
}

const PRIORITY_COLORS: Record<string, string> = {
    'P0': 'bg-red-600 text-white',
    'P1': 'bg-orange-500 text-white',
    'P2': 'bg-yellow-500 text-black',
    'P3': 'bg-blue-500 text-white'
}

export function RoadmapAdjustmentBanner({ projectId }: { projectId: string }) {
    const [proposals, setProposals] = useState<AdjustmentProposal[]>([])
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(() => {
        fetchPendingProposals()
    }, [projectId])

    async function fetchPendingProposals() {
        try {
            const res = await fetch(`/api/roadmap/adjustments?projectId=${projectId}&status=pending`)
            const data = await res.json()
            setProposals(data.proposals || [])
        } catch (error) {
            console.error('Failed to fetch proposals:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleApprove(proposalId: string) {
        setActionLoading(proposalId)
        try {
            const res = await fetch(`/api/roadmap/adjustments/${proposalId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            })

            if (!res.ok) throw new Error('Failed to approve')

            const data = await res.json()
            toast.success(`Applied ${data.appliedChanges} priority changes`)
            fetchPendingProposals()
        } catch (error) {
            toast.error('Failed to approve proposal')
        } finally {
            setActionLoading(null)
        }
    }

    async function handleReject(proposalId: string) {
        setActionLoading(proposalId)
        try {
            const res = await fetch(`/api/roadmap/adjustments/${proposalId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            })

            if (!res.ok) throw new Error('Failed to reject')

            toast.success('Proposal dismissed')
            fetchPendingProposals()
        } catch (error) {
            toast.error('Failed to dismiss proposal')
        } finally {
            setActionLoading(null)
        }
    }

    function getTimeRemaining(expiresAt: string): string {
        const diff = new Date(expiresAt).getTime() - Date.now()
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

        if (days > 0) return `${days}d remaining`
        if (hours > 0) return `${hours}h remaining`
        return 'Expiring soon'
    }

    if (loading || proposals.length === 0) return null

    return (
        <div className="space-y-3 mb-6">
            {proposals.map(proposal => {
                const TriggerIcon = TRIGGER_ICONS[proposal.triggerType]
                const isExpanded = expandedId === proposal.id
                const isLoading = actionLoading === proposal.id

                return (
                    <Alert
                        key={proposal.id}
                        className={`${SEVERITY_COLORS[proposal.triggerSeverity]} border cursor-pointer transition-all`}
                    >
                        <div
                            className="flex items-start gap-3"
                            onClick={() => setExpandedId(isExpanded ? null : proposal.id)}
                        >
                            <TriggerIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />

                            <div className="flex-1 min-w-0">
                                <h5 className="flex items-center gap-2 flex-wrap font-medium text-sm">
                                    <span>Roadmap Adjustment Suggested</span>
                                    <Badge variant="outline" className="text-xs font-normal">
                                        {TRIGGER_LABELS[proposal.triggerType]}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className={`text-xs font-normal ${proposal.triggerSeverity === 'critical' ? 'border-red-500 text-red-400' :
                                            proposal.triggerSeverity === 'high' ? 'border-orange-500 text-orange-400' :
                                                'border-slate-500 text-slate-400'
                                            }`}
                                    >
                                        {proposal.triggerSeverity.toUpperCase()}
                                    </Badge>
                                </h5>

                                <AlertDescription className="mt-1">
                                    <p className="text-sm">{proposal.triggerDescription}</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {proposal.proposedChanges.length} change{proposal.proposedChanges.length !== 1 ? 's' : ''} proposed •
                                        {' '}{Math.round(proposal.confidenceScore * 100)}% confidence •
                                        {' '}{getTimeRemaining(proposal.expiresAt)}
                                    </p>
                                </AlertDescription>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="flex-shrink-0"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedId(isExpanded ? null : proposal.id)
                                }}
                            >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                        </div>

                        {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-slate-700/50">
                                <h4 className="text-sm font-medium mb-3">Proposed Priority Changes:</h4>

                                <div className="space-y-2 mb-4">
                                    {proposal.proposedChanges.map((change, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{change.themeName}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{change.reasoning}</p>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Badge className={PRIORITY_COLORS[change.oldPriority]}>
                                                    {change.oldPriority}
                                                </Badge>
                                                <ArrowRight className="w-4 h-4 text-slate-500" />
                                                <Badge className={PRIORITY_COLORS[change.newPriority]}>
                                                    {change.newPriority}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700"
                                        disabled={isLoading}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleApprove(proposal.id)
                                        }}
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center gap-1">
                                                <span className="animate-spin">⏳</span> Applying...
                                            </span>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4 mr-1" />
                                                Apply Changes
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-slate-600"
                                        disabled={isLoading}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleReject(proposal.id)
                                        }}
                                    >
                                        <X className="w-4 h-4 mr-1" />
                                        Dismiss
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Alert>
                )
            })}
        </div>
    )
}
