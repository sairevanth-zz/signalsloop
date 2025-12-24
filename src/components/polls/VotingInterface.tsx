'use client';

/**
 * VotingInterface - Clean voting UI for polls
 * Used in widget and standalone pages
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Vote,
    Loader2,
    CheckCircle,
    AlertCircle,
    GripVertical,
    BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import type { PollWithOptions, PollOption, SubmitVoteInput } from '@/types/polls';

interface VotingInterfaceProps {
    pollId: string;
    poll?: PollWithOptions;
    onVoteComplete?: () => void;
    showResults?: boolean;
    embedded?: boolean;
    projectSlug?: string;
}

export function VotingInterface({
    pollId,
    poll: initialPoll,
    onVoteComplete,
    showResults = false,
    embedded = false,
    projectSlug
}: VotingInterfaceProps) {
    const [poll, setPoll] = useState<PollWithOptions | null>(initialPoll || null);
    const [loading, setLoading] = useState(!initialPoll);
    const [submitting, setSubmitting] = useState(false);
    const [voted, setVoted] = useState(false);
    const [error, setError] = useState('');

    // Vote state
    const [selectedOption, setSelectedOption] = useState<string>('');
    const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
    const [rankedOptions, setRankedOptions] = useState<string[]>([]);
    const [explanation, setExplanation] = useState('');
    const [voterEmail, setVoterEmail] = useState('');

    // Load poll if not provided
    useEffect(() => {
        if (!initialPoll) {
            loadPoll();
        }
    }, [pollId]);

    const loadPoll = async () => {
        try {
            const res = await fetch(`/api/polls/${pollId}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load poll');
            const data = await res.json();
            setPoll(data.poll);

            // Initialize ranked options
            if (data.poll?.poll_type === 'ranked') {
                setRankedOptions(data.poll.options.map((o: PollOption) => o.id));
            }
        } catch (err) {
            setError('Failed to load poll');
        } finally {
            setLoading(false);
        }
    };

    const submitVote = async () => {
        if (!poll) return;

        // Validation
        if (poll.poll_type === 'single_choice' && !selectedOption) {
            toast.error('Please select an option');
            return;
        }
        if (poll.poll_type === 'multiple_choice' && selectedOptions.size === 0) {
            toast.error('Please select at least one option');
            return;
        }
        if (poll.require_explanation && !explanation.trim()) {
            toast.error('Please explain your choice');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const voteInput: SubmitVoteInput = {
                option_id: selectedOption,
                voter_email: voterEmail || undefined,
                explanation: explanation || undefined
            };

            if (poll.poll_type === 'multiple_choice') {
                voteInput.option_ids = Array.from(selectedOptions);
            }

            if (poll.poll_type === 'ranked') {
                voteInput.ranked_options = rankedOptions.map((optId, idx) => ({
                    option_id: optId,
                    rank: idx + 1
                }));
            }

            const res = await fetch(`/api/polls/${pollId}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(voteInput)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit vote');
            }

            setVoted(true);
            toast.success('Vote submitted!');
            onVoteComplete?.();

        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setSubmitting(false);
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

    const moveRankedOption = (fromIndex: number, toIndex: number) => {
        const newOrder = [...rankedOptions];
        const [removed] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, removed);
        setRankedOptions(newOrder);
    };

    if (loading) {
        return (
            <Card className={embedded ? 'border-0 shadow-none' : ''}>
                <CardContent className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-500" />
                    <p className="mt-2 text-muted-foreground">Loading poll...</p>
                </CardContent>
            </Card>
        );
    }

    if (error && !poll) {
        return (
            <Card className={embedded ? 'border-0 shadow-none' : ''}>
                <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
                    <p className="mt-2 text-muted-foreground">{error}</p>
                </CardContent>
            </Card>
        );
    }

    if (!poll) return null;

    // Success state
    if (voted) {
        return (
            <Card className={embedded ? 'border-0 shadow-none' : ''}>
                <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-teal-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Thank you!</h3>
                    <p className="text-muted-foreground">Your vote has been recorded.</p>
                    {showResults && projectSlug && (
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => window.location.href = `/${projectSlug}/polls/${pollId}`}
                        >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Results
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

    const sortedOptions = [...(poll.options || [])].sort((a, b) => a.display_order - b.display_order);

    return (
        <Card className={embedded ? 'border-0 shadow-none' : ''}>
            <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                    <Vote className="w-5 h-5 text-teal-500" />
                    {poll.title}
                </CardTitle>
                {poll.description && (
                    <CardDescription>
                        {poll.description}
                    </CardDescription>
                )}
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Single Choice */}
                {poll.poll_type === 'single_choice' && (
                    <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
                        {sortedOptions.map((option) => (
                            <div
                                key={option.id}
                                className="flex items-center space-x-3 p-3 rounded-lg border hover:border-teal-500/50 transition-colors cursor-pointer"
                                onClick={() => setSelectedOption(option.id)}
                            >
                                <RadioGroupItem value={option.id} id={option.id} />
                                <Label htmlFor={option.id} className="flex-1 cursor-pointer text-foreground">
                                    {option.option_text}
                                    {option.description && (
                                        <span className="block text-xs text-muted-foreground mt-0.5">
                                            {option.description}
                                        </span>
                                    )}
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
                                className="flex items-center space-x-3 p-3 rounded-lg border hover:border-teal-500/50 transition-colors cursor-pointer"
                                onClick={() => toggleMultiOption(option.id)}
                            >
                                <Checkbox
                                    checked={selectedOptions.has(option.id)}
                                    onCheckedChange={() => toggleMultiOption(option.id)}
                                />
                                <Label className="flex-1 cursor-pointer text-foreground">
                                    {option.option_text}
                                    {option.description && (
                                        <span className="block text-xs text-muted-foreground mt-0.5">
                                            {option.description}
                                        </span>
                                    )}
                                </Label>
                            </div>
                        ))}
                    </div>
                )}

                {/* Ranked Choice */}
                {poll.poll_type === 'ranked' && (
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground mb-2">Drag to reorder by preference (top = most preferred)</p>
                        {rankedOptions.map((optionId, index) => {
                            const option = sortedOptions.find(o => o.id === optionId);
                            if (!option) return null;
                            return (
                                <div
                                    key={option.id}
                                    className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/50"
                                >
                                    <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 text-sm font-medium flex items-center justify-center">
                                        {index + 1}
                                    </span>
                                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                                    <span className="flex-1 text-foreground">{option.option_text}</span>
                                    <div className="flex gap-1">
                                        {index > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => moveRankedOption(index, index - 1)}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                ↑
                                            </Button>
                                        )}
                                        {index < rankedOptions.length - 1 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => moveRankedOption(index, index + 1)}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                ↓
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Explanation */}
                {poll.require_explanation && (
                    <div className="space-y-2 pt-4 border-t">
                        <Label>
                            Explain your choice {poll.require_explanation ? '*' : '(optional)'}
                        </Label>
                        <Textarea
                            value={explanation}
                            onChange={(e) => setExplanation(e.target.value)}
                            placeholder="Why did you choose this option?"
                            rows={3}
                        />
                    </div>
                )}

                {/* Anonymous email collection */}
                {poll.allow_anonymous && (
                    <div className="space-y-2 pt-4 border-t">
                        <Label>Email (optional)</Label>
                        <Input
                            type="email"
                            value={voterEmail}
                            onChange={(e) => setVoterEmail(e.target.value)}
                            placeholder="your@email.com"
                        />
                        <p className="text-xs text-muted-foreground">
                            Provide your email to be notified about results
                        </p>
                    </div>
                )}

                {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/50 text-destructive text-sm">
                        {error}
                    </div>
                )}
            </CardContent>

            <CardFooter>
                <Button
                    onClick={submitVote}
                    disabled={submitting}
                    className="w-full bg-teal-600 hover:bg-teal-700"
                >
                    {submitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Vote className="w-4 h-4 mr-2" />
                    )}
                    Submit Vote
                </Button>
            </CardFooter>
        </Card>
    );
}

export default VotingInterface;
