'use client';

/**
 * WidgetPollView - Embedded poll display for the feedback widget
 * Compact version of VotingInterface for widget context
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Vote,
    Loader2,
    CheckCircle,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import type { PollWithOptions, PollOption } from '@/types/polls';

interface WidgetPollViewProps {
    projectId: string;
    onComplete?: () => void;
    onSkip?: () => void;
}

export function WidgetPollView({
    projectId,
    onComplete,
    onSkip
}: WidgetPollViewProps) {
    const [poll, setPoll] = useState<PollWithOptions | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [voted, setVoted] = useState(false);
    const [error, setError] = useState('');

    // Vote state
    const [selectedOption, setSelectedOption] = useState<string>('');
    const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
    const [explanation, setExplanation] = useState('');

    // Load active poll for project
    useEffect(() => {
        loadActivePoll();
    }, [projectId]);

    const loadActivePoll = async () => {
        try {
            const res = await fetch(`/api/polls?projectId=${projectId}&status=active&limit=1`);
            if (!res.ok) throw new Error('Failed to load poll');
            const data = await res.json();

            if (data.polls && data.polls.length > 0) {
                setPoll(data.polls[0]);
            }
        } catch (err) {
            console.error('Failed to load poll:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleMultiOption = (optionId: string) => {
        const newSelected = new Set(selectedOptions);
        if (newSelected.has(optionId)) {
            newSelected.delete(optionId);
        } else {
            newSelected.add(optionId);
        }
        setSelectedOptions(newSelected);
    };

    const submitVote = async () => {
        if (!poll) return;

        // Validation
        if (poll.poll_type === 'single_choice' && !selectedOption) {
            setError('Please select an option');
            return;
        }
        if (poll.poll_type === 'multiple_choice' && selectedOptions.size === 0) {
            setError('Please select at least one option');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const voteInput: any = {
                option_id: selectedOption,
                explanation: explanation || undefined
            };

            if (poll.poll_type === 'multiple_choice') {
                voteInput.option_ids = Array.from(selectedOptions);
            }

            const res = await fetch(`/api/polls/${poll.id}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(voteInput)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to submit vote');
            }

            setVoted(true);
            setTimeout(() => {
                onComplete?.();
            }, 2000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                <p className="mt-2 text-sm text-slate-500">Loading...</p>
            </div>
        );
    }

    // No active polls
    if (!poll) {
        return null; // Don't show anything if no polls available
    }

    // Success state
    if (voted) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Thank you!</h3>
                <p className="text-sm text-slate-500 mt-1">Your vote has been recorded.</p>
            </div>
        );
    }

    const sortedOptions = [...(poll.options || [])].sort((a, b) => a.display_order - b.display_order);

    return (
        <div className="space-y-4">
            {/* Poll Question */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <Vote className="w-4 h-4 text-teal-500" />
                    <span className="text-xs font-medium text-teal-600 uppercase tracking-wide">
                        Quick Poll
                    </span>
                </div>
                <h3 className="font-semibold text-slate-900">{poll.title}</h3>
                {poll.description && (
                    <p className="text-sm text-slate-500 mt-1">{poll.description}</p>
                )}
            </div>

            {/* Options */}
            <div className="space-y-2">
                {/* Single Choice */}
                {poll.poll_type === 'single_choice' && (
                    <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
                        {sortedOptions.map((option) => (
                            <div
                                key={option.id}
                                className="flex items-center space-x-2 p-2 rounded-lg border border-slate-200 hover:border-teal-300 transition-colors cursor-pointer"
                                onClick={() => setSelectedOption(option.id)}
                            >
                                <RadioGroupItem value={option.id} id={`widget-${option.id}`} />
                                <Label htmlFor={`widget-${option.id}`} className="flex-1 cursor-pointer text-sm text-slate-700">
                                    {option.option_text}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                )}

                {/* Multiple Choice */}
                {poll.poll_type === 'multiple_choice' && (
                    <div className="space-y-2">
                        {sortedOptions.map((option) => (
                            <div
                                key={option.id}
                                className="flex items-center space-x-2 p-2 rounded-lg border border-slate-200 hover:border-teal-300 transition-colors cursor-pointer"
                                onClick={() => toggleMultiOption(option.id)}
                            >
                                <Checkbox
                                    checked={selectedOptions.has(option.id)}
                                    onCheckedChange={() => toggleMultiOption(option.id)}
                                />
                                <Label className="flex-1 cursor-pointer text-sm text-slate-700">
                                    {option.option_text}
                                </Label>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Explanation (if required) */}
            {poll.require_explanation && (
                <div className="space-y-1">
                    <Label className="text-sm text-slate-600">Why did you choose this?</Label>
                    <Textarea
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        placeholder="Share your thoughts..."
                        rows={2}
                        className="text-sm resize-none"
                    />
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
                {onSkip && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onSkip}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        Skip
                    </Button>
                )}
                <Button
                    onClick={submitVote}
                    disabled={submitting}
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 ml-auto"
                >
                    {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            Vote
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

export default WidgetPollView;
