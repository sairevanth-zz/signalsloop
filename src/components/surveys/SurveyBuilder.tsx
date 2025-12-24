'use client';

/**
 * SurveyBuilder - Create and edit multi-question surveys
 * Supports drag-and-drop question reordering
 */

import React, { useState, useCallback } from 'react';
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
    GripVertical,
    Loader2,
    Save,
    Send,
    ClipboardList,
    Type,
    ListChecks,
    Star,
    Hash,
    ChevronUp,
    ChevronDown,
    Copy
} from 'lucide-react';
import { toast } from 'sonner';
import type {
    QuestionType,
    CreateSurveyInput,
    CreateSurveyQuestionInput
} from '@/types/polls';

interface SurveyBuilderProps {
    projectId: string;
    initialData?: Partial<CreateSurveyInput>;
    onSave?: (surveyId: string) => void;
    onCancel?: () => void;
}

const QUESTION_TYPES: { value: QuestionType; label: string; icon: React.ElementType }[] = [
    { value: 'text', label: 'Text Response', icon: Type },
    { value: 'single_select', label: 'Single Select', icon: ListChecks },
    { value: 'multi_select', label: 'Multiple Select', icon: ListChecks },
    { value: 'rating', label: 'Rating Scale', icon: Star },
    { value: 'nps', label: 'NPS (0-10)', icon: Hash },
];

const DEFAULT_QUESTION: CreateSurveyQuestionInput = {
    question_type: 'text',
    question_text: '',
    required: false,
    options: [],
};

