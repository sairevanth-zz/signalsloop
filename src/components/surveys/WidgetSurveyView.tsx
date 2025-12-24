'use client';

/**
 * WidgetSurveyView - Embedded survey display for the feedback widget
 * Compact version of SurveyResponse for widget context
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
    ClipboardList,
    Loader2,
    CheckCircle,
    ChevronRight,
    ChevronLeft,
    AlertCircle,
    Star
} from 'lucide-react';
import type { SurveyWithQuestions, SurveyQuestion } from '@/types/polls';

interface WidgetSurveyViewProps {
    projectId: string;
    onComplete?: () => void;
    onSkip?: () => void;
}

export function WidgetSurveyView({
    projectId,
    onComplete,
    onSkip
}: WidgetSurveyViewProps) {
    const [survey, setSurvey] = useState<SurveyWithQuestions | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    // Response state
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // Load active survey for project
    useEffect(() => {
        loadActiveSurvey();
    }, [projectId]);

    const loadActiveSurvey = async () => {
        try {
            const res = await fetch(`/api/surveys?projectId=${projectId}&status=active&limit=1`);
            if (!res.ok) throw new Error('Failed to load survey');
            const data = await res.json();

            if (data.surveys && data.surveys.length > 0) {
                setSurvey(data.surveys[0]);
            }
        } catch (err) {
            console.error('Failed to load survey:', err);
        } finally {
            setLoading(false);
        }
    };

    const questions = survey?.questions || [];
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    const updateAnswer = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const toggleMultiSelect = (questionId: string, option: string) => {
        const current = answers[questionId] || [];
        const updated = current.includes(option)
            ? current.filter((o: string) => o !== option)
            : [...current, option];
        updateAnswer(questionId, updated);
    };

    const validateCurrentQuestion = (): boolean => {
        if (!currentQuestion) return true;
        if (!currentQuestion.required) return true;

        const answer = answers[currentQuestion.id];
        if (answer === undefined || answer === null || answer === '') {
            setError('This question is required');
            return false;
        }
        return true;
    };

    const goToNext = () => {
        setError('');
        if (!validateCurrentQuestion()) return;

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const goToPrevious = () => {
        setError('');
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const submitResponse = async () => {
        if (!validateCurrentQuestion()) return;
        if (!survey) return;

        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/surveys/${survey.id}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to submit response');
            }

            setSubmitted(true);
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

    // No active surveys
    if (!survey) {
        return null;
    }

    // Success state
    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Thank you!</h3>
                <p className="text-sm text-slate-500 mt-1">{survey.thank_you_message}</p>
            </div>
        );
    }

    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="w-4 h-4 text-teal-500" />
                    <span className="text-xs font-medium text-teal-600 uppercase tracking-wide">
                        Survey
                    </span>
                </div>
                <h3 className="font-semibold text-slate-900">{survey.title}</h3>
                {/* Progress */}
                <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Question {currentQuestionIndex + 1}/{questions.length}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1" />
                </div>
            </div>

            {/* Current Question */}
            {currentQuestion && (
                <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-700">
                        {currentQuestion.question_text}
                        {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>

                    {/* Text Response */}
                    {currentQuestion.question_type === 'text' && (
                        <Textarea
                            value={answers[currentQuestion.id] || ''}
                            onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)}
                            placeholder="Type your response..."
                            rows={3}
                            className="text-sm resize-none"
                        />
                    )}

                    {/* Single Select */}
                    {currentQuestion.question_type === 'single_select' && (
                        <RadioGroup
                            value={answers[currentQuestion.id] || ''}
                            onValueChange={(v) => updateAnswer(currentQuestion.id, v)}
                        >
                            {(currentQuestion.options || []).map((option, i) => (
                                <div
                                    key={i}
                                    className="flex items-center space-x-2 p-2 rounded-lg border border-slate-200 hover:border-teal-300"
                                    onClick={() => updateAnswer(currentQuestion.id, option)}
                                >
                                    <RadioGroupItem value={option} id={`sq-${currentQuestion.id}-${i}`} />
                                    <Label htmlFor={`sq-${currentQuestion.id}-${i}`} className="flex-1 cursor-pointer text-sm">
                                        {option}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    )}

                    {/* Multi Select */}
                    {currentQuestion.question_type === 'multi_select' && (
                        <div className="space-y-2">
                            {(currentQuestion.options || []).map((option, i) => (
                                <div
                                    key={i}
                                    className="flex items-center space-x-2 p-2 rounded-lg border border-slate-200 hover:border-teal-300"
                                    onClick={() => toggleMultiSelect(currentQuestion.id, option)}
                                >
                                    <Checkbox
                                        checked={(answers[currentQuestion.id] || []).includes(option)}
                                    />
                                    <Label className="flex-1 cursor-pointer text-sm">
                                        {option}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Rating */}
                    {currentQuestion.question_type === 'rating' && (
                        <div className="flex items-center justify-center gap-1">
                            {Array.from({ length: (currentQuestion.max_value || 5) - (currentQuestion.min_value || 1) + 1 }, (_, i) => {
                                const value = (currentQuestion.min_value || 1) + i;
                                const isSelected = answers[currentQuestion.id] === value;
                                return (
                                    <Button
                                        key={value}
                                        variant={isSelected ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => updateAnswer(currentQuestion.id, value)}
                                        className={isSelected ? 'bg-teal-600' : ''}
                                    >
                                        <Star className={`w-4 h-4 ${isSelected ? 'fill-current' : ''}`} />
                                        {value}
                                    </Button>
                                );
                            })}
                        </div>
                    )}

                    {/* NPS */}
                    {currentQuestion.question_type === 'nps' && (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                            {Array.from({ length: 11 }, (_, i) => {
                                const isSelected = answers[currentQuestion.id] === i;
                                return (
                                    <Button
                                        key={i}
                                        variant={isSelected ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => updateAnswer(currentQuestion.id, i)}
                                        className={`w-8 h-8 p-0 ${isSelected ? 'bg-teal-600' : ''}`}
                                    >
                                        {i}
                                    </Button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={goToPrevious}
                        disabled={currentQuestionIndex === 0}
                        className="text-slate-400"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
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
                </div>

                {isLastQuestion ? (
                    <Button
                        onClick={submitResponse}
                        disabled={submitting}
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700"
                    >
                        {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                Submit
                                <CheckCircle className="w-4 h-4 ml-1" />
                            </>
                        )}
                    </Button>
                ) : (
                    <Button
                        onClick={goToNext}
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700"
                    >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                )}
            </div>
        </div>
    );
}

export default WidgetSurveyView;
