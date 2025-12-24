'use client';

/**
 * SurveyResults - Analysis dashboard for survey responses
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ClipboardList,
    Users,
    Loader2,
    AlertCircle,
    MessageSquare,
    BarChart3,
    Star,
    TrendingUp,
    Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    Legend
} from 'recharts';
import type { SurveyAnalysis, QuestionSummary, ThemeSummary } from '@/types/polls';

interface SurveyResultsProps {
    surveyId: string;
}

const CHART_COLORS = [
    '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

export function SurveyResults({ surveyId }: SurveyResultsProps) {
    const [analysis, setAnalysis] = useState<SurveyAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        analyzeResponses();
    }, [surveyId]);

    const analyzeResponses = async () => {
        try {
            const res = await fetch('/api/surveys/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ surveyId })
            });

            if (!res.ok) throw new Error('Failed to analyze survey');

            const data = await res.json();
            setAnalysis(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="border-slate-700 bg-slate-800/50">
                <CardContent className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-400" />
                    <p className="mt-2 text-slate-400">Analyzing responses...</p>
                </CardContent>
            </Card>
        );
    }

    if (error || !analysis) {
        return (
            <Card className="border-slate-700 bg-slate-800/50">
                <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-red-400" />
                    <p className="mt-2 text-slate-400">{error || 'Failed to load analysis'}</p>
                </CardContent>
            </Card>
        );
    }

    const { survey, question_summaries, detected_themes, response_count, avg_sentiment } = analysis;

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-white flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-teal-400" />
                                {survey.title}
                            </CardTitle>
                            {survey.description && (
                                <CardDescription className="mt-1">{survey.description}</CardDescription>
                            )}
                        </div>
                        <Badge
                            variant={survey.status === 'active' ? 'default' : 'secondary'}
                            className={survey.status === 'active' ? 'bg-teal-500' : ''}
                        >
                            {survey.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Stats Row */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="text-center p-4 rounded-lg bg-slate-900/50">
                            <Users className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                            <p className="text-2xl font-bold text-white">{response_count}</p>
                            <p className="text-xs text-slate-400">Responses</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-slate-900/50">
                            <BarChart3 className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                            <p className="text-2xl font-bold text-white">{question_summaries.length}</p>
                            <p className="text-xs text-slate-400">Questions</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-slate-900/50">
                            <TrendingUp className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                            <p className="text-2xl font-bold text-white">
                                {(analysis.completion_rate * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-slate-400">Completion Rate</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-slate-900/50">
                            <Star className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                            <p className={`text-2xl font-bold ${avg_sentiment > 0.2 ? 'text-green-400' :
                                    avg_sentiment < -0.2 ? 'text-red-400' : 'text-yellow-400'
                                }`}>
                                {avg_sentiment > 0.2 ? 'Positive' : avg_sentiment < -0.2 ? 'Negative' : 'Neutral'}
                            </p>
                            <p className="text-xs text-slate-400">Avg Sentiment</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            <Tabs defaultValue="questions" className="space-y-4">
                <TabsList className="bg-slate-800">
                    <TabsTrigger value="questions">Question Analysis</TabsTrigger>
                    {detected_themes.length > 0 && (
                        <TabsTrigger value="themes">Detected Themes</TabsTrigger>
                    )}
                </TabsList>

                {/* Question Analysis */}
                <TabsContent value="questions" className="space-y-4">
                    {question_summaries.map((summary, index) => (
                        <QuestionAnalysisCard key={summary.question_id} summary={summary} index={index} />
                    ))}
                </TabsContent>

                {/* Themes */}
                {detected_themes.length > 0 && (
                    <TabsContent value="themes">
                        <Card className="border-slate-700 bg-slate-800/50">
                            <CardHeader>
                                <CardTitle className="text-white text-lg flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-teal-400" />
                                    Detected Themes
                                </CardTitle>
                                <CardDescription>
                                    AI-identified patterns from text responses
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {detected_themes.map((theme, index) => (
                                    <div
                                        key={index}
                                        className="p-4 rounded-lg bg-slate-900/50 border border-slate-700"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-medium">{theme.theme}</span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    ~{theme.count} mentions
                                                </Badge>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs ${theme.sentiment_avg > 0.2 ? 'text-green-400' :
                                                            theme.sentiment_avg < -0.2 ? 'text-red-400' : 'text-yellow-400'
                                                        }`}
                                                >
                                                    {theme.sentiment_avg > 0.2 ? 'Positive' :
                                                        theme.sentiment_avg < -0.2 ? 'Negative' : 'Neutral'}
                                                </Badge>
                                            </div>
                                        </div>
                                        {theme.sample_quotes && theme.sample_quotes.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {theme.sample_quotes.slice(0, 2).map((quote, i) => (
                                                    <p key={i} className="text-sm text-slate-400 italic">
                                                        "{quote}"
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}

function QuestionAnalysisCard({ summary, index }: { summary: QuestionSummary; index: number }) {
    const getQuestionTypeLabel = (type: string) => {
        switch (type) {
            case 'text': return 'Text Response';
            case 'single_select': return 'Single Select';
            case 'multi_select': return 'Multi Select';
            case 'rating': return 'Rating';
            case 'nps': return 'NPS';
            default: return type;
        }
    };

    return (
        <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-sm font-medium flex items-center justify-center">
                        {index + 1}
                    </span>
                    <CardTitle className="text-white text-base flex-1">
                        {summary.question_text}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs text-slate-400">
                        {getQuestionTypeLabel(summary.question_type)}
                    </Badge>
                </div>
                <CardDescription>
                    {summary.response_count} responses
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Select Questions - Bar Chart */}
                {(summary.question_type === 'single_select' || summary.question_type === 'multi_select') &&
                    summary.option_counts && (
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={Object.entries(summary.option_counts).map(([option, count], i) => ({
                                        option: option.length > 20 ? option.slice(0, 17) + '...' : option,
                                        count,
                                        percentage: summary.response_count > 0
                                            ? (count / summary.response_count * 100).toFixed(1)
                                            : 0,
                                        color: CHART_COLORS[i % CHART_COLORS.length]
                                    }))}
                                    layout="vertical"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis type="number" stroke="#9ca3af" />
                                    <YAxis
                                        dataKey="option"
                                        type="category"
                                        width={120}
                                        stroke="#9ca3af"
                                        tick={{ fill: '#e5e7eb', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                        formatter={(value: number) => [`${value} responses`]}
                                    />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                        {Object.entries(summary.option_counts).map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                {/* Rating/NPS Questions */}
                {(summary.question_type === 'rating' || summary.question_type === 'nps') && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="text-center p-4 rounded-lg bg-slate-900/50 flex-1">
                                <p className="text-3xl font-bold text-teal-400">
                                    {summary.average_score?.toFixed(1) || 'N/A'}
                                </p>
                                <p className="text-xs text-slate-400">Average Score</p>
                            </div>
                            {summary.question_type === 'nps' && summary.average_score !== undefined && (
                                <div className="text-center p-4 rounded-lg bg-slate-900/50 flex-1">
                                    <p className={`text-3xl font-bold ${summary.average_score >= 9 ? 'text-green-400' :
                                            summary.average_score >= 7 ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                        {summary.average_score >= 9 ? 'Promoter' :
                                            summary.average_score >= 7 ? 'Passive' : 'Detractor'}
                                    </p>
                                    <p className="text-xs text-slate-400">Average Category</p>
                                </div>
                            )}
                        </div>
                        {summary.score_distribution && (
                            <div className="h-[150px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={Object.entries(summary.score_distribution)
                                            .sort(([a], [b]) => Number(a) - Number(b))
                                            .map(([score, count]) => ({
                                                score,
                                                count
                                            }))}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="score" stroke="#9ca3af" />
                                        <YAxis stroke="#9ca3af" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                            formatter={(value: number) => [`${value} responses`]}
                                        />
                                        <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}

                {/* Text Questions */}
                {summary.question_type === 'text' && (
                    <div className="space-y-3">
                        {summary.sentiment_avg !== undefined && (
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-slate-400 text-sm">Sentiment:</span>
                                <Badge
                                    variant="outline"
                                    className={
                                        summary.sentiment_avg > 0.2 ? 'text-green-400' :
                                            summary.sentiment_avg < -0.2 ? 'text-red-400' : 'text-yellow-400'
                                    }
                                >
                                    {summary.sentiment_avg > 0.2 ? 'Positive' :
                                        summary.sentiment_avg < -0.2 ? 'Negative' : 'Neutral'}
                                </Badge>
                            </div>
                        )}
                        {summary.sample_responses && summary.sample_responses.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm text-slate-400">Sample responses:</p>
                                {summary.sample_responses.map((response, i) => (
                                    <div
                                        key={i}
                                        className="p-3 rounded-lg bg-slate-900/50 border border-slate-700"
                                    >
                                        <MessageSquare className="w-4 h-4 text-teal-400 inline mr-2" />
                                        <span className="text-slate-300 text-sm italic">"{response}"</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default SurveyResults;