export function SurveyBuilder({
    projectId,
    initialData,
    onSave,
    onCancel
}: SurveyBuilderProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [thankYouMessage, setThankYouMessage] = useState(
        initialData?.thank_you_message || 'Thank you for your feedback!'
    );
    const [closesAt, setClosesAt] = useState(initialData?.closes_at || '');
    const [allowAnonymous, setAllowAnonymous] = useState(initialData?.allow_anonymous ?? true);
    const [questions, setQuestions] = useState<CreateSurveyQuestionInput[]>(
        initialData?.questions || [{ ...DEFAULT_QUESTION }]
    );

    const [isSaving, setIsSaving] = useState(false);
    const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);

    // Add new question
    const addQuestion = (type: QuestionType = 'text') => {
        const newQuestion: CreateSurveyQuestionInput = {
            ...DEFAULT_QUESTION,
            question_type: type,
            options: type === 'single_select' || type === 'multi_select' ? ['Option 1', 'Option 2'] : undefined,
            min_value: type === 'rating' ? 1 : type === 'nps' ? 0 : undefined,
            max_value: type === 'rating' ? 5 : type === 'nps' ? 10 : undefined,
        };
        setQuestions([...questions, newQuestion]);
        setExpandedQuestion(questions.length);
    };

    // Remove question
    const removeQuestion = (index: number) => {
        if (questions.length <= 1) {
            toast.error('Survey must have at least 1 question');
            return;
        }
        setQuestions(questions.filter((_, i) => i !== index));
        setExpandedQuestion(null);
    };

    // Update question
    const updateQuestion = (index: number, updates: Partial<CreateSurveyQuestionInput>) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], ...updates };
        setQuestions(newQuestions);
    };

    // Move question up/down
    const moveQuestion = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= questions.length) return;

        const newQuestions = [...questions];
        [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
        setQuestions(newQuestions);
        setExpandedQuestion(newIndex);
    };

    // Duplicate question
    const duplicateQuestion = (index: number) => {
        const newQuestion = { ...questions[index] };
        const newQuestions = [...questions];
        newQuestions.splice(index + 1, 0, newQuestion);
        setQuestions(newQuestions);
        setExpandedQuestion(index + 1);
    };

    // Update option for select questions
    const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
        const question = questions[questionIndex];
        if (!question.options) return;

        const newOptions = [...question.options];
        newOptions[optionIndex] = value;
        updateQuestion(questionIndex, { options: newOptions });
    };

    // Add option to select question
    const addOption = (questionIndex: number) => {
        const question = questions[questionIndex];
        const options = question.options || [];
        updateQuestion(questionIndex, {
            options: [...options, `Option ${options.length + 1}`]
        });
    };

    // Remove option from select question
    const removeOption = (questionIndex: number, optionIndex: number) => {
        const question = questions[questionIndex];
        if (!question.options || question.options.length <= 2) {
            toast.error('Must have at least 2 options');
            return;
        }
        updateQuestion(questionIndex, {
            options: question.options.filter((_, i) => i !== optionIndex)
        });
    };

    // Save survey
    const saveSurvey = async (publish: boolean = false) => {
        if (!title.trim()) {
            toast.error('Survey title is required');
            return;
        }

        const validQuestions = questions.filter(q => q.question_text.trim());
        if (validQuestions.length === 0) {
            toast.error('Survey must have at least 1 question');
            return;
        }

        // Validate select questions have options
        for (const q of validQuestions) {
            if ((q.question_type === 'single_select' || q.question_type === 'multi_select')
                && (!q.options || q.options.length < 2)) {
                toast.error('Select questions must have at least 2 options');
                return;
            }
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/surveys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    title: title.trim(),
                    description: description.trim() || null,
                    thank_you_message: thankYouMessage,
                    closes_at: closesAt || null,
                    allow_anonymous: allowAnonymous,
                    questions: validQuestions
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save survey');
            }

            const data = await res.json();
            const surveyId = data.survey.id;

            // Publish if requested
            if (publish) {
                const publishRes = await fetch(`/api/surveys/${surveyId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'active' })
                });

                if (!publishRes.ok) {
                    toast.warning('Survey saved but failed to publish');
                } else {
                    toast.success('Survey created and published!');
                }
            } else {
                toast.success('Survey saved as draft');
            }

            onSave?.(surveyId);
        } catch (error: any) {
            toast.error(error.message || 'Failed to save survey');
        } finally {
            setIsSaving(false);
        }
    };

    const getQuestionIcon = (type: QuestionType) => {
        const config = QUESTION_TYPES.find(t => t.value === type);
        return config?.icon || Type;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <ClipboardList className="w-5 h-5 text-teal-500" />
                        Create Survey
                    </CardTitle>
                    <CardDescription>
                        Build a multi-question survey to gather detailed feedback
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-foreground">Survey Title *</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Customer Satisfaction Survey"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-foreground">Description (optional)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Help us improve our product by sharing your feedback..."
                            rows={2}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Questions */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-foreground text-lg">Questions</CardTitle>
                            <CardDescription>Add and configure your survey questions</CardDescription>
                        </div>
                        <Badge variant="outline">
                            {questions.length} question{questions.length !== 1 ? 's' : ''}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {questions.map((question, index) => {
                        const QuestionIcon = getQuestionIcon(question.question_type);
                        const isExpanded = expandedQuestion === index;

                        return (
                            <div
                                key={index}
                                className="border rounded-lg overflow-hidden"
                            >
                                {/* Question Header */}
                                <div
                                    className={`flex items-center gap-2 p-3 cursor-pointer transition-colors ${isExpanded ? 'bg-muted' : 'bg-muted/50 hover:bg-muted'
                                        }`}
                                    onClick={() => setExpandedQuestion(isExpanded ? null : index)}
                                >
                                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                                    <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-500 text-sm font-medium flex items-center justify-center">
                                        {index + 1}
                                    </span>
                                    <QuestionIcon className="w-4 h-4 text-muted-foreground" />
                                    <span className="flex-1 text-foreground truncate">
                                        {question.question_text || 'Untitled Question'}
                                    </span>
                                    {question.required && (
                                        <Badge variant="outline" className="text-xs text-red-500 border-red-500/50">
                                            Required
                                        </Badge>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); moveQuestion(index, 'up'); }}
                                            disabled={index === 0}
                                            className="text-muted-foreground hover:text-foreground p-1 h-auto"
                                        >
                                            <ChevronUp className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); moveQuestion(index, 'down'); }}
                                            disabled={index === questions.length - 1}
                                            className="text-muted-foreground hover:text-foreground p-1 h-auto"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Question Editor */}
                                {isExpanded && (
                                    <div className="p-4 bg-muted/50 space-y-4 border-t">
                                        {/* Question Type */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-foreground">Question Type</Label>
                                                <Select
                                                    value={question.question_type}
                                                    onValueChange={(v) => updateQuestion(index, {
                                                        question_type: v as QuestionType,
                                                        options: (v === 'single_select' || v === 'multi_select')
                                                            ? ['Option 1', 'Option 2']
                                                            : undefined,
                                                        min_value: v === 'rating' ? 1 : v === 'nps' ? 0 : undefined,
                                                        max_value: v === 'rating' ? 5 : v === 'nps' ? 10 : undefined,
                                                    })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {QUESTION_TYPES.map(type => (
                                                            <SelectItem key={type.value} value={type.value}>
                                                                <div className="flex items-center gap-2">
                                                                    <type.icon className="w-4 h-4" />
                                                                    {type.label}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={question.required}
                                                        onCheckedChange={(v) => updateQuestion(index, { required: v })}
                                                    />
                                                    <Label className="text-foreground">Required</Label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Question Text */}
                                        <div className="space-y-2">
                                            <Label className="text-foreground">Question Text *</Label>
                                            <Input
                                                value={question.question_text}
                                                onChange={(e) => updateQuestion(index, { question_text: e.target.value })}
                                                placeholder="Enter your question..."
                                            />
                                        </div>

                                        {/* Options for Select Types */}
                                        {(question.question_type === 'single_select' || question.question_type === 'multi_select') && (
                                            <div className="space-y-2">
                                                <Label className="text-foreground">Options</Label>
                                                <div className="space-y-2">
                                                    {(question.options || []).map((option, optIndex) => (
                                                        <div key={optIndex} className="flex items-center gap-2">
                                                            <Input
                                                                value={option}
                                                                onChange={(e) => updateOption(index, optIndex, e.target.value)}
                                                                placeholder={`Option ${optIndex + 1}`}
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeOption(index, optIndex)}
                                                                className="text-muted-foreground hover:text-red-500"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addOption(index)}
                                                        className="w-full border-dashed"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Add Option
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Rating Scale Config */}
                                        {question.question_type === 'rating' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-foreground">Min Label (optional)</Label>
                                                    <Input
                                                        value={question.min_label || ''}
                                                        onChange={(e) => updateQuestion(index, { min_label: e.target.value })}
                                                        placeholder="Not satisfied"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-foreground">Max Label (optional)</Label>
                                                    <Input
                                                        value={question.max_label || ''}
                                                        onChange={(e) => updateQuestion(index, { max_label: e.target.value })}
                                                        placeholder="Very satisfied"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => duplicateQuestion(index)}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                <Copy className="w-4 h-4 mr-2" />
                                                Duplicate
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeQuestion(index)}
                                                className="text-red-500 hover:text-red-400"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Add Question */}
                    <div className="pt-2">
                        <p className="text-sm text-muted-foreground mb-2">Add Question</p>
                        <div className="flex flex-wrap gap-2">
                            {QUESTION_TYPES.map(type => (
                                <Button
                                    key={type.value}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addQuestion(type.value)}
                                    className="hover:border-teal-500 hover:text-teal-500"
                                >
                                    <type.icon className="w-4 h-4 mr-2" />
                                    {type.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-foreground text-lg">Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Thank You Message */}
                    <div className="space-y-2">
                        <Label className="text-foreground">Thank You Message</Label>
                        <Textarea
                            value={thankYouMessage}
                            onChange={(e) => setThankYouMessage(e.target.value)}
                            placeholder="Thank you for your feedback!"
                            rows={2}
                        />
                    </div>

                    {/* Close Date */}
                    <div className="flex items-center justify-between">
                        <Label className="text-foreground">Close Date (optional)</Label>
                        <Input
                            type="datetime-local"
                            value={closesAt}
                            onChange={(e) => setClosesAt(e.target.value)}
                            className="w-56"
                        />
                    </div>

                    {/* Anonymous */}
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-foreground">Allow Anonymous Responses</Label>
                            <p className="text-xs text-muted-foreground">Users can respond without logging in</p>
                        </div>
                        <Switch
                            checked={allowAnonymous}
                            onCheckedChange={setAllowAnonymous}
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
                    onClick={() => saveSurvey(false)}
                    disabled={isSaving}
                >
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                </Button>
                <Button
                    onClick={() => saveSurvey(true)}
                    disabled={isSaving}
                    className="bg-teal-600 hover:bg-teal-700"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4 mr-2" />
                    )}
                    Publish Survey
                </Button>
            </div>
        </div>
    );
}

export default SurveyBuilder;
