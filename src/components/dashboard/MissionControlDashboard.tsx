'use client';

/**
 * MissionControlDashboard - EXACT match to reference mockup
 * 
 * Key elements from reference:
 * 1. Very dark charcoal background (~#0d1117)
 * 2. Vibrant card glows with colored borders
 * 3. Cute robot with teal glow
 * 4. Smooth line chart in Dynamic Context
 * 5. Clean typography with proper weights
 */

import React from 'react';
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
            style={{
                minHeight: '100vh',
                padding: '24px',
                backgroundColor: '#0d1117',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
        >
            <div style={{ display: 'flex', gap: '24px' }}>
                {/* Main Content */}
                <div style={{ flex: 1 }}>
                    {/* Header Label */}
                    <p style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#14b8a6',
                        marginBottom: '16px',
                        letterSpacing: '0.02em'
                    }}>
                        AI Agent Mission Control
                    </p>

                    {/* Greeting Section */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: '40px'
                    }}>
                        <div>
                            <h1 style={{
                                fontSize: '36px',
                                fontWeight: 300,
                                color: '#e6edf3',
                                margin: 0,
                                lineHeight: 1.3,
                                letterSpacing: '-0.02em'
                            }}>
                                {getGreeting()}, {userName}.
                            </h1>
                            <p style={{
                                fontSize: '36px',
                                fontWeight: 300,
                                color: '#e6edf3',
                                margin: 0,
                                lineHeight: 1.3,
                                letterSpacing: '-0.02em'
                            }}>
                                Here's what needs your
                            </p>
                            <p style={{
                                fontSize: '36px',
                                fontWeight: 300,
                                color: '#e6edf3',
                                margin: 0,
                                lineHeight: 1.3,
                                letterSpacing: '-0.02em'
                            }}>
                                attention.
                            </p>
                        </div>

                        {/* Robot Illustration */}
                        <RobotIllustration />
                    </div>

                    {/* Action Cards Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '20px'
                    }}>
                        {/* Churn Risk Alert - Gold/Amber */}
                        <ActionCard
                            icon={<AlertTriangle style={{ width: '24px', height: '24px', color: '#fbbf24' }} />}
                            title="Churn Risk Alert"
                            description="High churn probability detected for 'Acme Corp' based on usage patterns. View details and take action."
                            buttonLabel="Review & Act"
                            href={`/${projectSlug}/churn-radar`}
                            accentColor="#fbbf24"
                        />

                        {/* New Theme Detected - Teal */}
                        <ActionCard
                            icon={<Lightbulb style={{ width: '24px', height: '24px', color: '#14b8a6' }} />}
                            title="New Theme Detected"
                            description="AI has identified a burgeoning theme in user feedback related to 'Performance Issues'. Explore insights."
                            buttonLabel="Explore Theme"
                            href={`/${projectSlug}/ai-insights`}
                            accentColor="#14b8a6"
                        />

                        {/* Roadmap Outcome - Emerald */}
                        <ActionCard
                            icon={<CheckCircle style={{ width: '24px', height: '24px', color: '#10b981' }} />}
                            title="Roadmap Item Outcome Ready"
                            description="'Q3 Feature Launch' outcome analysis is complete. See the impact on user engagement."
                            buttonLabel="View Outcomes"
                            href={`/${projectSlug}/outcomes`}
                            accentColor="#10b981"
                        />
                    </div>
                </div>

                {/* Right Panel - Dynamic Context */}
                <div style={{ width: '320px', flexShrink: 0 }}>
                    <div style={{
                        backgroundColor: '#161b22',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '16px'
                        }}>
                            <h3 style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: '#e6edf3',
                                margin: 0
                            }}>
                                Dynamic Context
                            </h3>
                            <ChevronRight style={{ width: '16px', height: '16px', color: '#6e7681' }} />
                        </div>

                        {/* Chat Input */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px',
                            backgroundColor: '#21262d',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <span style={{
                                flex: 1,
                                fontSize: '13px',
                                color: '#6e7681'
                            }}>
                                Chat with the Page
                            </span>
                            <MessageSquare style={{ width: '16px', height: '16px', color: '#14b8a6' }} />
                        </div>

                        {/* User Sentiment Pulse */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '8px'
                            }}>
                                <span style={{ fontSize: '13px', fontWeight: 500, color: '#8b949e' }}>
                                    User Sentiment Pulse
                                </span>
                                <ChevronRight style={{ width: '14px', height: '14px', color: '#6e7681' }} />
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '12px'
                            }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#10b981'
                                }} />
                                <span style={{ fontSize: '13px', color: '#10b981' }}>
                                    Generally Positive
                                </span>
                            </div>
                            {/* Sentiment Chart */}
                            <SentimentLineChart />
                        </div>

                        <div style={{
                            height: '1px',
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            margin: '16px 0'
                        }} />

                        {/* Recent Activity */}
                        <div>
                            <h4 style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#e6edf3',
                                margin: '0 0 16px 0'
                            }}>
                                Recent Activity & Insights
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <ActivityItem
                                    icon={<MessageSquare style={{ width: '14px', height: '14px', color: '#14b8a6' }} />}
                                    title="User 'Sarah L.' submitted feedback regarding 'Integration API'"
                                    time="5 mins ago"
                                />
                                <ActivityItem
                                    icon={<TrendingUp style={{ width: '14px', height: '14px', color: '#fbbf24' }} />}
                                    title="New theme 'Data Export' is gaining traction"
                                    time="20 mins ago"
                                />
                                <ActivityItem
                                    icon={<Activity style={{ width: '14px', height: '14px', color: '#14b8a6' }} />}
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

