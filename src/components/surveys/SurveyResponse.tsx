'use client';

/**
 * SurveyResponse - Clean survey response interface
 * Supports all question types with validation
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
    ClipboardList,
    Loader2,
    CheckCircle,
    AlertCircle,
    Star,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import type { SurveyWithQuestions, SurveyQuestion } from '@/types/polls';

interface SurveyResponseProps {
    surveyId: string;
    survey?: SurveyWithQuestions;
    onComplete?: () => void;
    embedded?: boolean;
}

export function SurveyResponse({
    surveyId,
    survey: initialSurvey,
    onComplete,
    embedded = false
}: SurveyResponseProps) {
    const [survey, setSurvey] = useState<SurveyWithQuestions | null>(initialSurvey || null);
    const [loading, setLoading] = useState(!initialSurvey);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [thankYouMessage, setThankYouMessage] = useState('');
    const [error, setError] = useState('');

    // Response state
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [respondentEmail, setRespondentEmail] = useState('');

    // Load survey if not provided
    useEffect(() => {
        if (!initialSurvey) {
            loadSurvey();
        }
    }, [surveyId]);

    const loadSurvey = async () => {
        try {
            const res = await fetch(`/api/surveys/${surveyId}`);
            if (!res.ok) throw new Error('Failed to load survey');
            const data = await res.json();
            setSurvey(data.survey);
        } catch (err) {
            setError('Failed to load survey');
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
            toast.error('This question is required');
            return false;
        }
        if (Array.isArray(answer) && answer.length === 0) {
            toast.error('Please select at least one option');
            return false;
        }
        return true;
    };

    const goToNext = () => {
        if (!validateCurrentQuestion()) return;

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const goToPrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const submitResponse = async () => {
        if (!validateCurrentQuestion()) return;

        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/surveys/${surveyId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answers,
                    respondent_email: respondentEmail || undefined
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit response');
            }

            setThankYouMessage(data.thank_you_message || 'Thank you for your response!');
            setSubmitted(true);
            toast.success('Response submitted!');
            onComplete?.();

        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Card className={embedded ? 'border-0 shadow-none' : 'border-slate-700 bg-slate-800/50'}>
                <CardContent className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-400" />
                    <p className="mt-2 text-slate-400">Loading survey...</p>
                </CardContent>
            </Card>
        );
    }

    if (error && !survey) {
        return (
            <Card className={embedded ? 'border-0 shadow-none' : 'border-slate-700 bg-slate-800/50'}>
                <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-red-400" />
                    <p className="mt-2 text-slate-400">{error}</p>
                </CardContent>
            </Card>
        );
    }

    if (!survey) return null;

    // Success state
    if (submitted) {
        return (
            <Card className={embedded ? 'border-0 shadow-none bg-slate-900' : 'border-slate-700 bg-slate-800/50'}>
                <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-teal-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Thank you!</h3>
                    <p className="text-slate-400">{thankYouMessage}</p>
                </CardContent>
            </Card>
        );
    }

    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    return (
        <Card className={embedded ? 'border-0 shadow-none bg-slate-900' : 'border-slate-700 bg-slate-800/50'}>
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-teal-400" />
                    {survey.title}
                </CardTitle>
                {survey.description && (
                    <CardDescription className="text-slate-400">
                        {survey.description}
                    </CardDescription>
                )}
                {/* Progress */}
                <div className="pt-4">
                    <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                        <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {currentQuestion && (
                    <div className="space-y-4">
                        {/* Question */}
                        <div>
                            <Label className="text-lg text-white">
                                {currentQuestion.question_text}
                                {currentQuestion.required && (
                                    <span className="text-red-400 ml-1">*</span>
                                )}
                            </Label>
                        </div>

                        {/* Text Response */}
                        {currentQuestion.question_type === 'text' && (
                            <Textarea
                                value={answers[currentQuestion.id] || ''}
                                onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)}
                                placeholder="Type your response..."
                                rows={4}
                                className="bg-slate-900 border-slate-600 text-white"
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
                                        className="flex items-center space-x-3 p-3 rounded-lg border border-slate-700 hover:border-teal-500/50 transition-colors cursor-pointer"
                                        onClick={() => updateAnswer(currentQuestion.id, option)}
                                    >
                                        <RadioGroupItem value={option} id={`${currentQuestion.id}-${i}`} />
                                        <Label htmlFor={`${currentQuestion.id}-${i}`} className="flex-1 cursor-pointer text-white">
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
                                        className="flex items-center space-x-3 p-3 rounded-lg border border-slate-700 hover:border-teal-500/50 transition-colors cursor-pointer"
                                        onClick={() => toggleMultiSelect(currentQuestion.id, option)}
                                    >
                                        <Checkbox
                                            checked={(answers[currentQuestion.id] || []).includes(option)}
                                            onCheckedChange={() => toggleMultiSelect(currentQuestion.id, option)}
                                        />
                                        <Label className="flex-1 cursor-pointer text-white">
                                            {option}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Rating */}
                        {currentQuestion.question_type === 'rating' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-center gap-2">
                                    {Array.from({ length: (currentQuestion.max_value || 5) - (currentQuestion.min_value || 1) + 1 }, (_, i) => {
                                        const value = (currentQuestion.min_value || 1) + i;
                                        const isSelected = answers[currentQuestion.id] === value;
                                        return (
                                            <Button
                                                key={value}
                                                variant={isSelected ? 'default' : 'outline'}
                                                size="lg"
                                                onClick={() => updateAnswer(currentQuestion.id, value)}
                                                className={isSelected
                                                    ? 'bg-teal-600 hover:bg-teal-700 border-teal-600'
                                                    : 'border-slate-600 text-slate-300 hover:border-teal-500'
                                                }
                                            >
                                                <Star className={`w-5 h-5 mr-1 ${isSelected ? 'fill-current' : ''}`} />
                                                {value}
                                            </Button>
                                        );
                                    })}
                                </div>
                                {(currentQuestion.min_label || currentQuestion.max_label) && (
                                    <div className="flex justify-between text-xs text-slate-400 px-2">
                                        <span>{currentQuestion.min_label || ''}</span>
                                        <span>{currentQuestion.max_label || ''}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* NPS */}
                        {currentQuestion.question_type === 'nps' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                    {Array.from({ length: 11 }, (_, i) => {
                                        const isSelected = answers[currentQuestion.id] === i;
                                        let colorClass = 'border-slate-600 text-slate-300 hover:border-slate-400';
                                        if (isSelected) {
                                            if (i <= 6) colorClass = 'bg-red-600 border-red-600 text-white';
                                            else if (i <= 8) colorClass = 'bg-amber-600 border-amber-600 text-white';
                                            else colorClass = 'bg-teal-600 border-teal-600 text-white';
                                        }
                                        return (
                                            <Button
                                                key={i}
                                                variant={isSelected ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => updateAnswer(currentQuestion.id, i)}
                                                className={`w-10 h-10 p-0 ${colorClass}`}
                                            >
                                                {i}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between text-xs text-slate-400 px-2">
                                    <span>Not at all likely</span>
                                    <span>Extremely likely</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Email for last question */}
                {isLastQuestion && survey.allow_anonymous && (
                    <div className="space-y-2 pt-4 border-t border-slate-700">
                        <Label className="text-white">Email (optional)</Label>
                        <Input
                            type="email"
                            value={respondentEmail}
                            onChange={(e) => setRespondentEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="bg-slate-900 border-slate-600 text-white"
                        />
                        <p className="text-xs text-slate-500">
                            Provide your email to receive updates about the results
                        </p>
                    </div>
                )}

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
                        {error}
                    </div>
                )}
            </CardContent>

            <CardFooter className="flex justify-between">
                <Button
                    variant="ghost"
                    onClick={goToPrevious}
                    disabled={currentQuestionIndex === 0}
                    className="text-slate-400"
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                </Button>

                {isLastQuestion ? (
                    <Button
                        onClick={submitResponse}
                        disabled={submitting}
                        className="bg-teal-600 hover:bg-teal-700"
                    >
                        {submitting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Submit
                    </Button>
                ) : (
                    <Button
                        onClick={goToNext}
                        className="bg-teal-600 hover:bg-teal-700"
                    >
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

export default SurveyResponse;
