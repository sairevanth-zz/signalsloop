'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, Sparkles, Heart, Activity, ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { HealthScoreResults } from '@/components/health-score/HealthScoreResults';
import { HealthScore, HealthScoreInput } from '@/lib/health-score/types';
import Link from 'next/link';

type SentimentTrend = 'improving' | 'stable' | 'declining';

export default function HealthScoreDemoPage() {
    const [productName, setProductName] = useState('');
    const [calculating, setCalculating] = useState(false);
    const [results, setResults] = useState<HealthScore | null>(null);
    const [shareUrl, setShareUrl] = useState<string | null>(null);

    // Input state
    const [overallSentiment, setOverallSentiment] = useState(0.2); // -1 to 1
    const [sentimentTrend, setSentimentTrend] = useState<SentimentTrend>('stable');
    const [criticalIssueCount, setCriticalIssueCount] = useState(3);
    const [totalFeedbackCount, setTotalFeedbackCount] = useState(100);
    const [praisePercentage, setPraisePercentage] = useState(35);
    const [topThemeConcentration, setTopThemeConcentration] = useState(65);

    const handleCalculate = async () => {
        if (!productName.trim()) {
            toast.error('Please enter a product name');
            return;
        }

        setCalculating(true);
        setResults(null);
        setShareUrl(null);

        try {
            const input: HealthScoreInput = {
                overallSentiment,
                sentimentTrend,
                criticalIssueCount,
                totalFeedbackCount,
                praisePercentage,
                topThemeConcentration,
                productName,
            };

            const response = await fetch('/api/demo/health-score/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input,
                    productName,
                    persist: true, // Save to database for sharing
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Calculation failed');
            }

            setResults(data);
            setShareUrl(data.shareUrl);
            toast.success(`Health Score: ${data.score} (${data.grade.label})`);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to calculate health score');
        } finally {
            setCalculating(false);
        }
    };

    const handleReset = () => {
        setResults(null);
        setShareUrl(null);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-pink-500/30">

            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* Back Link */}
                    <Link href="/" className="inline-flex items-center text-slate-400 hover:text-slate-200 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Link>

                    {/* Header */}
                    <div className="text-center space-y-4 max-w-2xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/10 to-red-500/10 border border-pink-500/20 text-pink-300 text-xs font-medium mb-2">
                            <Heart className="w-3 h-3" />
                            <span>Product Health Score</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-transparent pb-2">
                            My Score is {results?.score ?? '78'}—What's Yours?
                        </h1>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                            Calculate your product's health score based on feedback analysis.
                            <br className="hidden md:block" />
                            Share your badge and challenge other PMs!
                        </p>
                    </div>

                    {/* Input Interface or Results */}
                    <AnimatePresence mode="wait">
                        {!results ? (
                            <motion.div
                                key="input"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="max-w-3xl mx-auto"
                            >
                                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm shadow-xl">
                                    <CardContent className="p-8 space-y-8">

                                        {/* Product Name */}
                                        <div className="space-y-2">
                                            <Label className="text-base font-semibold text-slate-200">Your Product Name</Label>
                                            <Input
                                                placeholder="e.g. MyApp, Acme Dashboard, etc."
                                                className="text-lg h-12 bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
                                                value={productName}
                                                onChange={(e) => setProductName(e.target.value)}
                                            />
                                        </div>

                                        {/* Metrics Inputs */}
                                        <div className="space-y-6">
                                            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                                                Feedback Metrics
                                            </div>

                                            {/* Overall Sentiment */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <Label className="flex items-center gap-2 text-slate-200">
                                                        <Activity className="w-4 h-4 text-blue-400" />
                                                        Overall Sentiment
                                                    </Label>
                                                    <span className="text-sm font-medium text-slate-400">
                                                        {overallSentiment > 0 ? '+' : ''}{overallSentiment.toFixed(2)} ({overallSentiment > 0.3 ? 'Positive' : overallSentiment < -0.3 ? 'Negative' : 'Mixed'})
                                                    </span>
                                                </div>
                                                <Slider
                                                    value={[overallSentiment]}
                                                    onValueChange={([val]: number[]) => setOverallSentiment(val)}
                                                    min={-1}
                                                    max={1}
                                                    step={0.1}
                                                    className="py-2"
                                                />
                                                <p className="text-xs text-slate-500">-1 (very negative) to +1 (very positive)</p>
                                            </div>

                                            {/* Sentiment Trend */}
                                            <div className="space-y-3">
                                                <Label className="flex items-center gap-2 text-slate-200">
                                                    <TrendingUp className="w-4 h-4 text-green-400" />
                                                    Sentiment Trend
                                                </Label>
                                                <div className="flex gap-2">
                                                    {(['improving', 'stable', 'declining'] as SentimentTrend[]).map((trend) => (
                                                        <Button
                                                            key={trend}
                                                            variant={sentimentTrend === trend ? 'default' : 'outline'}
                                                            size="sm"
                                                            onClick={() => setSentimentTrend(trend)}
                                                            className={`flex-1 ${sentimentTrend === trend ? 'bg-pink-600 hover:bg-pink-500' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                                                        >
                                                            {trend === 'improving' && <TrendingUp className="w-4 h-4 mr-1" />}
                                                            {trend === 'stable' && <Minus className="w-4 h-4 mr-1" />}
                                                            {trend === 'declining' && <TrendingDown className="w-4 h-4 mr-1" />}
                                                            {trend.charAt(0).toUpperCase() + trend.slice(1)}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Critical Issues */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-slate-200">Critical Issues</Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={criticalIssueCount}
                                                        onChange={(e) => setCriticalIssueCount(parseInt(e.target.value) || 0)}
                                                        className="bg-slate-900/50 border-slate-700 text-slate-200"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-slate-200">Total Feedback Count</Label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={totalFeedbackCount}
                                                        onChange={(e) => setTotalFeedbackCount(parseInt(e.target.value) || 1)}
                                                        className="bg-slate-900/50 border-slate-700 text-slate-200"
                                                    />
                                                </div>
                                            </div>

                                            {/* Praise Percentage */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <Label className="flex items-center gap-2 text-slate-200">
                                                        <Heart className="w-4 h-4 text-pink-400" />
                                                        User Love (Praise %)
                                                    </Label>
                                                    <span className="text-sm font-medium text-slate-400">{praisePercentage}%</span>
                                                </div>
                                                <Slider
                                                    value={[praisePercentage]}
                                                    onValueChange={([val]: number[]) => setPraisePercentage(val)}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    className="py-2"
                                                />
                                            </div>

                                            {/* Theme Concentration */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-slate-200">Feature Clarity (Theme Concentration)</Label>
                                                    <span className="text-sm font-medium text-slate-400">{topThemeConcentration}%</span>
                                                </div>
                                                <Slider
                                                    value={[topThemeConcentration]}
                                                    onValueChange={([val]: number[]) => setTopThemeConcentration(val)}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    className="py-2"
                                                />
                                                <p className="text-xs text-slate-500">How much of feedback focuses on top 3 themes</p>
                                            </div>
                                        </div>

                                        {/* Calculate Button */}
                                        <Button
                                            size="lg"
                                            className="w-full h-14 text-lg font-bold bg-pink-600 hover:bg-pink-500 shadow-lg shadow-pink-500/25 transition-all rounded-xl"
                                            onClick={handleCalculate}
                                            disabled={calculating}
                                        >
                                            {calculating ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    Calculating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="mr-2 h-5 w-5" />
                                                    Calculate My Health Score
                                                </>
                                            )}
                                        </Button>

                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-3xl font-bold text-white">
                                        Health Score for <span className="text-pink-400">{productName}</span>
                                    </h2>
                                    <Button variant="outline" onClick={handleReset} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                                        Calculate Again
                                    </Button>
                                </div>

                                <HealthScoreResults
                                    healthScore={results}
                                    shareUrl={shareUrl ?? undefined}
                                />

                                {/* CTA Section */}
                                <div className="mt-16 text-center space-y-4 pb-12">
                                    <h3 className="text-2xl font-bold text-white">Want to track your health score continuously?</h3>
                                    <p className="text-slate-400 max-w-xl mx-auto">
                                        SignalsLoop analyzes your feedback 24/7 and updates your health score in real-time.
                                        Get alerts when your score changes.
                                    </p>
                                    <div className="flex justify-center gap-4">
                                        <Link href="/login">
                                            <Button size="lg" className="px-8 bg-pink-600 hover:bg-pink-500">Start Free Trial</Button>
                                        </Link>
                                        <Link href="/demo/feedback">
                                            <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">Try Feedback Analysis</Button>
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </div>
        </div>
    );
}
