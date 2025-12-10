/**
 * MakeItRealModal - Transform spec into Jira tickets
 * Shows preview of epic, stories, effort estimate, and rollout plan
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Rocket,
    Loader2,
    CheckCircle,
    AlertTriangle,
    Calendar,
    Users,
    BarChart3,
    Layers,
    ChevronDown,
    ChevronRight,
    ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TicketPlan, JiraStory } from '@/lib/specs/spec-to-tickets-service';

interface MakeItRealModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    specId: string;
    specTitle: string;
    projectId: string;
}

function StoryCard({ story, index }: { story: JiraStory; index: number }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-sm font-medium text-white flex-1">
                    {index + 1}. {story.summary}
                </span>
                {story.storyPoints && (
                    <Badge variant="outline" className="text-xs border-slate-600">
                        {story.storyPoints} pts
                    </Badge>
                )}
            </div>
            {expanded && (
                <div className="mt-3 ml-6 space-y-2">
                    <p className="text-xs text-slate-400">{story.description}</p>
                    {story.acceptanceCriteria.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-slate-300 mb-1">
                                Acceptance Criteria:
                            </p>
                            <ul className="text-xs text-slate-400 space-y-1">
                                {story.acceptanceCriteria.map((ac, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <CheckCircle className="w-3 h-3 mt-0.5 text-green-500" />
                                        {ac}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function MakeItRealModal({
    open,
    onOpenChange,
    specId,
    specTitle,
    projectId,
}: MakeItRealModalProps) {
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [plan, setPlan] = useState<TicketPlan | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{
        epicKey?: string;
        storyKeys?: string[];
    } | null>(null);

    useEffect(() => {
        if (open && specId) {
            generatePlan();
        }
    }, [open, specId]);

    const generatePlan = async () => {
        setLoading(true);
        setError(null);
        setPlan(null);
        setResult(null);

        try {
            const response = await fetch('/api/specs/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate',
                    projectId,
                    specId,
                }),
            });

            const data = await response.json();

            if (data.success && data.plan) {
                setPlan(data.plan);
            } else {
                setError(data.error || 'Failed to generate ticket plan');
            }
        } catch (err) {
            setError('Failed to generate ticket plan');
        } finally {
            setLoading(false);
        }
    };

    const executePlan = async () => {
        if (!plan) return;

        setExecuting(true);

        try {
            const response = await fetch('/api/specs/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'execute',
                    projectId,
                    plan,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setResult({
                    epicKey: data.epicKey,
                    storyKeys: data.storyKeys,
                });
                toast.success(`Created ${data.epicKey} with ${data.storyKeys?.length || 0} stories!`);
            } else {
                toast.error(data.error || 'Failed to create tickets');
            }
        } catch (err) {
            toast.error('Failed to create tickets');
        } finally {
            setExecuting(false);
        }
    };

    const totalPoints = plan?.stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0) || 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] bg-slate-900 border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                        <Rocket className="w-5 h-5 text-green-400" />
                        Make It Real
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Transform "{specTitle}" into Jira tickets
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-y-auto pr-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-slate-500 animate-spin mb-4" />
                            <p className="text-sm text-slate-400">Generating ticket plan...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <AlertTriangle className="w-8 h-8 text-red-400 mb-4" />
                            <p className="text-sm text-red-400">{error}</p>
                            <Button
                                onClick={generatePlan}
                                variant="outline"
                                className="mt-4 border-slate-600"
                            >
                                Try Again
                            </Button>
                        </div>
                    ) : result ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <CheckCircle className="w-12 h-12 text-green-400 mb-4" />
                            <p className="text-lg font-medium text-white mb-2">Tickets Created!</p>
                            <div className="flex items-center gap-2 mb-4">
                                <Badge className="bg-purple-600">{result.epicKey}</Badge>
                                <span className="text-slate-400">
                                    + {result.storyKeys?.length || 0} stories
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                className="border-slate-600"
                                onClick={() => onOpenChange(false)}
                            >
                                Close
                            </Button>
                        </div>
                    ) : plan ? (
                        <div className="space-y-6 mt-4">
                            {/* Epic Summary */}
                            <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <Layers className="w-5 h-5 text-purple-400" />
                                    <h3 className="font-medium text-white">Epic</h3>
                                    <Badge className="bg-purple-600 text-xs">{plan.epic.priority}</Badge>
                                </div>
                                <p className="text-sm text-white font-medium">{plan.epic.summary}</p>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                    {plan.epic.description}
                                </p>
                            </div>

                            {/* Stories */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <h3 className="font-medium text-white">Stories ({plan.stories.length})</h3>
                                    <Badge variant="outline" className="text-xs border-slate-600">
                                        {totalPoints} total points
                                    </Badge>
                                </div>
                                <div className="space-y-2">
                                    {plan.stories.map((story, i) => (
                                        <StoryCard key={i} story={story} index={i} />
                                    ))}
                                </div>
                            </div>

                            {/* Effort Estimate */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="w-4 h-4 text-blue-400" />
                                        <h4 className="text-sm font-medium text-white">Effort Estimate</h4>
                                    </div>
                                    <p className="text-2xl font-bold text-white">
                                        {plan.effortEstimate.min}-{plan.effortEstimate.max}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {plan.effortEstimate.unit} ({(plan.effortEstimate.confidence * 100).toFixed(0)}% confidence)
                                    </p>
                                </div>

                                {/* Assignees */}
                                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users className="w-4 h-4 text-green-400" />
                                        <h4 className="text-sm font-medium text-white">Suggested Team</h4>
                                    </div>
                                    {plan.suggestedAssignees.length > 0 ? (
                                        <div className="space-y-1">
                                            {plan.suggestedAssignees.slice(0, 3).map((a) => (
                                                <p key={a.id} className="text-sm text-slate-300">
                                                    {a.name}
                                                </p>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400">Assign after creation</p>
                                    )}
                                </div>
                            </div>

                            {/* Telemetry Plan */}
                            {plan.telemetryPlan.length > 0 && (
                                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <div className="flex items-center gap-2 mb-3">
                                        <BarChart3 className="w-4 h-4 text-amber-400" />
                                        <h4 className="text-sm font-medium text-white">Telemetry Plan</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {plan.telemetryPlan.map((item, i) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <code className="text-xs bg-slate-700 px-2 py-1 rounded text-amber-300">
                                                    {item.event}
                                                </code>
                                                <span className="text-xs text-slate-400">{item.purpose}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rollout Plan */}
                            {plan.rolloutPlan.length > 0 && (
                                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <h4 className="text-sm font-medium text-white mb-3">Rollout Plan</h4>
                                    <div className="space-y-2">
                                        {plan.rolloutPlan.map((step, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 text-sm"
                                            >
                                                <Badge variant="outline" className="border-slate-600">
                                                    {step.phase}
                                                </Badge>
                                                <span className="text-slate-300">{step.audience}</span>
                                                <span className="text-slate-500">({step.percentage}%)</span>
                                                <span className="text-xs text-slate-500">{step.duration}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Create Button */}
                            <Button
                                onClick={executePlan}
                                disabled={executing}
                                className="w-full bg-green-600 hover:bg-green-700"
                            >
                                {executing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating in Jira...
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="w-4 h-4 mr-2" />
                                        Create in Jira
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
