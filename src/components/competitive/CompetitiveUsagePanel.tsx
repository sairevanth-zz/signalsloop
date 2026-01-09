'use client';

/**
 * Competitive Intelligence Usage Panel
 * Shows usage limits and remaining quota for all CI sub-features
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
    Target,
    Lightbulb,
    Zap,
    Globe,
    Crown,
    AlertCircle,
    CheckCircle2,
    Loader2,
    RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface FeatureUsage {
    current: number;
    limit: number;
    remaining: number;
    plan: string;
    allowed: boolean;
}

interface CompetitiveUsagePanelProps {
    projectId: string;
    slug?: string;
    onRefresh?: () => void;
}

interface SubFeatureCardProps {
    name: string;
    description: string;
    icon: React.ReactNode;
    usage: FeatureUsage | null;
    loading: boolean;
    premiumOnly?: boolean;
}

function SubFeatureCard({ name, description, icon, usage, loading, premiumOnly }: SubFeatureCardProps) {
    if (loading) {
        return (
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50 animate-pulse">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-slate-600 rounded-lg" />
                    <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-24" />
                </div>
                <div className="h-2 bg-gray-200 dark:bg-slate-600 rounded w-full" />
            </div>
        );
    }

    if (!usage) {
        return null;
    }

    const percentUsed = usage.limit > 0 ? (usage.current / usage.limit) * 100 : 0;
    const isPremiumLocked = usage.limit === 0 && premiumOnly;

    return (
        <div className={`p-4 rounded-lg border ${isPremiumLocked
                ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 dark:from-purple-900/20 dark:to-pink-900/20 dark:border-purple-700'
                : usage.remaining === 0
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                    : percentUsed >= 75
                        ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700'
                        : 'bg-white border-gray-200 dark:bg-slate-700/50 dark:border-slate-600'
            }`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPremiumLocked
                            ? 'bg-purple-100 dark:bg-purple-900/50'
                            : 'bg-blue-100 dark:bg-blue-900/50'
                        }`}>
                        {icon}
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">{name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                    </div>
                </div>
                {isPremiumLocked ? (
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300">
                        <Crown className="w-3 h-3 mr-1" />
                        Premium
                    </Badge>
                ) : usage.remaining === 0 ? (
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Limit Reached
                    </Badge>
                ) : (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/50 dark:text-green-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {usage.remaining} left
                    </Badge>
                )}
            </div>

            {!isPremiumLocked && usage.limit > 0 && (
                <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>{usage.current} used</span>
                        <span>{usage.limit} limit</span>
                    </div>
                    <Progress
                        value={percentUsed}
                        className="h-1.5"
                    />
                </div>
            )}

            {isPremiumLocked && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                    Upgrade to Premium to access competitor review scraping from G2, Capterra, and TrustRadius.
                </p>
            )}
        </div>
    );
}

export function CompetitiveUsagePanel({ projectId, slug, onRefresh }: CompetitiveUsagePanelProps) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [extractionUsage, setExtractionUsage] = useState<FeatureUsage | null>(null);
    const [featureGapUsage, setFeatureGapUsage] = useState<FeatureUsage | null>(null);
    const [recommendationsUsage, setRecommendationsUsage] = useState<FeatureUsage | null>(null);
    const [externalScrapeUsage, setExternalScrapeUsage] = useState<FeatureUsage | null>(null);
    const [pendingCount, setPendingCount] = useState(0);

    const fetchUsage = async () => {
        try {
            // Fetch usage for all sub-features in parallel
            const [extractRes, featureGapRes, recsRes, scrapeRes] = await Promise.all([
                fetch(`/api/competitive/extract?projectId=${projectId}`),
                fetch(`/api/competitive/feature-gaps?projectId=${projectId}`),
                fetch(`/api/competitive/recommendations?projectId=${projectId}`),
                fetch(`/api/competitive/external/scrape?projectId=${projectId}`),
            ]);

            const [extractData, featureGapData, recsData, scrapeData] = await Promise.all([
                extractRes.json(),
                featureGapRes.json(),
                recsRes.json(),
                scrapeRes.json(),
            ]);

            if (extractData.success && extractData.usage) {
                setExtractionUsage(extractData.usage);
                setPendingCount(extractData.pendingCount || 0);
            }
            if (featureGapData.success && featureGapData.usage) {
                setFeatureGapUsage(featureGapData.usage);
            }
            if (recsData.success && recsData.usage) {
                setRecommendationsUsage(recsData.usage);
            }
            if (scrapeData.success && scrapeData.usage) {
                setExternalScrapeUsage(scrapeData.usage);
            }
        } catch (error) {
            console.error('[CompetitiveUsagePanel] Error fetching usage:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchUsage();
        }
    }, [projectId]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchUsage();
        if (onRefresh) onRefresh();
    };

    // Determine overall plan
    const plan = extractionUsage?.plan || 'free';
    const isPremium = plan === 'premium';
    const isPro = plan === 'pro' || isPremium;

    return (
        <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        Competitive Intelligence Usage
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Badge variant={isPremium ? 'default' : isPro ? 'secondary' : 'outline'}>
                            {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                        </Badge>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
                {pendingCount > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {pendingCount} feedback items pending competitive analysis
                    </p>
                )}
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                    <SubFeatureCard
                        name="Competitor Extraction"
                        description="Analyze feedback for competitor mentions"
                        icon={<Target className="w-4 h-4 text-blue-600" />}
                        usage={extractionUsage}
                        loading={loading}
                    />
                    <SubFeatureCard
                        name="Feature Gap Detection"
                        description="Find features competitors have that you don't"
                        icon={<Lightbulb className="w-4 h-4 text-amber-600" />}
                        usage={featureGapUsage}
                        loading={loading}
                    />
                    <SubFeatureCard
                        name="Strategic Recommendations"
                        description="AI-generated competitive strategy"
                        icon={<Zap className="w-4 h-4 text-purple-600" />}
                        usage={recommendationsUsage}
                        loading={loading}
                    />
                    <SubFeatureCard
                        name="External Review Scraping"
                        description="Scrape G2, Capterra, TrustRadius"
                        icon={<Globe className="w-4 h-4 text-green-600" />}
                        usage={externalScrapeUsage}
                        loading={loading}
                        premiumOnly
                    />
                </div>

                {!isPro && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Upgrade to unlock Competitive Intelligence and gain insights from your feedback.
                        </p>
                        <Link href={slug ? `/${slug}/settings` : '/app/settings'}>
                            <Button size="sm" variant="outline" className="w-full">
                                <Crown className="w-3 h-3 mr-1" />
                                Upgrade Plan
                            </Button>
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