// Robot Illustration - Vibrant with glow effect
function RobotIllustration() {
    return (
        <div style={{ position: 'relative', flexShrink: 0 }}>
            {/* Teal glow behind robot */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120px',
                height: '120px',
                background: 'radial-gradient(circle, rgba(20, 184, 166, 0.4) 0%, transparent 70%)',
                filter: 'blur(20px)'
            }} />

            <svg width="90" height="90" viewBox="0 0 100 100" fill="none" style={{ position: 'relative', zIndex: 1 }}>
                {/* Antenna stem */}
                <line x1="50" y1="28" x2="50" y2="12" stroke="#4a5568" strokeWidth="4" strokeLinecap="round" />

                {/* Antenna ball - glowing gold */}
                <circle cx="50" cy="8" r="6" fill="#fbbf24" />
                <circle cx="50" cy="8" r="4" fill="#f59e0b" />
                <circle cx="50" cy="6" r="1.5" fill="#fef3c7" />

                {/* Robot head - main body */}
                <rect x="18" y="28" width="64" height="54" rx="14" fill="#374151" />
                <rect x="20" y="30" width="60" height="50" rx="12" fill="#1f2937" />

                {/* Face screen */}
                <rect x="25" y="35" width="50" height="40" rx="10" fill="#0f1419" />

                {/* Left eye - glowing teal */}
                <ellipse cx="38" cy="52" rx="7" ry="8" fill="#14b8a6" />
                <ellipse cx="40" cy="50" rx="2.5" ry="3" fill="#5eead4" />

                {/* Right eye - glowing teal */}
                <ellipse cx="62" cy="52" rx="7" ry="8" fill="#14b8a6" />
                <ellipse cx="64" cy="50" rx="2.5" ry="3" fill="#5eead4" />

                {/* Smile */}
                <path d="M40 66 Q50 74 60 66" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" fill="none" />

                {/* Side ears */}
                <rect x="8" y="45" width="8" height="18" rx="4" fill="#4a5568" />
                <rect x="84" y="45" width="8" height="18" rx="4" fill="#4a5568" />
            </svg>
        </div>
    );
}

// Action Card - with vibrant glow and dark background
function ActionCard({
    icon,
    title,
    description,
    buttonLabel,
    href,
    accentColor,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    buttonLabel: string;
    href: string;
    accentColor: string;
}) {
    return (
        <div style={{
            position: 'relative',
            borderRadius: '16px',
            padding: '20px',
            backgroundColor: '#161b22',
            border: `2px solid ${accentColor}`,
            boxShadow: `0 0 60px ${accentColor}50, 0 0 30px ${accentColor}40, 0 8px 32px rgba(0,0,0,0.4)`,
        }}>
            {/* Icon circle */}
            <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: `${accentColor}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
            }}>
                {icon}
            </div>

            {/* Title */}
            <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#e6edf3',
                margin: '0 0 8px 0',
                letterSpacing: '-0.01em'
            }}>
                {title}
            </h3>

            {/* Description */}
            <p style={{
                fontSize: '13px',
                color: '#8b949e',
                margin: '0 0 16px 0',
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
                    color: '#0d1117',
                    fontWeight: 600,
                    fontSize: '14px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: accentColor,
                    textDecoration: 'none',
                    boxShadow: `0 6px 20px ${accentColor}50, 0 0 30px ${accentColor}40`
                }}
            >
                {buttonLabel}
            </Link>
        </div>
    );
}

// Sentiment Line Chart - smooth gradient area
function SentimentLineChart() {
    return (
        <div style={{
            height: '80px',
            backgroundColor: '#21262d',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative'
        }}>
            <svg width="100%" height="100%" viewBox="0 0 280 80" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Area fill */}
                <path
                    d="M0,55 C30,50 60,45 90,48 C120,51 150,35 180,38 C210,41 240,28 280,22 L280,80 L0,80 Z"
                    fill="url(#sentimentGradient)"
                />

                {/* Line */}
                <path
                    d="M0,55 C30,50 60,45 90,48 C120,51 150,35 180,38 C210,41 240,28 280,22"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    );
}

// Activity Item
function ActivityItem({
    icon,
    title,
    time
}: {
    icon: React.ReactNode;
    title: string;
    time: string;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ marginTop: '2px', flexShrink: 0 }}>
                {icon}
            </div>
            <div style={{ flex: 1 }}>
                <p style={{
                    fontSize: '13px',
                    color: '#c9d1d9',
                    margin: 0,
                    lineHeight: 1.4
                }}>
                    {title}
                </p>
                <p style={{
                    fontSize: '11px',
                    color: '#6e7681',
                    margin: '4px 0 0 0'
                }}>
                    {time}
                </p>
            </div>
        </div>
    );
}

export default MissionControlDashboard;
