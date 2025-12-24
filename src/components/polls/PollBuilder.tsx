'use client';

/**
 * PollBuilder - Create and edit polls with AI option suggestions
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Plus,
    Trash2,
    Sparkles,
    GripVertical,
    Loader2,
    Save,
    Send,
    BarChart3,
    Calendar,
    Users
} from 'lucide-react';
import { toast } from 'sonner';
import type {
    PollType,
    CreatePollInput,
    CreatePollOptionInput,
    SuggestedPollOption
} from '@/types/polls';

interface PollBuilderProps {
    projectId: string;
    themeId?: string;
    initialData?: Partial<CreatePollInput>;
    onSave?: (pollId: string) => void;
    onCancel?: () => void;
}

export function PollBuilder({
    projectId,
    themeId,
    initialData,
    onSave,
    onCancel
}: PollBuilderProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [pollType, setPollType] = useState<PollType>(initialData?.poll_type || 'single_choice');
    const [options, setOptions] = useState<CreatePollOptionInput[]>(
        initialData?.options || [
            { option_text: '', description: '' },
            { option_text: '', description: '' }
        ]
    );
    const [closesAt, setClosesAt] = useState(initialData?.closes_at || '');
    const [allowAnonymous, setAllowAnonymous] = useState(initialData?.allow_anonymous ?? true);
    const [requireExplanation, setRequireExplanation] = useState(initialData?.require_explanation ?? false);
    const [showResultsBeforeVote, setShowResultsBeforeVote] = useState(initialData?.show_results_before_vote ?? false);

    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestedOptions, setSuggestedOptions] = useState<SuggestedPollOption[]>([]);

    // Add new option
    const addOption = () => {
        setOptions([...options, { option_text: '', description: '' }]);
    };

    // Remove option
    const removeOption = (index: number) => {
        if (options.length <= 2) {
            toast.error('Poll must have at least 2 options');
            return;
        }
        setOptions(options.filter((_, i) => i !== index));
    };

    // Update option
    const updateOption = (index: number, field: keyof CreatePollOptionInput, value: string) => {
        const newOptions = [...options];
        newOptions[index] = { ...newOptions[index], [field]: value };
        setOptions(newOptions);
    };

    // Generate AI suggestions
    const generateSuggestions = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch('/api/polls/suggest-options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: projectId,
                    theme_id: themeId,
                    context: description || title,
                    num_options: 5
                })
            });

            if (!res.ok) throw new Error('Failed to generate suggestions');

            const data = await res.json();
            setSuggestedOptions(data.options || []);

            if (data.suggested_title && !title) {
                setTitle(data.suggested_title);
            }
            if (data.suggested_description && !description) {
                setDescription(data.suggested_description);
            }

            toast.success(`Generated ${data.options?.length || 0} suggestions`);
        } catch (error) {
            toast.error('Failed to generate suggestions');
        } finally {
            setIsGenerating(false);
        }
    };

    // Use a suggestion
    const useSuggestion = (suggestion: SuggestedPollOption) => {
        // Find first empty slot or add new
        const emptyIndex = options.findIndex(o => !o.option_text.trim());
        if (emptyIndex >= 0) {
            updateOption(emptyIndex, 'option_text', suggestion.option_text);
            if (suggestion.description) {
                updateOption(emptyIndex, 'description', suggestion.description);
            }
        } else {
            setOptions([...options, {
                option_text: suggestion.option_text,
                description: suggestion.description,
                ai_generated: true,
                linked_feedback_ids: suggestion.supporting_feedback_ids
            }]);
        }

        // Remove from suggestions
        setSuggestedOptions(suggestedOptions.filter(s => s.option_text !== suggestion.option_text));
    };

    // Save poll
    const savePoll = async (publish: boolean = false) => {
        if (!title.trim()) {
            toast.error('Poll title is required');
            return;
        }

        const validOptions = options.filter(o => o.option_text.trim());
        if (validOptions.length < 2) {
            toast.error('Poll must have at least 2 options');
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/polls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    title: title.trim(),
                    description: description.trim() || null,
                    poll_type: pollType,
                    closes_at: closesAt || null,
                    allow_anonymous: allowAnonymous,
                    require_explanation: requireExplanation,
                    show_results_before_vote: showResultsBeforeVote,
                    related_theme_id: themeId,
                    options: validOptions.map((o, i) => ({
                        ...o,
                        display_order: i
                    }))
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save poll');
            }

            const data = await res.json();
            const pollId = data.poll.id;

            // Publish if requested
            if (publish) {
                const publishRes = await fetch(`/api/polls/${pollId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'active' })
                });

                if (!publishRes.ok) {
                    toast.warning('Poll saved but failed to publish');
                } else {
                    toast.success('Poll created and published!');
                }
            } else {
                toast.success('Poll saved as draft');
            }

            onSave?.(pollId);
        } catch (error: any) {
            toast.error(error.message || 'Failed to save poll');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                        <BarChart3 className="w-5 h-5 text-teal-400" />
                        Create Poll
                    </CardTitle>
                    <CardDescription>
                        Gather structured feedback from your users
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-white">Poll Question *</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What feature would you like us to prioritize?"
                            className="bg-slate-900 border-slate-600 text-white"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-white">Description (optional)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Provide context for your poll..."
                            rows={2}
                            className="bg-slate-900 border-slate-600 text-white"
                        />
                    </div>

                    {/* Poll Type */}
                    <div className="space-y-2">
                        <Label className="text-white">Poll Type</Label>
                        <Select value={pollType} onValueChange={(v) => setPollType(v as PollType)}>
                            <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="single_choice">Single Choice (Pick one)</SelectItem>
                                <SelectItem value="multiple_choice">Multiple Choice (Pick many)</SelectItem>
                                <SelectItem value="ranked">Ranked Choice (Order by preference)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Options */}
            <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-white text-lg">Poll Options</CardTitle>
                        <CardDescription>Add at least 2 options for voters to choose from</CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={generateSuggestions}
                        disabled={isGenerating}
                        className="border-teal-500 text-teal-400 hover:bg-teal-500/10"
                    >
                        {isGenerating ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        AI Suggest
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                    {options.map((option, index) => (
                        <div key={index} className="flex items-start gap-2 group">
                            <div className="pt-2.5 text-slate-500 cursor-move">
                                <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <Input
                                    value={option.option_text}
                                    onChange={(e) => updateOption(index, 'option_text', e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                    className="bg-slate-900 border-slate-600 text-white"
                                />
                                {option.description && (
                                    <p className="text-xs text-slate-400 px-2">{option.description}</p>
                                )}
                            </div>
                            {option.ai_generated && (
                                <Badge variant="outline" className="text-xs text-teal-400 border-teal-500/50 mt-2">
                                    AI
                                </Badge>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOption(index)}
                                className="text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={addOption}
                        className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Option
                    </Button>

                    {/* AI Suggestions */}
                    {suggestedOptions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <p className="text-sm text-slate-400 mb-2 flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-teal-400" />
                                AI Suggestions (click to add)
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {suggestedOptions.map((suggestion, index) => (
                                    <Button
                                        key={index}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => useSuggestion(suggestion)}
                                        className="text-xs border-slate-600 text-slate-300 hover:border-teal-500 hover:text-teal-400"
                                    >
                                        {suggestion.option_text}
                                        <span className="ml-1 text-slate-500">
                                            ({Math.round(suggestion.confidence * 100)}%)
                                        </span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Settings */}
            <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                    <CardTitle className="text-white text-lg">Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Close Date */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <Label className="text-white">Close Date (optional)</Label>
                        </div>
                        <Input
                            type="datetime-local"
                            value={closesAt}
                            onChange={(e) => setClosesAt(e.target.value)}
                            className="w-56 bg-slate-900 border-slate-600 text-white"
                        />
                    </div>

                    {/* Anonymous Voting */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <div>
                                <Label className="text-white">Allow Anonymous Voting</Label>
                                <p className="text-xs text-slate-400">Users can vote without logging in</p>
                            </div>
                        </div>
                        <Switch
                            checked={allowAnonymous}
                            onCheckedChange={setAllowAnonymous}
                        />
                    </div>

                    {/* Require Explanation */}
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-white">Require Explanation</Label>
                            <p className="text-xs text-slate-400">Voters must explain their choice</p>
                        </div>
                        <Switch
                            checked={requireExplanation}
                            onCheckedChange={setRequireExplanation}
                        />
                    </div>

                    {/* Show Results Before Vote */}
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-white">Show Results Before Voting</Label>
                            <p className="text-xs text-slate-400">Voters can see current results before deciding</p>
                        </div>
                        <Switch
                            checked={showResultsBeforeVote}
                            onCheckedChange={setShowResultsBeforeVote}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3">
                {onCancel && (
                    <Button variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
                <Button
                    variant="outline"
                    onClick={() => savePoll(false)}
                    disabled={isSaving}
                >
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                </Button>
                <Button
                    onClick={() => savePoll(true)}
                    disabled={isSaving}
                    className="bg-teal-600 hover:bg-teal-700"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4 mr-2" />
                    )}
                    Publish Poll
                </Button>
            </div>
        </div>
    );
}

export default PollBuilder;
