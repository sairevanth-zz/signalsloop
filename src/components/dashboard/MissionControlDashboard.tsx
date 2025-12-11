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
            style={{ backgroundColor: '#0f1419' }}
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
                            backgroundColor: '#1a1f2e',
                            border: '1px solid rgba(255,255,255,0.08)'
                        }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">
                                Dynamic Context
                            </h3>
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                        </div>

                        {/* Chat Input */}
                        <div
                            className="flex items-center gap-2 p-3 rounded-lg mb-5"
                            style={{ backgroundColor: '#252b38' }}
                        >
                            <input
                                type="text"
                                placeholder="Chat with the Page"
                                className="flex-1 bg-transparent text-sm text-gray-400 outline-none placeholder:text-gray-500"
                            />
                            <MessageSquare className="w-4 h-4 text-teal-500" />
                        </div>

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

// Robot Illustration Component - Vibrant 3D-style matching reference
function RobotIllustration() {
    return (
        <div className="relative">
            {/* Glow effect behind robot */}
            <div
                className="absolute inset-0 rounded-full blur-xl"
                style={{
                    background: 'radial-gradient(circle, rgba(20, 184, 166, 0.3) 0%, transparent 70%)',
                    transform: 'scale(1.3)'
                }}
            />
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                {/* Antenna */}
                <line x1="50" y1="30" x2="50" y2="15" stroke="#3d4a5c" strokeWidth="4" strokeLinecap="round" />
                <circle cx="50" cy="10" r="7" fill="url(#antennaGlow)" />
                <circle cx="50" cy="10" r="5" fill="#fbbf24" />
                <circle cx="50" cy="10" r="3" fill="#f59e0b" />

                {/* Main Head - Rounded Rectangle with 3D effect */}
                <rect x="17" y="30" width="66" height="55" rx="14" fill="url(#headGradient)" />
                <rect x="19" y="32" width="62" height="51" rx="12" fill="#2d3640" />

                {/* Face Screen */}
                <rect x="24" y="37" width="52" height="40" rx="10" fill="#1a1f2a" />

                {/* Eyes - Glowing Teal */}
                <ellipse cx="38" cy="55" rx="8" ry="9" fill="url(#eyeGlow)" />
                <ellipse cx="38" cy="55" rx="6" ry="7" fill="#14b8a6" />
                <ellipse cx="40" cy="53" rx="2" ry="2.5" fill="#5eead4" />

                <ellipse cx="62" cy="55" rx="8" ry="9" fill="url(#eyeGlow)" />
                <ellipse cx="62" cy="55" rx="6" ry="7" fill="#14b8a6" />
                <ellipse cx="64" cy="53" rx="2" ry="2.5" fill="#5eead4" />

                {/* Smile/Mouth */}
                <path d="M40 68 Q50 75 60 68" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" fill="none" />

                {/* Side Ears/Speakers */}
                <rect x="8" y="48" width="8" height="18" rx="4" fill="#3d4a5c" />
                <rect x="84" y="48" width="8" height="18" rx="4" fill="#3d4a5c" />

                <defs>
                    <linearGradient id="headGradient" x1="50" y1="30" x2="50" y2="85" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#4a5568" />
                        <stop offset="100%" stopColor="#2d3748" />
                    </linearGradient>
                    <radialGradient id="eyeGlow" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0%" stopColor="#14b8a6" />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="antennaGlow" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0%" stopColor="#fcd34d" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
                    </radialGradient>
                </defs>
            </svg>
        </div>
    );
}

// Action Card Component - Using Tailwind class for guaranteed dark background
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
    // Pure inline styles - NO Tailwind classes to ensure nothing can override
    const cardStyles: React.CSSProperties = {
        backgroundColor: '#2a2f38',
        background: '#2a2f38',
        backgroundImage: 'none',
        borderRadius: '16px',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        border: `2px solid ${borderColor}`,
        boxShadow: `0 0 30px ${borderColor}40`,
    };

    return (
        <div style={cardStyles}>
            {/* Content wrapper */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Icon */}
                <div
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                        backgroundColor: `${borderColor}20`
                    }}
                >
                    {icon}
                </div>

                {/* Title */}
                <h3 style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#ffffff',
                    marginBottom: '8px'
                }}>
                    {title}
                </h3>

                {/* Description */}
                <p style={{
                    fontSize: '14px',
                    color: '#9ca3af',
                    marginBottom: '16px',
                    lineHeight: 1.5
                }}>
                    {description}
                </p>

                {/* Button */}
                <Link
                    href={href}
                    style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'center',
                        color: 'white',
                        fontWeight: 500,
                        padding: '10px 16px',
                        borderRadius: '8px',
                        backgroundColor: buttonColor,
                        textDecoration: 'none'
                    }}
                >
                    {buttonLabel}
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
