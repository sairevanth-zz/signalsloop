/**
 * IntentCaptureModal - Start a spec from natural language intent
 * Shows evidence threads as they're found
 */

'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles,
    Search,
    Loader2,
    MessageSquare,
    Target,
    TrendingDown,
    Tag,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { EvidenceThread } from '@/lib/specs/evidence-thread-service';

interface IntentCaptureModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    projectSlug: string;
    onGenerateSpec: (intent: string, evidence: EvidenceThread[]) => void;
}

const EVIDENCE_ICONS: Record<string, React.ReactNode> = {
    feedback: <MessageSquare className="w-4 h-4" />,
    theme: <Tag className="w-4 h-4" />,
    competitor: <Target className="w-4 h-4" />,
    churn_signal: <TrendingDown className="w-4 h-4" />,
    metric: <TrendingDown className="w-4 h-4" />,
};

const EVIDENCE_COLORS: Record<string, string> = {
    feedback: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    theme: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    competitor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    churn_signal: 'bg-red-500/20 text-red-400 border-red-500/30',
    metric: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export function IntentCaptureModal({
    open,
    onOpenChange,
    projectId,
    projectSlug,
    onGenerateSpec,
}: IntentCaptureModalProps) {
    const [intent, setIntent] = useState('');
    const [evidence, setEvidence] = useState<EvidenceThread[]>([]);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleFindEvidence = async () => {
        if (!intent.trim()) {
            toast.error('Please describe what you want to build');
            return;
        }

        setSearching(true);
        setHasSearched(true);

        try {
            const response = await fetch('/api/specs/evidence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, intent }),
            });

            const data = await response.json();

            if (data.success) {
                setEvidence(data.evidence);
                if (data.evidence.length === 0) {
                    toast.info('No matching evidence found - you can still generate a spec');
                }
            } else {
                toast.error(data.error || 'Failed to search for evidence');
            }
        } catch (error) {
            toast.error('Failed to search for evidence');
        } finally {
            setSearching(false);
        }
    };

    const handleGenerateSpec = () => {
        if (!intent.trim()) {
            toast.error('Please describe what you want to build');
            return;
        }

        onGenerateSpec(intent, evidence);
        onOpenChange(false);

        // Reset state
        setIntent('');
        setEvidence([]);
        setHasSearched(false);
    };

    const removeEvidence = (id: string) => {
        setEvidence(evidence.filter((e) => e.id !== id));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-slate-900 border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Start from Intent
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Describe what you want to build. We'll find relevant evidence and generate a spec.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Intent Input */}
                    <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                            What do you want to build?
                        </label>
                        <Textarea
                            value={intent}
                            onChange={(e) => setIntent(e.target.value)}
                            placeholder="e.g., A dark mode feature that automatically switches based on system preferences and saves user preference..."
                            className="min-h-[120px] bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                        />
                    </div>

                    {/* Find Evidence Button */}
                    <Button
                        onClick={handleFindEvidence}
                        disabled={searching || !intent.trim()}
                        variant="outline"
                        className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                    >
                        {searching ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Searching for evidence...
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4 mr-2" />
                                Find Evidence
                            </>
                        )}
                    </Button>

                    {/* Evidence Chips */}
                    {hasSearched && (
                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-2 block">
                                Related Evidence ({evidence.length})
                            </label>
                            {evidence.length === 0 ? (
                                <p className="text-sm text-slate-500 py-4 text-center">
                                    No matching evidence found. You can still generate a spec.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto p-2 bg-slate-800/50 rounded-lg">
                                    {evidence.map((item) => {
                                        // Color badge based on relevance
                                        const relevancePercent = Math.round(item.relevance * 100);
                                        let badgeClass = 'bg-slate-600 text-white';
                                        if (relevancePercent >= 80) {
                                            badgeClass = 'bg-green-600 text-white';
                                        } else if (relevancePercent >= 60) {
                                            badgeClass = 'bg-blue-600 text-white';
                                        } else if (relevancePercent >= 40) {
                                            badgeClass = 'bg-amber-600 text-white';
                                        }

                                        return (
                                            <div
                                                key={item.id}
                                                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600"
                                            >
                                                <div className="flex-shrink-0 text-blue-400">
                                                    {EVIDENCE_ICONS[item.type]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                                                    <p className="text-xs text-slate-400 truncate">{item.summary}</p>
                                                </div>
                                                <Badge className={`text-xs ${badgeClass}`}>
                                                    {relevancePercent}%
                                                </Badge>
                                                <button
                                                    onClick={() => removeEvidence(item.id)}
                                                    className="flex-shrink-0 p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-white"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Generate Button */}
                    <Button
                        onClick={handleGenerateSpec}
                        disabled={!intent.trim()}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Spec
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
