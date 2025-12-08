import React from 'react';
import { ClusteringResult } from '@/lib/user-feedback/types';
import { ThemeCloud } from './ThemeCloud';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { AlertTriangle, ThumbsUp, TrendingUp, Zap } from 'lucide-react';

interface FeedbackAnalysisResultsProps {
    results: ClusteringResult;
}

export function FeedbackAnalysisResults({ results }: FeedbackAnalysisResultsProps) {
    const {
        product_summary,
        themes,
        top_feature_requests,
        critical_issues,
        what_users_love,
        recommended_priorities
    } = results;

    // Pie Chart Data
    const sentimentData = [
        { name: 'Positive', value: Object.values(product_summary.sources_breakdown).reduce((acc, curr) => acc + (curr.sentiment > 0.2 ? curr.count : 0), 0), color: '#22c55e' },
        { name: 'Neutral', value: Object.values(product_summary.sources_breakdown).reduce((acc, curr) => acc + (curr.sentiment >= -0.2 && curr.sentiment <= 0.2 ? curr.count : 0), 0), color: '#94a3b8' },
        { name: 'Negative', value: Object.values(product_summary.sources_breakdown).reduce((acc, curr) => acc + (curr.sentiment < -0.2 ? curr.count : 0), 0), color: '#ef4444' },
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* 1. Executive Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Executive Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-light italic text-foreground/90 leading-relaxed">
                            "{product_summary.one_liner}"
                        </p>
                        <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                            <span>Analyzed {product_summary.total_feedback_analyzed} items</span>
                            <span>•</span>
                            <span className={`font-semibold ${product_summary.overall_sentiment > 0 ? 'text-green-600' :
                                    product_summary.overall_sentiment < 0 ? 'text-red-600' : 'text-yellow-600'
                                }`}>
                                {product_summary.sentiment_label} ({product_summary.overall_sentiment.toFixed(2)})
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Sentiment Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Sentiment Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[150px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sentimentData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={60}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {sentimentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* 2. Theme Cloud */}
            <section>
                <h3 className="text-xl font-bold mb-4">Themes Map</h3>
                <ThemeCloud themes={themes} />
            </section>

            {/* 3. High Impact Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Critical Issues */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-red-600">
                        <AlertTriangle className="w-5 h-5" />
                        Critical Issues
                    </h3>
                    {critical_issues.length === 0 ? (
                        <p className="text-muted-foreground italic">No critical issues detected. Great job!</p>
                    ) : (
                        critical_issues.map((issue, i) => (
                            <Card key={i} className="border-l-4 border-l-red-500">
                                <CardContent className="pt-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-lg">{issue.issue}</h4>
                                        <Badge variant="destructive">{issue.severity}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3">{issue.user_impact}</p>
                                    <blockquote className="bg-muted/50 p-3 rounded-lg text-xs italic border-l-2 border-muted-foreground/30">
                                        "{issue.sample_quote}"
                                    </blockquote>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Top Feature Requests */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-blue-600">
                        <Zap className="w-5 h-5" />
                        Top Feature Requests
                    </h3>
                    {top_feature_requests.map((req, i) => (
                        <Card key={i} className="border-l-4 border-l-blue-500">
                            <CardContent className="pt-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-lg">{req.feature}</h4>
                                    <Badge variant="outline">{req.mentions} mentions</Badge>
                                </div>
                                <div className="flex gap-2 mb-3">
                                    <Badge variant="secondary" className="text-xs">Effort: {req.effort_guess}</Badge>
                                    <Badge variant="secondary" className="text-xs">Impact: {req.impact_guess}</Badge>
                                </div>
                                <blockquote className="bg-muted/50 p-3 rounded-lg text-xs italic border-l-2 border-muted-foreground/30">
                                    "{req.user_quote}"
                                </blockquote>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* 4. What Users Love */}
            <section>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-600">
                    <ThumbsUp className="w-5 h-5" />
                    What Users Love
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {what_users_love.map((love, i) => (
                        <Card key={i} className="bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900">
                            <CardContent className="pt-6">
                                <h4 className="font-semibold mb-2">{love.strength}</h4>
                                <p className="text-sm text-green-700 dark:text-green-300 mb-3">{love.leverage_opportunity}</p>
                                <blockquote className="bg-background/80 p-2 rounded text-xs italic opacity-80">
                                    "{love.sample_quote}"
                                </blockquote>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* 5. Recommended Priorities */}
            <section className="bg-slate-50 dark:bg-slate-900 rounded-xl p-8">
                <h3 className="text-xl font-bold mb-6">Recommended Action Plan</h3>
                <div className="space-y-4">
                    {recommended_priorities.map((priority, i) => (
                        <div key={i} className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                                {priority.rank}
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">{priority.action}</h4>
                                <p className="text-muted-foreground">{priority.rationale}</p>
                                <div className="text-xs text-blue-500 mt-1 font-medium tracking-wide uppercase">
                                    Related to: {priority.theme_reference}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

        </div>
    );
}
