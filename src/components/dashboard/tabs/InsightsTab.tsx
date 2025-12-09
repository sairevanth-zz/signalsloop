/**
 * InsightsTab - Insights tab content for Dashboard
 * 
 * Contains: Weekly Report, Signal Correlations, Sentiment Forecast
 */

'use client';

import React from 'react';
import { InsightReportCard } from '../InsightReportCard';
import { SignalCorrelationView } from '../SignalCorrelationView';
import { SentimentForecastCard } from '../SentimentForecastCard';

interface InsightsTabProps {
    projectId: string;
    projectSlug: string;
    metrics: any;
}

export default function InsightsTab({ projectId, projectSlug, metrics }: InsightsTabProps) {
    return (
        <div className="space-y-6">
            {/* Weekly AI Insights - Full Width */}
            <InsightReportCard projectId={projectId} />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Signal Correlations */}
                <SignalCorrelationView projectId={projectId} />

                {/* Sentiment Forecast */}
                <SentimentForecastCard projectId={projectId} />
            </div>
        </div>
    );
}
