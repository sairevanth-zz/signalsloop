'use client';

/**
 * Competitive Intelligence Usage Panel
 * Shows usage limits and remaining quota for all CI sub-features
 * Collapsible and collapsed by default
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
    RefreshCw,
    ChevronDown,
    ChevronUp
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
    defaultOpen?: boolean;
}

interface SubFeatureCardProps {
    name: string;
    icon: React.ReactNode;
    usage: FeatureUsage | null;
    loading: boolean;
    premiumOnly?: boolean;
}

function SubFeatureCard({ name, icon, usage, loading, premiumOnly }: SubFeatureCardProps) {
    if (loading) {
        return (
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50 animate-pulse">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 bg-gray-200 dark:bg-slate-600 rounded" />
                    <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-16" />
                </div>
                <div className="h-1 bg-gray-200 dark:bg-slate-600 rounded w-full" />
            </div>
        );
    }

    if (!usage) {
        return null;
    }

    const percentUsed = usage.limit > 0 ? (usage.current / usage.limit) * 100 : 0;
    const isPremiumLocked = usage.limit === 0 && premiumOnly;

    return (
        <div className={`p-2 rounded-lg border ${isPremiumLocked
            ? 'bg-purple-50/50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800'
            : usage.remaining === 0
                ? 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
                : percentUsed >= 75
                    ? 'bg-orange-50/50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800'
                    : 'bg-white/50 border-gray-200 dark:bg-slate-800/50 dark:border-slate-700'
            }`}>
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${isPremiumLocked
                        ? 'bg-purple-100 dark:bg-purple-900/50'
                        : 'bg-blue-100 dark:bg-blue-900/50'
                        }`}>
                        {icon}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white text-xs">{name}</span>
                </div>
                {isPremiumLocked ? (
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 text-[10px] px-1 py-0 h-4">
                        <Crown className="w-2 h-2 mr-0.5" />
                        Premium
                    </Badge>
                ) : usage.remaining === 0 ? (
                    <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">Limit</span>
                ) : (
                    <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">{usage.remaining} left</span>
                )}
            </div>

            {!isPremiumLocked && usage.limit > 0 && (
                <div className="flex items-center gap-2">
                    <Progress value={percentUsed} className="h-1 flex-1" />
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 w-10 text-right">
                        {usage.current}/{usage.limit}
                    </span>
                </div>
            )}
        </div>
    );
}

export function CompetitiveUsagePanel({ projectId, slug, onRefresh, defaultOpen = false }: CompetitiveUsagePanelProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [extractionUsage, setExtractionUsage] = useState<FeatureUsage | null>(null);
    const [featureGapUsage, setFeatureGapUsage] = useState<FeatureUsage | null>(null);
    const [recommendationsUsage, setRecommendationsUsage] = useState<FeatureUsage | null>(null);
    const [externalScrapeUsage, setExternalScrapeUsage] = useState<FeatureUsage | null>(null);
    const [pendingCount, setPendingCount] = useState(0);

    const fetchUsage = async () => {
        try {
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

    const handleRefresh = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRefreshing(true);
        fetchUsage();
        if (onRefresh) onRefresh();
    };

    // Determine overall plan
    const plan = extractionUsage?.plan || 'free';
    const isPremium = plan === 'premium';
    const isPro = plan === 'pro' || isPremium;

    // Check if any limit is reached
    const hasLimitReached = [extractionUsage, featureGapUsage, recommendationsUsage, externalScrapeUsage]
        .some(u => u && u.remaining === 0 && u.limit > 0);

    return (
        <Card className="border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Collapsible Header */}
            <CardHeader
                className="py-2.5 px-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                            Usage
                        </span>
                        {hasLimitReached && (
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 text-[10px] h-4 px-1.5">
                                <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                                Limit
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Badge variant={isPremium ? 'default' : isPro ? 'secondary' : 'outline'} className="text-[10px] h-4 px-1.5">
                            {plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </Badge>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                        </Button>
                        {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                    </div>
                </div>
            </CardHeader>

            {/* Collapsible Content */}
            {isOpen && (
                <CardContent className="pt-0 pb-3 px-4">
                    <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
                        <SubFeatureCard
                            name="Extraction"
                            icon={<Target className="w-2.5 h-2.5 text-blue-600" />}
                            usage={extractionUsage}
                            loading={loading}
                        />
                        <SubFeatureCard
                            name="Feature Gaps"
                            icon={<Lightbulb className="w-2.5 h-2.5 text-amber-600" />}
                            usage={featureGapUsage}
                            loading={loading}
                        />
                        <SubFeatureCard
                            name="Recommendations"
                            icon={<Zap className="w-2.5 h-2.5 text-purple-600" />}
                            usage={recommendationsUsage}
                            loading={loading}
                        />
                        <SubFeatureCard
                            name="External"
                            icon={<Globe className="w-2.5 h-2.5 text-green-600" />}
                            usage={externalScrapeUsage}
                            loading={loading}
                            premiumOnly
                        />
                    </div>

                    {!isPro && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                Upgrade to unlock all features
                            </p>
                            <Link href={slug ? `/${slug}/settings` : '/app/settings'}>
                                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2">
                                    <Crown className="w-2.5 h-2.5 mr-1" />
                                    Upgrade
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
