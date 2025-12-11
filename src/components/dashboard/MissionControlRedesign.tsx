'use client';

/**
 * MissionControlRedesign - Matches approved mockup exactly
 * 
 * Layout:
 * - Left: WorkflowSidebar (handled by layout)
 * - Center: AI Greeting + 3 Contextual Action Cards
 * - Right: Dynamic Context Panel (Sentiment + Activity)
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
    AlertTriangle,
    Lightbulb,
    CheckCircle,
    TrendingUp,
    MessageSquare,
    ArrowRight,
    Activity,
    Sparkles,
    Bot
} from 'lucide-react';

interface ActionCard {
    id: string;
    type: 'churn' | 'theme' | 'outcome';
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
}

interface ActivityItem {
    id: string;
    icon: 'feedback' | 'theme' | 'system';
    title: string;
    subtitle: string;
    time: string;
}

interface MissionControlRedesignProps {
    userName?: string;
    projectSlug: string;
    projectId: string;
    // Data for action cards
    actionCards?: ActionCard[];
    // Data for activity feed
    activityItems?: ActivityItem[];
    // Sentiment
    sentimentStatus?: 'positive' | 'neutral' | 'negative';
}

export function MissionControlRedesign({
    userName = 'there',
    projectSlug,
    projectId,
    actionCards,
    activityItems,
    sentimentStatus = 'positive',
}: MissionControlRedesignProps) {
    // Get time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    // Default action cards matching mockup
    const defaultActionCards: ActionCard[] = [
        {
            id: '1',
            type: 'churn',
            title: 'Churn Risk Alert',
            description: "High churn probability detected for 'Acme Corp' based on usage patterns. View details and take action.",
            actionLabel: 'Review & Act',
            actionHref: `/${projectSlug}/churn-radar`,
        },
        {
            id: '2',
            type: 'theme',
            title: 'New Theme Detected',
            description: "AI has identified a burgeoning theme in user feedback related to 'Performance Issues'. Explore insights.",
            actionLabel: 'Explore Theme',
            actionHref: `/${projectSlug}/ai-insights`,
        },
        {
            id: '3',
            type: 'outcome',
            title: 'Roadmap Item Outcome Ready',
            description: "'Q3 Feature Launch' outcome analysis is complete. See the impact on user engagement.",
            actionLabel: 'View Outcomes',
            actionHref: `/${projectSlug}/outcomes`,
        },
    ];

    // Default activity items
    const defaultActivityItems: ActivityItem[] = [
        {
            id: '1',
            icon: 'feedback',
            title: "User 'Sarah L.' submitted feedback regarding 'Integration API'",
            subtitle: '',
            time: '5 mins ago',
        },
        {
            id: '2',
            icon: 'theme',
            title: "New theme 'Data Export' is gaining traction",
            subtitle: '',
            time: '20 mins ago',
        },
        {
            id: '3',
            icon: 'system',
            title: 'System performance is stable - All systems go',
            subtitle: '',
            time: '1 hour ago',
        },
    ];

    const cards = actionCards || defaultActionCards;
    const activities = activityItems || defaultActivityItems;

    // Card border colors based on type
    const getCardStyle = (type: ActionCard['type']) => {
        switch (type) {
            case 'churn':
                return 'border-amber-500/50 hover:border-amber-500/80 bg-gradient-to-br from-amber-950/20 to-transparent';
            case 'theme':
                return 'border-teal-500/50 hover:border-teal-500/80 bg-gradient-to-br from-teal-950/20 to-transparent';
            case 'outcome':
                return 'border-emerald-500/50 hover:border-emerald-500/80 bg-gradient-to-br from-emerald-950/20 to-transparent';
        }
    };

    const getCardIcon = (type: ActionCard['type']) => {
        switch (type) {
            case 'churn':
                return <AlertTriangle className="w-6 h-6 text-amber-400" />;
            case 'theme':
                return <Lightbulb className="w-6 h-6 text-teal-400" />;
            case 'outcome':
                return <CheckCircle className="w-6 h-6 text-emerald-400" />;
        }
    };

    const getButtonStyle = (type: ActionCard['type']) => {
        switch (type) {
            case 'churn':
                return 'bg-amber-600 hover:bg-amber-700 text-white';
            case 'theme':
                return 'bg-teal-600 hover:bg-teal-700 text-white';
            case 'outcome':
                return 'bg-emerald-600 hover:bg-emerald-700 text-white';
        }
    };

    const getActivityIcon = (icon: ActivityItem['icon']) => {
        switch (icon) {
            case 'feedback':
                return <MessageSquare className="w-4 h-4 text-teal-400" />;
            case 'theme':
                return <TrendingUp className="w-4 h-4 text-amber-400" />;
            case 'system':
                return <Activity className="w-4 h-4 text-emerald-400" />;
        }
    };

    const getSentimentColor = () => {
        switch (sentimentStatus) {
            case 'positive':
                return 'text-emerald-400';
            case 'negative':
                return 'text-red-400';
            default:
                return 'text-amber-400';
        }
    };

    const getSentimentLabel = () => {
        switch (sentimentStatus) {
            case 'positive':
                return 'Generally Positive';
            case 'negative':
                return 'Needs Attention';
            default:
                return 'Neutral';
        }
    };

    return (
        <div className="flex gap-6 p-6">
            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="mb-2">
                    <p className="text-sm text-slate-400 mb-2">AI Agent Mission Control</p>
                </div>

                {/* AI Greeting Section */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-light text-white mb-2">
                            {getGreeting()}, {userName}.
                        </h1>
                        <p className="text-3xl font-light text-white">
                            Here's what needs your attention.
                        </p>
                    </div>
                    {/* Robot Illustration */}
                    <div className="flex-shrink-0 ml-8">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center border border-teal-500/30">
                            <Bot className="w-12 h-12 text-teal-400" />
                        </div>
                    </div>
                </div>

                {/* Action Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {cards.map((card) => (
                        <Card
                            key={card.id}
                            className={`border-2 transition-all duration-300 ${getCardStyle(card.type)} bg-slate-900/50`}
                        >
                            <CardContent className="p-5">
                                {/* Icon */}
                                <div className="mb-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center">
                                        {getCardIcon(card.type)}
                                    </div>
                                </div>

                                {/* Title */}
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    {card.title}
                                </h3>

                                {/* Description */}
                                <p className="text-sm text-slate-400 mb-4 line-clamp-3">
                                    {card.description}
                                </p>

                                {/* Action Button */}
                                <Link href={card.actionHref}>
                                    <Button
                                        size="sm"
                                        className={`w-full ${getButtonStyle(card.type)}`}
                                    >
                                        {card.actionLabel}
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Right Panel - Dynamic Context */}
            <div className="w-80 flex-shrink-0">
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold text-white">
                            Dynamic Context
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* User Sentiment Pulse */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-300">User Sentiment Pulse</span>
                                <ArrowRight className="w-4 h-4 text-slate-500" />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${sentimentStatus === 'positive' ? 'bg-emerald-400' : sentimentStatus === 'negative' ? 'bg-red-400' : 'bg-amber-400'}`} />
                                <span className={`text-sm ${getSentimentColor()}`}>
                                    {getSentimentLabel()}
                                </span>
                            </div>
                            {/* Sentiment Chart Placeholder */}
                            <div className="mt-3 h-16 rounded-lg bg-slate-800/50 flex items-end justify-center gap-1 p-2">
                                {[40, 60, 45, 70, 55, 80, 65].map((height, i) => (
                                    <div
                                        key={i}
                                        className="w-4 bg-teal-500/60 rounded-t"
                                        style={{ height: `${height}%` }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-800" />

                        {/* Recent Activity & Insights */}
                        <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-4">
                                Recent Activity & Insights
                            </h4>
                            <div className="space-y-3">
                                {activities.map((activity) => (
                                    <div key={activity.id} className="flex items-start gap-3">
                                        <div className="mt-0.5">
                                            {getActivityIcon(activity.icon)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-300 leading-snug">
                                                {activity.title}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {activity.time}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default MissionControlRedesign;
