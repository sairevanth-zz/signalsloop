'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HealthScoreGauge } from '@/components/health-score/HealthScoreGauge';
import { Loader2, Heart, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { HealthScore } from '@/lib/health-score/types';

export default function HealthScoreSharePage() {
    const params = useParams();
    const shareToken = params.shareToken as string;

    const [loading, setLoading] = useState(true);
    const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHealthScore = async () => {
            try {
                const response = await fetch(`/api/health/${shareToken}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load health score');
                }

                setHealthScore(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load health score');
            } finally {
                setLoading(false);
            }
        };

        if (shareToken) {
            fetchHealthScore();
        }
    }, [shareToken]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading health score...</p>
                </div>
            </div>
        );
    }

    if (error || !healthScore) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
                <Card className="max-w-md w-full">
                    <CardContent className="p-8 text-center">
                        <div className="text-6xl mb-4">😕</div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Score Not Found
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {error || 'This health score link may have expired or is invalid.'}
                        </p>
                        <Link href="/demo/health-score">
                            <Button className="w-full">
                                Calculate Your Own Score
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                {/* Background decorations */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-200/30 dark:bg-pink-900/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-3xl" />

                <div className="relative max-w-4xl mx-auto px-6 py-16 md:py-24">
                    {/* Header */}
                    <motion.div
                        className="text-center mb-12"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-pink-100 to-red-100 dark:from-pink-900/40 dark:to-red-900/40 text-pink-600 dark:text-pink-400 text-sm font-semibold mb-6">
                            <Heart className="w-4 h-4 mr-2" />
                            Product Health Score
                        </div>

                        {healthScore.productName && (
                            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                                {healthScore.productName}
                            </h1>
                        )}
                    </motion.div>

                    {/* Score Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="border-0 shadow-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl">
                            <CardContent className="p-8 md:p-12">
                                <div className="flex flex-col items-center">
                                    {/* Gauge */}
                                    <HealthScoreGauge
                                        score={healthScore.score}
                                        grade={healthScore.grade}
                                        size="xl"
                                    />

                                    {/* Description */}
                                    <p className="mt-8 text-center text-gray-700 dark:text-gray-300 max-w-lg leading-relaxed">
                                        {healthScore.interpretation || healthScore.grade.description}
                                    </p>

                                    {/* Components Summary */}
                                    <div className="mt-8 w-full max-w-md grid grid-cols-5 gap-2">
                                        {Object.entries(healthScore.components).map(([key, component]) => (
                                            <div key={key} className="text-center p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {typeof component === 'object' && 'score' in component ? component.score : '--'}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                                    {key.replace(/_/g, ' ')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* CTA Section */}
                    <motion.div
                        className="mt-12 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                            What's Your Product's Health Score?
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
                            Calculate your own product health score based on feedback analysis.
                            Compare with other products and share your badge!
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/demo/health-score">
                                <Button size="lg" className="w-full sm:w-auto px-8 shadow-lg">
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Get My Score
                                </Button>
                            </Link>
                            <Link href="/demo/feedback">
                                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
                                    Try Feedback Analysis
                                </Button>
                            </Link>
                        </div>
                    </motion.div>

                    {/* Branding */}
                    <div className="mt-16 text-center">
                        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            <span className="text-sm">Powered by</span>
                            <span className="font-semibold">SignalsLoop</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
