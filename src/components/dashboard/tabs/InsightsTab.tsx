/**
 * InsightsTab - Insights tab content for Dashboard
 * 
 * Contains: Weekly Report, Signal Correlations, Sentiment Forecast,
 * Revenue Attribution, Theme Correlation Network
 */

'use client';

import React, { useEffect, useState } from 'react';
import { InsightReportCard } from '../InsightReportCard';
import { SignalCorrelationView } from '../SignalCorrelationView';
import { SentimentForecastCard } from '../SentimentForecastCard';
import { RevenueSummaryWidget } from '@/components/revenue';
import { CorrelationSummaryWidget } from '@/components/themes/ThemeCorrelationView';

interface InsightsTabProps {
    projectId: string;
    projectSlug: string;
    metrics: any;
}

export default function InsightsTab({ projectId, projectSlug, metrics }: InsightsTabProps) {
    const [revenueData, setRevenueData] = useState<any>(null);
    const [correlationData, setCorrelationData] = useState<any>(null);

    useEffect(() => {
        // Fetch revenue and correlation data
        async function fetchData() {
            try {
                const [revenueRes, correlationRes] = await Promise.all([
                    fetch(`/api/revenue/attribution?projectId=${projectId}`).catch(() => null),
                    fetch(`/api/themes/correlations?projectId=${projectId}`).catch(() => null)
                ]);

                if (revenueRes?.ok) {
                    const data = await revenueRes.json();
                    setRevenueData(data);
                }
                if (correlationRes?.ok) {
                    const data = await correlationRes.json();
                    setCorrelationData(data);
                }
            } catch (error) {
                console.error('Error fetching insights data:', error);
            }
        }
        fetchData();
    }, [projectId]);

    return (
        <div className="space-y-6">
            {/* Weekly AI Insights - Full Width */}
            <InsightReportCard projectId={projectId} />

            {/* Four Column Layout - New Feature Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Revenue Summary */}
                <RevenueSummaryWidget
                    totalRevenue={revenueData?.attribution?.totalAttributedRevenue || 0}
                    featuresCount={revenueData?.success ? 1 : 0}
                    avgRevenuePerFeature={revenueData?.attribution?.totalAttributedRevenue || 0}
                    topFeatureName={revenueData?.attribution?.featureName}
                    topFeatureRevenue={revenueData?.attribution?.totalAttributedRevenue}
                />

                {/* Theme Correlations Summary */}
                <CorrelationSummaryWidget
                    totalCorrelations={correlationData?.correlations?.length || 0}
                    strongCorrelations={correlationData?.correlations?.filter((c: any) => c.correlationScore > 0.5)?.length || 0}
                    insightsCount={correlationData?.insights?.length || 0}
                    topCorrelation={correlationData?.correlations?.[0] ? {
                        theme1: correlationData.correlations[0].themeName1,
                        theme2: correlationData.correlations[0].themeName2,
                        score: correlationData.correlations[0].correlationScore
                    } : undefined}
                />

                {/* Additional Signal Insights */}
                <div className="lg:col-span-2 rounded-xl bg-slate-900/80 border border-slate-800/50 p-4">
                    <p className="text-sm text-slate-400">Signal correlations and theme relationships are analyzed to identify patterns in user feedback.</p>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Signal Correlations Full */}
                <SignalCorrelationView projectId={projectId} />

                {/* Sentiment Forecast */}
                <SentimentForecastCard projectId={projectId} />
            </div>
        </div>
    );
}
