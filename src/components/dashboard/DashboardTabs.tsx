/**
 * DashboardTabs - Tabbed deep-dive sections for Mission Control
 * 
 * Organizes detailed analytics into tabs:
 * - Insights: Weekly Report, Correlations, Forecasts
 * - Roadmap: Opportunities, Experiments
 * - Predictions: Accuracy, Calibration, Explainability
 * - Threats: Alerts, Anomalies
 * - Competitive: War Room, Intel
 */

'use client';

import React, { useState, Suspense, lazy } from 'react';
import {
    FileBarChart, BarChart3, Shield, Target, Beaker,
    Loader2, TrendingUp
} from 'lucide-react';

// Lazy load tab content for performance
const InsightsTab = lazy(() => import('./tabs/InsightsTab'));
const RoadmapTab = lazy(() => import('./tabs/RoadmapTab'));
const PredictionsTab = lazy(() => import('./tabs/PredictionsTab'));
const ThreatsTab = lazy(() => import('./tabs/ThreatsTab'));
const CompetitiveTab = lazy(() => import('./tabs/CompetitiveTab'));

interface DashboardTabsProps {
    projectId: string;
    projectSlug: string;
    briefing: any; // DailyBriefingContent
    metrics: any; // DashboardMetrics
}

interface Tab {
    id: string;
    label: string;
    icon: React.ElementType;
}

const tabs: Tab[] = [
    { id: 'insights', label: 'Insights', icon: FileBarChart },
    { id: 'roadmap', label: 'Roadmap', icon: BarChart3 },
    { id: 'predictions', label: 'Predictions', icon: TrendingUp },
    { id: 'threats', label: 'Threats', icon: Shield },
    { id: 'competitive', label: 'Competitive', icon: Target },
];

function TabLoader() {
    return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
        </div>
    );
}

export function DashboardTabs({ projectId, projectSlug, briefing, metrics }: DashboardTabsProps) {
    const [activeTab, setActiveTab] = useState('insights');

    return (
        <div className="mt-6">
            {/* Tab Navigation */}
            <div className="border-b border-slate-800 mb-6">
                <div className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all relative ${activeTab === tab.id
                                ? 'text-white'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                <Suspense fallback={<TabLoader />}>
                    {activeTab === 'insights' && (
                        <InsightsTab projectId={projectId} projectSlug={projectSlug} metrics={metrics} />
                    )}
                    {activeTab === 'roadmap' && (
                        <RoadmapTab projectId={projectId} projectSlug={projectSlug} briefing={briefing} metrics={metrics} />
                    )}
                    {activeTab === 'predictions' && (
                        <PredictionsTab projectId={projectId} projectSlug={projectSlug} />
                    )}
                    {activeTab === 'threats' && (
                        <ThreatsTab projectId={projectId} projectSlug={projectSlug} briefing={briefing} />
                    )}
                    {activeTab === 'competitive' && (
                        <CompetitiveTab projectId={projectId} projectSlug={projectSlug} metrics={metrics} />
                    )}
                </Suspense>
            </div>
        </div>
    );
}
