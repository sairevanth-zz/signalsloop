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

// Robot Illustration - Cute rounded robot matching reference
function RobotIllustration() {
    return (
        <div style={{ position: 'relative', flexShrink: 0 }}>
            {/* Strong teal glow behind robot */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '140px',
                height: '140px',
                background: 'radial-gradient(circle, rgba(20, 184, 166, 0.5) 0%, rgba(20, 184, 166, 0.2) 40%, transparent 70%)',
                filter: 'blur(15px)'
            }} />

            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" style={{ position: 'relative', zIndex: 1 }}>
                <defs>
                    {/* Eye glow gradient */}
                    <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#5eead4" />
                        <stop offset="60%" stopColor="#14b8a6" />
                        <stop offset="100%" stopColor="#0d9488" />
                    </radialGradient>
                    {/* Antenna glow */}
                    <radialGradient id="antennaGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fde047" />
                        <stop offset="70%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#f59e0b" />
                    </radialGradient>
                </defs>

                {/* Antenna stem */}
                <line x1="50" y1="25" x2="50" y2="8" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />

                {/* Antenna ball - bright glowing gold */}
                <circle cx="50" cy="6" r="8" fill="url(#antennaGlow)" />
                <circle cx="50" cy="5" r="3" fill="#fef3c7" opacity="0.8" />

                {/* Robot head - rounder, cuter */}
                <rect x="15" y="25" width="70" height="60" rx="20" fill="#475569" />
                <rect x="18" y="28" width="64" height="54" rx="17" fill="#334155" />

                {/* Face screen - rounded */}
                <rect x="22" y="32" width="56" height="46" rx="14" fill="#1e293b" />

                {/* Left eye - big glowing */}
                <circle cx="36" cy="52" r="10" fill="url(#eyeGlow)" />
                <circle cx="38" cy="49" r="4" fill="#fff" opacity="0.6" />

                {/* Right eye - big glowing */}
                <circle cx="64" cy="52" r="10" fill="url(#eyeGlow)" />
                <circle cx="66" cy="49" r="4" fill="#fff" opacity="0.6" />

                {/* Happy smile - prominent */}
                <path d="M38 68 Q50 78 62 68" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round" fill="none" />

                {/* Side ears/speakers - rounded */}
                <rect x="5" y="42" width="10" height="22" rx="5" fill="#64748b" />
                <rect x="85" y="42" width="10" height="22" rx="5" fill="#64748b" />
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
            backgroundColor: '#1e2530',
            border: `2px solid ${accentColor}`,
            boxShadow: `0 0 80px ${accentColor}60, 0 0 40px ${accentColor}50, inset 0 0 40px ${accentColor}15`,
            overflow: 'hidden',
        }}>
            {/* Inner glow effect - gradient from borders */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `radial-gradient(ellipse at top, ${accentColor}20 0%, transparent 50%), radial-gradient(ellipse at bottom, ${accentColor}15 0%, transparent 40%)`,
                pointerEvents: 'none'
            }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Icon circle */}
                <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: `${accentColor}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    boxShadow: `0 0 20px ${accentColor}40`
                }}>
                    {icon}
                </div>

                {/* Title */}
                <h3 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#ffffff',
                    margin: '0 0 8px 0',
                    letterSpacing: '-0.01em'
                }}>
                    {title}
                </h3>

                {/* Description */}
                <p style={{
                    fontSize: '13px',
                    color: '#9ca3af',
                    margin: '0 0 16px 0',
                    lineHeight: 1.5
                }}>
                    {description}
                </p>

                {/* Button - with strong glow */}
                <Link
                    href={href}
                    style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'center',
                        color: '#0d1117',
                        fontWeight: 700,
                        fontSize: '14px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: accentColor,
                        textDecoration: 'none',
                        boxShadow: `0 8px 30px ${accentColor}70, 0 0 50px ${accentColor}50, 0 0 80px ${accentColor}30`
                    }}
                >
                    {buttonLabel}
                </Link>
            </div>
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
