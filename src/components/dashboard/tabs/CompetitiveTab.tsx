/**
 * CompetitiveTab - Competitive Intelligence tab content for Dashboard
 * 
 * Contains: Competitive Intelligence overview, links to War Room and full Intel
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Swords, Target, ChevronRight, TrendingUp, AlertTriangle } from 'lucide-react';

interface CompetitiveTabProps {
    projectId: string;
    projectSlug: string;
    metrics: any;
}

export default function CompetitiveTab({ projectId, projectSlug, metrics }: CompetitiveTabProps) {
    const competitors = metrics?.competitors || {};
    const hasInsights = (competitors.new_insights_count || 0) > 0;

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800/50 p-6 text-center">
                    <div className="text-3xl font-bold text-white mb-1">{competitors.competitors_tracked || 0}</div>
                    <div className="text-sm text-slate-400">Competitors Tracked</div>
                </div>
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800/50 p-6 text-center">
                    <div className="text-3xl font-bold text-teal-400 mb-1">{competitors.new_insights_count || 0}</div>
                    <div className="text-sm text-slate-400">New Insights (7d)</div>
                </div>
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800/50 p-6 text-center">
                    <div className="text-3xl font-bold text-red-400 mb-1">{competitors.high_priority_count || 0}</div>
                    <div className="text-sm text-slate-400">High Priority</div>
                </div>
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800/50 p-6 text-center">
                    <div className="text-3xl font-bold text-green-400 mb-1">{competitors.opportunities_count || 0}</div>
                    <div className="text-sm text-slate-400">Opportunities</div>
                </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* War Room */}
                <Link href={`/${projectSlug}/war-room`} className="group">
                    <div className="rounded-2xl bg-gradient-to-br from-orange-950/30 to-slate-900 border border-orange-500/20 p-6 hover:border-orange-500/40 transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-xl bg-orange-500/20">
                                <Swords className="w-6 h-6 text-orange-400" />
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-orange-400 transition-colors" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Competitor War Room</h3>
                        <p className="text-slate-400 text-sm mb-4">
                            Real-time monitoring of competitor activities, job postings, product updates, and market moves.
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Live updates
                            </span>
                            <span className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {competitors.high_priority_count || 0} alerts
                            </span>
                        </div>
                    </div>
                </Link>

                {/* Competitive Intelligence */}
                <Link href={`/${projectSlug}/competitive`} className="group">
                    <div className="rounded-2xl bg-gradient-to-br from-teal-950/30 to-slate-900 border border-teal-500/20 p-6 hover:border-teal-500/40 transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-xl bg-teal-500/20">
                                <Shield className="w-6 h-6 text-teal-400" />
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-teal-400 transition-colors" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Competitive Intelligence</h3>
                        <p className="text-slate-400 text-sm mb-4">
                            Feature gap analysis, strengths & weaknesses comparison, and strategic recommendations.
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                AI analysis
                            </span>
                            <span className="flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                {competitors.new_insights_count || 0} insights
                            </span>
                        </div>
                    </div>
                </Link>
            </div>

            {/* No Data State */}
            {!hasInsights && (
                <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
                        <Target className="w-8 h-8 text-teal-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Set Up Competitive Tracking</h3>
                    <p className="text-slate-400 text-sm mb-4 max-w-md mx-auto">
                        Add competitors to start receiving AI-powered insights about their product updates, pricing changes, and market movements.
                    </p>
                    <Link
                        href={`/${projectSlug}/settings/competitors`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors"
                    >
                        Add Competitors
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            )}
        </div>
    );
}
