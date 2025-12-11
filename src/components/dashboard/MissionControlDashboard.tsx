'use client';

/**
 * MissionControlDashboard - Pixel-perfect match to approved mockup
 * 
 * Features:
 * - AI Greeting with robot illustration
 * - 3 Contextual Action Cards with glowing borders
 * - Dynamic Context panel with sentiment line chart
 * - Activity feed
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    AlertTriangle,
    Lightbulb,
    CheckCircle,
    MessageSquare,
    TrendingUp,
    Activity,
    ChevronRight
} from 'lucide-react';

interface MissionControlDashboardProps {
    userName?: string;
    projectSlug: string;
    projectId: string;
}

export function MissionControlDashboard({
    userName = 'Revanth',
    projectSlug,
}: MissionControlDashboardProps) {
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div
            className="min-h-screen p-6"
            style={{ backgroundColor: '#1e2228' }}
        >
            <div className="flex gap-6">
                {/* Main Content */}
                <div className="flex-1">
                    {/* Header Label */}
                    <p
                        className="text-sm font-medium mb-4"
                        style={{ color: '#14b8a6' }}
                    >
                        AI Agent Mission Control
                    </p>

                    {/* Greeting Section */}
                    <div className="flex items-start justify-between mb-10">
                        <div>
                            <h1
                                className="text-4xl font-light mb-2"
                                style={{
                                    color: '#e5e7eb',
                                    fontFamily: 'system-ui, -apple-system, sans-serif',
                                    letterSpacing: '-0.02em'
                                }}
                            >
                                {getGreeting()}, {userName}.
                            </h1>
                            <p
                                className="text-4xl font-light"
                                style={{
                                    color: '#e5e7eb',
                                    fontFamily: 'system-ui, -apple-system, sans-serif',
                                    letterSpacing: '-0.02em'
                                }}
                            >
                                Here's what needs your
                            </p>
                            <p
                                className="text-4xl font-light"
                                style={{
                                    color: '#e5e7eb',
                                    fontFamily: 'system-ui, -apple-system, sans-serif',
                                    letterSpacing: '-0.02em'
                                }}
                            >
                                attention.
                            </p>
                        </div>

                        {/* Robot Illustration */}
                        <div className="flex-shrink-0">
                            <RobotIllustration />
                        </div>
                    </div>

                    {/* Action Cards */}
                    <div className="grid grid-cols-3 gap-5">
                        {/* Churn Risk Alert - Gold border */}
                        <ActionCard
                            type="churn"
                            icon={<AlertTriangle className="w-6 h-6" style={{ color: '#fbbf24' }} />}
                            title="Churn Risk Alert"
                            description="High churn probability detected for 'Acme Corp' based on usage patterns. View details and take action."
                            buttonLabel="Review & Act"
                            href={`/${projectSlug}/churn-radar`}
                            borderColor="#fbbf24"
                            buttonColor="#fbbf24"
                        />

                        {/* New Theme Detected - Teal border */}
                        <ActionCard
                            type="theme"
                            icon={<Lightbulb className="w-6 h-6" style={{ color: '#14b8a6' }} />}
                            title="New Theme Detected"
                            description="AI has identified a burgeoning theme in user feedback related to 'Performance Issues'. Explore insights."
                            buttonLabel="Explore Theme"
                            href={`/${projectSlug}/ai-insights`}
                            borderColor="#14b8a6"
                            buttonColor="#14b8a6"
                        />

                        {/* Roadmap Outcome - Teal/Green border */}
                        <ActionCard
                            type="outcome"
                            icon={<CheckCircle className="w-6 h-6" style={{ color: '#10b981' }} />}
                            title="Roadmap Item Outcome Ready"
                            description="'Q3 Feature Launch' outcome analysis is complete. See the impact on user engagement."
                            buttonLabel="View Outcomes"
                            href={`/${projectSlug}/outcomes`}
                            borderColor="#10b981"
                            buttonColor="#10b981"
                        />
                    </div>
                </div>

                {/* Right Panel - Dynamic Context */}
                <div className="w-80 flex-shrink-0">
                    <div
                        className="rounded-2xl p-5"
                        style={{
                            backgroundColor: 'rgba(45, 50, 58, 0.6)',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        <h3 className="text-lg font-semibold text-white mb-5">
                            Dynamic Context
                        </h3>

                        {/* User Sentiment Pulse */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-300">User Sentiment Pulse</span>
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                                <span className="text-sm" style={{ color: '#10b981' }}>Generally Positive</span>
                            </div>
                            {/* Sentiment Chart */}
                            <SentimentChart />
                        </div>

                        <div className="border-t border-white/10 my-4" />

                        {/* Recent Activity */}
                        <div>
                            <h4 className="text-sm font-semibold text-white mb-4">
                                Recent Activity & Insights
                            </h4>
                            <div className="space-y-4">
                                <ActivityItem
                                    icon={<MessageSquare className="w-4 h-4" style={{ color: '#14b8a6' }} />}
                                    title="User 'Sarah L.' submitted feedback regarding 'Integration API'"
                                    time="5 mins ago"
                                />
                                <ActivityItem
                                    icon={<TrendingUp className="w-4 h-4" style={{ color: '#fbbf24' }} />}
                                    title="New theme 'Data Export' is gaining traction"
                                    time="20 mins ago"
                                />
                                <ActivityItem
                                    icon={<Activity className="w-4 h-4" style={{ color: '#14b8a6' }} />}
                                    title="System performance is stable - All systems go"
                                    time="1 hour ago"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Robot Illustration Component
function RobotIllustration() {
    return (
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Robot Head Background */}
            <ellipse cx="60" cy="65" rx="45" ry="40" fill="url(#robotGradient)" opacity="0.3" />

            {/* Robot Body */}
            <rect x="30" y="45" width="60" height="50" rx="12" fill="#2d3748" />
            <rect x="30" y="45" width="60" height="50" rx="12" fill="url(#bodyGradient)" />

            {/* Robot Face */}
            <rect x="35" y="50" width="50" height="35" rx="8" fill="#1a202c" />

            {/* Eyes */}
            <circle cx="48" cy="65" r="6" fill="#14b8a6" />
            <circle cx="72" cy="65" r="6" fill="#14b8a6" />
            <circle cx="50" cy="63" r="2" fill="white" />
            <circle cx="74" cy="63" r="2" fill="white" />

            {/* Smile */}
            <path d="M50 75 Q60 82 70 75" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Antenna */}
            <line x1="60" y1="45" x2="60" y2="30" stroke="#4a5568" strokeWidth="3" />
            <circle cx="60" cy="25" r="6" fill="#fbbf24" />
            <circle cx="60" cy="25" r="4" fill="#f59e0b" />

            {/* Ears */}
            <rect x="20" y="55" width="8" height="20" rx="3" fill="#4a5568" />
            <rect x="92" y="55" width="8" height="20" rx="3" fill="#4a5568" />

            <defs>
                <radialGradient id="robotGradient" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="bodyGradient" x1="30" y1="45" x2="30" y2="95">
                    <stop offset="0%" stopColor="#3d4852" />
                    <stop offset="100%" stopColor="#2d3748" />
                </linearGradient>
            </defs>
        </svg>
    );
}

// Action Card Component with glowing border
function ActionCard({
    icon,
    title,
    description,
    buttonLabel,
    href,
    borderColor,
    buttonColor,
}: {
    type: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    buttonLabel: string;
    href: string;
    borderColor: string;
    buttonColor: string;
}) {
    return (
        <div
            className="rounded-2xl p-5 relative overflow-hidden transition-transform hover:scale-[1.02]"
            style={{
                backgroundColor: '#2a2f38',
                border: `2px solid ${borderColor}40`,
                boxShadow: `0 0 20px ${borderColor}20, inset 0 1px 0 rgba(255,255,255,0.05)`
            }}
        >
            {/* Glow effect */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    background: `radial-gradient(ellipse at top left, ${borderColor} 0%, transparent 50%)`
                }}
            />

            <div className="relative z-10">
                {/* Icon */}
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${borderColor}15` }}
                >
                    {icon}
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-white mb-2">
                    {title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                    {description}
                </p>

                {/* Button */}
                <Link href={href}>
                    <Button
                        className="w-full text-white font-medium"
                        style={{ backgroundColor: buttonColor }}
                    >
                        {buttonLabel}
                    </Button>
                </Link>
            </div>
        </div>
    );
}

// Sentiment Chart Component
function SentimentChart() {
    return (
        <div
            className="h-20 rounded-lg overflow-hidden relative"
            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
        >
            <svg width="100%" height="100%" viewBox="0 0 280 80" preserveAspectRatio="none">
                {/* Gradient fill under line */}
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Area fill */}
                <path
                    d="M0,60 Q40,50 70,55 T140,40 T210,45 T280,30 L280,80 L0,80 Z"
                    fill="url(#chartGradient)"
                />

                {/* Line */}
                <path
                    d="M0,60 Q40,50 70,55 T140,40 T210,45 T280,30"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="2"
                />
            </svg>
        </div>
    );
}

// Activity Item Component
function ActivityItem({
    icon,
    title,
    time,
}: {
    icon: React.ReactNode;
    title: string;
    time: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 leading-snug">{title}</p>
                <p className="text-xs text-gray-500 mt-1">{time}</p>
            </div>
        </div>
    );
}

export default MissionControlDashboard;
