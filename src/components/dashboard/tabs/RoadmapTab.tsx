/**
 * RoadmapTab - Roadmap tab content for Dashboard
 * 
 * Contains: Opportunities, Roadmap Pulse, Live Experiments
 */

'use client';

import React from 'react';
import { BentoCard } from '../BentoCard';
import { LiveExperimentsCard } from '../LiveExperimentsCard';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface RoadmapTabProps {
    projectId: string;
    projectSlug: string;
    briefing: any;
    metrics: any;
}

export default function RoadmapTab({ projectId, projectSlug, briefing, metrics }: RoadmapTabProps) {
    return (
        <div className="space-y-6">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Opportunities */}
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-400" />
                            <h3 className="font-semibold text-white">Top Opportunities</h3>
                        </div>
                        <span className="text-xs text-slate-500">AI-ranked by impact</span>
                    </div>

                    {briefing?.opportunities?.length > 0 ? (
                        <div className="space-y-2">
                            {briefing.opportunities.slice(0, 5).map((opportunity: any, index: number) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 transition-colors hover:bg-slate-800/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl font-bold text-slate-600">#{index + 1}</span>
                                        <div>
                                            <div className="font-medium text-white">{opportunity.title}</div>
                                            <div className="text-xs text-slate-500">{opportunity.votes} votes</div>
                                        </div>
                                    </div>
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-medium ${opportunity.impact === 'high'
                                                ? 'bg-green-950/50 text-green-300'
                                                : opportunity.impact === 'medium'
                                                    ? 'bg-blue-950/50 text-blue-300'
                                                    : 'bg-slate-800 text-slate-300'
                                            }`}
                                    >
                                        {opportunity.impact} impact
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                            No opportunities identified yet
                        </div>
                    )}
                </div>

                {/* Roadmap Pulse */}
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800/50 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="h-5 w-5 text-blue-400" />
                        <h3 className="font-semibold text-white">Roadmap Pulse</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50">
                            <span className="text-slate-400">In Progress</span>
                            <span className="text-2xl font-bold text-white">{metrics?.roadmap?.in_progress || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50">
                            <span className="text-slate-400">Planned</span>
                            <span className="text-2xl font-bold text-white">{metrics?.roadmap?.planned || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50">
                            <span className="text-slate-400">Completed This Week</span>
                            <span className="text-2xl font-bold text-green-400">{metrics?.roadmap?.completed_this_week || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Experiments - Full Width */}
            <LiveExperimentsCard projectId={projectId} projectSlug={projectSlug} />
        </div>
    );
}
