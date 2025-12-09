/**
 * AttentionStack - Priority alerts panel for Mission Control
 * 
 * Aggregates actionable items that need immediate attention:
 * - High-severity threats
 * - Anomaly alerts
 * - Action queue items
 * - Weekly insights ready
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
    Bell, ChevronRight, Clock, Shield, AlertTriangle,
    FileBarChart, Target, Zap, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

interface AttentionItem {
    id: string;
    type: 'critical' | 'warning' | 'info' | 'success';
    category: string;
    title: string;
    description: string;
    timestamp?: string;
    link?: string;
    count?: number;
}

interface AttentionStackProps {
    projectSlug: string;
    threats?: Array<{ title: string; severity: string }>;
    actionQueueCount?: number;
    hasWeeklyInsight?: boolean;
    anomalyCount?: number;
}

const typeStyles = {
    critical: {
        bg: 'bg-red-950/30',
        border: 'border-red-500/30 hover:border-red-500/50',
        dot: 'bg-red-500 animate-pulse',
        label: 'text-red-400',
        labelBg: 'bg-red-950/50',
    },
    warning: {
        bg: 'bg-amber-950/20',
        border: 'border-amber-500/20 hover:border-amber-500/40',
        dot: 'bg-amber-500',
        label: 'text-amber-400',
        labelBg: 'bg-amber-950/50',
    },
    info: {
        bg: 'bg-blue-950/20',
        border: 'border-blue-500/20 hover:border-blue-500/40',
        dot: 'bg-blue-500',
        label: 'text-blue-400',
        labelBg: 'bg-blue-950/50',
    },
    success: {
        bg: 'bg-green-950/20',
        border: 'border-green-500/20 hover:border-green-500/40',
        dot: 'bg-green-500',
        label: 'text-green-400',
        labelBg: 'bg-green-950/50',
    },
};

function AttentionItemCard({ item, projectSlug }: { item: AttentionItem; projectSlug: string }) {
    const styles = typeStyles[item.type];

    const content = (
        <div className={`p-4 rounded-xl ${styles.bg} border ${styles.border} transition-colors cursor-pointer group`}>
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${styles.dot}`} />
                <span className={`text-xs font-medium ${styles.label} uppercase tracking-wide`}>
                    {item.category}
                </span>
                {item.count && item.count > 1 && (
                    <span className={`px-1.5 py-0.5 rounded text-xs ${styles.labelBg} ${styles.label}`}>
                        {item.count}
                    </span>
                )}
            </div>
            <h4 className="text-white font-medium mb-1">{item.title}</h4>
            <p className="text-sm text-slate-400 mb-2">{item.description}</p>
            <div className="flex items-center justify-between">
                {item.timestamp && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {item.timestamp}
                    </div>
                )}
                <ChevronRight className={`w-4 h-4 text-slate-500 group-hover:${styles.label.replace('text-', 'text-')} transition-colors ml-auto`} />
            </div>
        </div>
    );

    if (item.link) {
        return <Link href={item.link}>{content}</Link>;
    }

    return content;
}

export function AttentionStack({
    projectSlug,
    threats = [],
    actionQueueCount = 0,
    hasWeeklyInsight = false,
    anomalyCount = 0
}: AttentionStackProps) {
    const [items, setItems] = useState<AttentionItem[]>([]);

    useEffect(() => {
        const newItems: AttentionItem[] = [];

        // High-priority threats
        const highThreats = threats.filter(t => t.severity === 'high');
        if (highThreats.length > 0) {
            newItems.push({
                id: 'threats',
                type: 'critical',
                category: 'Critical',
                title: `${highThreats.length} High-Priority Threat${highThreats.length > 1 ? 's' : ''}`,
                description: highThreats[0]?.title || 'Immediate attention required',
                timestamp: 'Just now',
                link: `/${projectSlug}/threats`,
                count: highThreats.length,
            });
        }

        // Anomaly alerts
        if (anomalyCount > 0) {
            newItems.push({
                id: 'anomalies',
                type: 'warning',
                category: 'Anomaly Detected',
                title: `${anomalyCount} Unusual Pattern${anomalyCount > 1 ? 's' : ''}`,
                description: 'Metrics deviation from baseline detected',
                timestamp: 'Today',
                link: `/${projectSlug}/analytics`,
                count: anomalyCount,
            });
        }

        // Action queue items
        if (actionQueueCount > 0) {
            newItems.push({
                id: 'actions',
                type: 'warning',
                category: 'Actions Due',
                title: `${actionQueueCount} Item${actionQueueCount > 1 ? 's' : ''} in Queue`,
                description: 'Review and prioritize pending actions',
                timestamp: 'Due today',
                link: `/${projectSlug}/actions`,
                count: actionQueueCount,
            });
        }

        // Weekly insight ready
        if (hasWeeklyInsight) {
            newItems.push({
                id: 'insight',
                type: 'info',
                category: 'Ready',
                title: 'Weekly Insight Report',
                description: 'New patterns detected in user behavior',
                timestamp: 'Generated today',
                link: `/${projectSlug}/insights`,
            });
        }

        // If no items, show all-clear message
        if (newItems.length === 0) {
            newItems.push({
                id: 'all-clear',
                type: 'success',
                category: 'All Clear',
                title: 'No Immediate Actions',
                description: 'Everything looks good! No urgent items require attention.',
                timestamp: 'Last checked 5m ago',
            });
        }

        setItems(newItems);
    }, [threats, actionQueueCount, hasWeeklyInsight, anomalyCount, projectSlug]);

    return (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/50 p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-400" />
                    Needs Attention
                </h3>
                <span className="text-xs text-slate-500">
                    {items.filter(i => i.id !== 'all-clear').length} items
                </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
                {items.map((item) => (
                    <AttentionItemCard key={item.id} item={item} projectSlug={projectSlug} />
                ))}
            </div>

            <button className="w-full mt-4 py-3 text-sm text-slate-400 hover:text-white transition-colors border border-slate-800 rounded-xl hover:bg-slate-800/50">
                View All Notifications →
            </button>
        </div>
    );
}

export function AttentionStackSkeleton() {
    return (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/50 p-5 h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-32 bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-16 bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-800/50 animate-pulse">
                        <div className="h-4 w-20 bg-slate-700 rounded mb-2" />
                        <div className="h-5 w-3/4 bg-slate-700 rounded mb-2" />
                        <div className="h-4 w-1/2 bg-slate-700 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
