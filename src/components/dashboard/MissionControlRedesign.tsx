'use client';

/**
 * MissionControlRedesign - Option C AI Agent Interface
 * 
 * From implementation_plan.md:
 * 1. AI Greeting Card - Personalized, warm tone
 * 2. Contextual Action Cards - AI surfaces 2-4 priority items
 * 3. Quick Stats Strip - Sentiment, WAU, feedback velocity
 * 4. Dynamic Context Panel - Expands when clicking any card
 * 
 * Colors:
 * - Background: #1a1d23 (deep slate)
 * - Cards: #2d3139 (warmer gray)
 * - Primary: #14b8a6 (teal)
 * - Accent: #f59e0b (warm gold)
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    Bot,
    Users,
    ThumbsUp,
    Swords
} from 'lucide-react';

interface ActionCard {
    id: string;
    type: 'churn' | 'theme' | 'outcome' | 'competitor';
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
}

interface ActivityItem {
    id: string;
    icon: 'feedback' | 'theme' | 'system';
    title: string;
    time: string;
}

interface MissionControlRedesignProps {
    userName?: string;
    projectSlug: string;
    projectId: string;
    actionCards?: ActionCard[];
    activityItems?: ActivityItem[];
    sentimentStatus?: 'positive' | 'neutral' | 'negative';
    // Stats
    wau?: number;
    feedbackVelocity?: number;
    sentimentScore?: number;
}

export function MissionControlRedesign({
    userName = 'there',
    projectSlug,
    projectId,
    actionCards,
    activityItems,
    sentimentStatus = 'positive',
    wau = 0,
    feedbackVelocity = 0,
    sentimentScore = 0,
}: MissionControlRedesignProps) {
    // Get time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    // Default action cards matching implementation plan
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
            time: '5 mins ago',
        },
        {
            id: '2',
            icon: 'theme',
            title: "New theme 'Data Export' is gaining traction",
            time: '20 mins ago',
        },
        {
            id: '3',
            icon: 'system',
            title: 'System performance is stable - All systems go',
            time: '1 hour ago',
        },
    ];

    const cards = actionCards || defaultActionCards;
    const activities = activityItems || defaultActivityItems;

    // Card styles based on type
    const getCardStyle = (type: ActionCard['type']) => {
        switch (type) {
            case 'churn':
                return { borderColor: '#f59e0b', bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, transparent 100%)' };
            case 'theme':
                return { borderColor: '#14b8a6', bgGradient: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, transparent 100%)' };
            case 'outcome':
                return { borderColor: '#10b981', bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, transparent 100%)' };
            case 'competitor':
                return { borderColor: '#8b5cf6', bgGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, transparent 100%)' };
        }
    };

    const getCardIcon = (type: ActionCard['type']) => {
        switch (type) {
            case 'churn':
                return <AlertTriangle className="w-6 h-6" style={{ color: '#f59e0b' }} />;
            case 'theme':
                return <Lightbulb className="w-6 h-6" style={{ color: '#14b8a6' }} />;
            case 'outcome':
                return <CheckCircle className="w-6 h-6" style={{ color: '#10b981' }} />;
            case 'competitor':
                return <Swords className="w-6 h-6" style={{ color: '#8b5cf6' }} />;
        }
    };

    const getButtonStyle = (type: ActionCard['type']) => {
        switch (type) {
            case 'churn':
                return { backgroundColor: '#f59e0b' };
            case 'theme':
                return { backgroundColor: '#14b8a6' };
            case 'outcome':
                return { backgroundColor: '#10b981' };
            case 'competitor':
                return { backgroundColor: '#8b5cf6' };
        }
    };

    const getActivityIcon = (icon: ActivityItem['icon']) => {
        switch (icon) {
            case 'feedback':
                return <MessageSquare className="w-4 h-4" style={{ color: '#14b8a6' }} />;
            case 'theme':
                return <TrendingUp className="w-4 h-4" style={{ color: '#f59e0b' }} />;
            case 'system':
                return <Activity className="w-4 h-4" style={{ color: '#10b981' }} />;
        }
    };

    return (
        <div className="flex gap-6 p-6" style={{ backgroundColor: '#1a1d23', minHeight: '100vh' }}>
            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="mb-2">
                    <p className="text-sm text-gray-400 mb-2">AI Agent Mission Control</p>
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
                        <div
                            className="w-24 h-24 rounded-full flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
                                border: '1px solid rgba(20, 184, 166, 0.3)'
                            }}
                        >
                            <Bot className="w-12 h-12" style={{ color: '#14b8a6' }} />
                        </div>
                    </div>
                </div>

                {/* Quick Stats Strip */}
                <div
                    className="grid grid-cols-3 gap-4 mb-8 p-4 rounded-xl"
                    style={{ backgroundColor: '#2d3139' }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)' }}
                        >
                            <Activity className="w-5 h-5" style={{ color: '#14b8a6' }} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Sentiment</p>
                            <p className="text-lg font-semibold text-white">{sentimentScore > 0 ? `+${sentimentScore}%` : 'Positive'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)' }}
                        >
                            <Users className="w-5 h-5" style={{ color: '#14b8a6' }} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">WAU</p>
                            <p className="text-lg font-semibold text-white">{wau || '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)' }}
                        >
                            <ThumbsUp className="w-5 h-5" style={{ color: '#14b8a6' }} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Feedback Velocity</p>
                            <p className="text-lg font-semibold text-white">{feedbackVelocity || '—'}/wk</p>
                        </div>
                    </div>
                </div>

                {/* Contextual Action Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {cards.map((card) => {
                        const style = getCardStyle(card.type);
                        return (
                            <Card
                                key={card.id}
                                className="border-2 transition-all duration-300 hover:scale-[1.02]"
                                style={{
                                    borderColor: style.borderColor,
                                    background: style.bgGradient,
                                    backgroundColor: '#2d3139'
                                }}
                            >
                                <CardContent className="p-5">
                                    {/* Icon */}
                                    <div className="mb-4">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                                        >
                                            {getCardIcon(card.type)}
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-semibold text-white mb-2">
                                        {card.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                                        {card.description}
                                    </p>

                                    {/* Action Button */}
                                    <Link href={card.actionHref}>
                                        <Button
                                            size="sm"
                                            className="w-full text-white border-0"
                                            style={getButtonStyle(card.type)}
                                        >
                                            {card.actionLabel}
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Right Panel - Dynamic Context */}
            <div className="w-80 flex-shrink-0">
                <Card style={{ backgroundColor: '#2d3139', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="p-4 border-b border-white/10">
                        <h3 className="text-lg font-semibold text-white">
                            Dynamic Context
                        </h3>
                    </div>
                    <CardContent className="p-4 space-y-6">
                        {/* User Sentiment Pulse */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-300">User Sentiment Pulse</span>
                                <ArrowRight className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: sentimentStatus === 'positive' ? '#10b981' : sentimentStatus === 'negative' ? '#ef4444' : '#f59e0b' }}
                                />
                                <span
                                    className="text-sm"
                                    style={{ color: sentimentStatus === 'positive' ? '#10b981' : sentimentStatus === 'negative' ? '#ef4444' : '#f59e0b' }}
                                >
                                    {sentimentStatus === 'positive' ? 'Generally Positive' : sentimentStatus === 'negative' ? 'Needs Attention' : 'Neutral'}
                                </span>
                            </div>
                            {/* Sentiment Chart */}
                            <div
                                className="mt-3 h-16 rounded-lg flex items-end justify-center gap-1 p-2"
                                style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                            >
                                {[40, 60, 45, 70, 55, 80, 65].map((height, i) => (
                                    <div
                                        key={i}
                                        className="w-4 rounded-t"
                                        style={{ height: `${height}%`, backgroundColor: 'rgba(20, 184, 166, 0.6)' }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-white/10" />

                        {/* Recent Activity & Insights */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-300 mb-4">
                                Recent Activity & Insights
                            </h4>
                            <div className="space-y-3">
                                {activities.map((activity) => (
                                    <div key={activity.id} className="flex items-start gap-3">
                                        <div className="mt-0.5">
                                            {getActivityIcon(activity.icon)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-300 leading-snug">
                                                {activity.title}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
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
