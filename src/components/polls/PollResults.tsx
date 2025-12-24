'use client';

/**
 * PollResults - Results dashboard for polls
 * Shows vote counts, percentages, charts, and segment breakdown
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '@/components/theme-provider';
import {
    BarChart3,
    DollarSign,
    Users,
    Loader2,
    AlertCircle,
    Share2,
    Copy,
    CheckCircle,
    MessageSquare,
    TrendingUp
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
import type { PollResults as PollResultsType, PollResult } from '@/types/polls';

interface PollResultsProps {
    pollId: string;
    isOwner?: boolean;
}

const CHART_COLORS = [
    '#14b8a6', // teal
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
];

export function PollResults({ pollId, isOwner = false }: PollResultsProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Theme-aware chart colors
    const chartTextColor = isDark ? '#e5e7eb' : '#374151';
    const chartGridColor = isDark ? '#374151' : '#e5e7eb';
    const chartTooltipBg = isDark ? '#1f2937' : '#ffffff';
    const chartTooltipBorder = isDark ? '#374151' : '#e5e7eb';

    const [results, setResults] = useState<PollResultsType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showWeighted, setShowWeighted] = useState(false);
    const [showSegments, setShowSegments] = useState(false);
    const [explanations, setExplanations] = useState<any[]>([]);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadResults();
    }, [pollId, showSegments]);

    const loadResults = async () => {
        try {
            const params = new URLSearchParams();
            if (showSegments) params.set('segments', 'true');
            if (showWeighted) params.set('weighted', 'true');

            const res = await fetch(`/api/polls/${pollId}/results?${params}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load results');

            const data = await res.json();
            setResults(data);
            setExplanations(data.explanations || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyShareLink = () => {
        const url = `${window.location.origin}/polls/${pollId}/vote`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success('Link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-500" />
                    <p className="mt-2 text-muted-foreground">Loading results...</p>
                </CardContent>
            </Card>
        );
    }

    if (error || !results) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
                    <p className="mt-2 text-muted-foreground">{error || 'Failed to load results'}</p>
                </CardContent>
            </Card>
        );
    }

    const { poll, results: pollResults, by_segment, total_votes, total_weighted } = results;
    const uniqueVoters = (results as any).unique_voters || total_votes;
    const isRankedPoll = poll.poll_type === 'ranked';

    // For ranked polls, sort by avg_rank (lower = more preferred)
    // For other polls, keep original order (sorted by vote count)
    const sortedResults = isRankedPoll
        ? [...pollResults].sort((a: any, b: any) => (a.avg_rank || 999) - (b.avg_rank || 999))
        : pollResults;

    // Prepare chart data - for ranked polls, use inverse of avg_rank for bar width (higher bar = more preferred)
    const chartData = sortedResults.map((r: any, i) => {
        const maxRank = pollResults.length;
        // For ranked: convert avg_rank to "preference score" (higher = better)
        // Score = (maxRank - avgRank + 1) / maxRank * 100
        const preferenceScore = isRankedPoll && r.avg_rank
            ? ((maxRank - r.avg_rank + 1) / maxRank) * 100
            : r.percentage;

        return {
            name: r.option_text.length > 25 ? r.option_text.slice(0, 22) + '...' : r.option_text,
            fullName: r.option_text,
            votes: r.vote_count,
            weighted: r.weighted_vote_count,
            percentage: isRankedPoll ? preferenceScore : (showWeighted ? r.weighted_percentage : r.percentage),
            avgRank: r.avg_rank,
            color: CHART_COLORS[i % CHART_COLORS.length]
        };
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-foreground flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-teal-500" />
                                {poll.title}
                            </CardTitle>
                            {poll.description && (
                                <CardDescription className="mt-1">{poll.description}</CardDescription>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge
                                variant={poll.status === 'active' ? 'default' : 'secondary'}
                                className={poll.status === 'active' ? 'bg-teal-500' : ''}
                            >
                                {poll.status}
                            </Badge>
                            <Button variant="outline" size="sm" onClick={copyShareLink}>
                                {copied ? (
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                ) : (
                                    <Share2 className="w-4 h-4 mr-2" />
                                )}
                                Share
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Poll Type Badge for ranked */}
                    {isRankedPoll && (
                        <div className="mb-4 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                            <p className="text-sm text-teal-600 dark:text-teal-400">
                                <strong>Ranked Choice Poll:</strong> Results sorted by average rank. Lower rank = higher preference.
                            </p>
                        </div>
                    )}

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-4 rounded-lg bg-muted">
                            <Users className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                            <p className="text-2xl font-bold text-foreground">{uniqueVoters}</p>
                            <p className="text-xs text-muted-foreground">
                                {isRankedPoll ? 'Unique Voters' : 'Total Votes'}
                            </p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-muted">
                            <BarChart3 className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                            <p className="text-2xl font-bold text-foreground">{pollResults.length}</p>
                            <p className="text-xs text-muted-foreground">Options</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-muted">
                            <DollarSign className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                            <p className="text-2xl font-bold text-foreground">
                                ${Math.round(total_weighted / 100).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">Weighted MRR</p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-6 mb-6 pb-4 border-b">
                        <div className="flex items-center gap-2">
                            <Switch
                                id="weighted"
                                checked={showWeighted}
                                onCheckedChange={setShowWeighted}
                            />
                            <Label htmlFor="weighted">Revenue-Weighted</Label>
                        </div>
                        {isOwner && (
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="segments"
                                    checked={showSegments}
                                    onCheckedChange={(v) => {
                                        setShowSegments(v);
                                        if (v) loadResults();
                                    }}
                                />
                                <Label htmlFor="segments">Show Segments</Label>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            <Tabs defaultValue="chart" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="chart">Chart View</TabsTrigger>
                    <TabsTrigger value="list">List View</TabsTrigger>
                    {by_segment && Object.keys(by_segment).length > 0 && (
                        <TabsTrigger value="segments">By Segment</TabsTrigger>
                    )}
                    {explanations.length > 0 && (
                        <TabsTrigger value="explanations">Explanations</TabsTrigger>
                    )}
                </TabsList>

                {/* Chart View */}
                <TabsContent value="chart">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Bar Chart */}
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} strokeOpacity={0.5} />
                                            <XAxis
                                                type="number"
                                                domain={[0, 100]}
                                                stroke={chartTextColor}
                                                tick={{ fill: chartTextColor, fontSize: 12 }}
                                            />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={120}
                                                stroke={chartTextColor}
                                                tick={{ fill: chartTextColor, fontSize: 12 }}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: chartTooltipBg,
                                                    border: `1px solid ${chartTooltipBorder}`,
                                                    borderRadius: '8px',
                                                    color: chartTextColor
                                                }}
                                                labelStyle={{ color: chartTextColor }}
                                                formatter={(value: number, name: string, props: any) => {
                                                    if (isRankedPoll && props.payload?.avgRank) {
                                                        return [`Avg Rank: ${props.payload.avgRank.toFixed(1)}`, 'Preference'];
                                                    }
                                                    return [
                                                        `${value.toFixed(1)}%`,
                                                        showWeighted ? 'Weighted' : 'Votes'
                                                    ];
                                                }}
                                            />
                                            <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Pie Chart */}
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData}
                                                dataKey={showWeighted ? 'weighted' : 'votes'}
                                                nameKey="fullName"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                label={({ payload }) => `${(payload?.percentage || 0).toFixed(0)}%`}
                                                labelLine={false}
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: chartTooltipBg,
                                                    border: `1px solid ${chartTooltipBorder}`,
                                                    borderRadius: '8px',
                                                    color: chartTextColor
                                                }}
                                                formatter={(value: number) => [
                                                    showWeighted ? `$${value.toLocaleString()} MRR` : `${value} votes`
                                                ]}
                                            />
                                            <Legend
                                                wrapperStyle={{ color: chartTextColor }}
                                                formatter={(value) => <span style={{ color: chartTextColor }}>{value}</span>}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* List View */}
                <TabsContent value="list">
                    <Card>
                        <CardContent className="pt-6 space-y-3">
                            {pollResults.map((result, index) => (
                                <div
                                    key={result.option_id}
                                    className="p-4 rounded-lg bg-muted border"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-foreground font-medium">{result.option_text}</span>
                                        <span className="text-teal-600 dark:text-teal-400 font-bold">
                                            {showWeighted
                                                ? `${result.weighted_percentage.toFixed(1)}%`
                                                : `${result.percentage.toFixed(1)}%`
                                            }
                                        </span>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${showWeighted ? result.weighted_percentage : result.percentage}%`,
                                                backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                        <span>{result.vote_count} votes</span>
                                        {showWeighted && (
                                            <span>${(result.weighted_vote_count / 100).toLocaleString()} MRR</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Segments View */}
                {by_segment && (
                    <TabsContent value="segments">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(by_segment).map(([segment, segmentResults]) => (
                                <Card key={segment}>
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-sm text-foreground flex items-center gap-2">
                                            <Users className="w-4 h-4 text-teal-500" />
                                            {segment}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {(segmentResults as any[]).map((r, i) => (
                                            <div key={r.option_id} className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between text-sm mb-1">
                                                        <span className="text-muted-foreground truncate">{r.option_text}</span>
                                                        <span className="text-muted-foreground">{r.percentage.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${r.percentage}%`,
                                                                backgroundColor: CHART_COLORS[i % CHART_COLORS.length]
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                )}

                {/* Explanations View */}
                {explanations.length > 0 && (
                    <TabsContent value="explanations">
                        <Card>
                            <CardContent className="pt-6 space-y-3">
                                {explanations.map((exp, index) => {
                                    const option = pollResults.find(r => r.option_id === exp.option_id);
                                    return (
                                        <div
                                            key={index}
                                            className="p-4 rounded-lg bg-muted border"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <MessageSquare className="w-4 h-4 text-teal-500" />
                                                <Badge variant="outline" className="text-xs">
                                                    {option?.option_text || 'Unknown option'}
                                                </Badge>
                                                {exp.sentiment !== null && (
                                                    <Badge
                                                        variant="outline"
                                                        className={exp.sentiment > 0.2 ? 'text-green-600 dark:text-green-400' : exp.sentiment < -0.2 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}
                                                    >
                                                        {exp.sentiment > 0.2 ? 'Positive' : exp.sentiment < -0.2 ? 'Negative' : 'Neutral'}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-muted-foreground text-sm italic">"{exp.text}"</p>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}

export default PollResults;
