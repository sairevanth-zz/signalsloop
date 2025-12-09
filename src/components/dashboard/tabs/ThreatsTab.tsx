/**
 * ThreatsTab - Threats tab content for Dashboard
 * 
 * Contains: Active Threats, Anomaly Alerts, Cross-Tool Signals
 */

'use client';

import React from 'react';
import { AnomalyAlertCard } from '../AnomalyAlertCard';
import { CrossToolPanel } from '../CrossToolPanel';
import { Shield } from 'lucide-react';

interface ThreatsTabProps {
    projectId: string;
    projectSlug: string;
    briefing: any;
}

export default function ThreatsTab({ projectId, projectSlug, briefing }: ThreatsTabProps) {
    const threats = briefing?.threats || [];

    return (
        <div className="space-y-6">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Threats */}
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-400" />
                            <h3 className="font-semibold text-white">Active Threats</h3>
                        </div>
                        {threats.length > 0 && (
                            <span className="rounded-full bg-red-950/50 px-2 py-1 text-xs font-medium text-red-300">
                                {threats.length} Active
                            </span>
                        )}
                    </div>

                    {threats.length > 0 ? (
                        <ul className="space-y-3">
                            {threats.map((threat: any, index: number) => (
                                <li key={index} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50">
                                    <span
                                        className={
                                            threat.severity === 'high'
                                                ? 'text-red-400'
                                                : threat.severity === 'medium'
                                                    ? 'text-orange-400'
                                                    : 'text-yellow-400'
                                        }
                                    >
                                        {threat.severity === 'high' ? '🔴' : threat.severity === 'medium' ? '🟡' : '🟢'}
                                    </span>
                                    <div className="flex-1">
                                        <div className="text-slate-200 font-medium">{threat.title}</div>
                                        <div className="text-xs text-slate-500 capitalize mt-1">{threat.severity} priority</div>
                                        {threat.description && (
                                            <p className="text-sm text-slate-400 mt-2">{threat.description}</p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                                <Shield className="w-6 h-6 text-green-400" />
                            </div>
                            <p className="text-green-400 font-medium">No Active Threats</p>
                            <p className="text-sm text-slate-500 mt-1">All systems looking healthy</p>
                        </div>
                    )}
                </div>

                {/* Anomaly Alerts */}
                <AnomalyAlertCard projectId={projectId} />
            </div>

            {/* Cross-Tool Analysis - Full Width */}
            <CrossToolPanel projectId={projectId} />
        </div>
    );
}
