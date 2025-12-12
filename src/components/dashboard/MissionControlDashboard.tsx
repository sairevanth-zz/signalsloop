'use client';

/**
 * MissionControlDashboard - Theme-aware dashboard with real data
 * 
 * Displays real project data with "no data" empty states.
 */

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/theme-provider';
import {
    AlertTriangle,
    Lightbulb,
    CheckCircle,
    MessageSquare,
    TrendingUp,
    Activity,
    ChevronRight,
    Inbox
} from 'lucide-react';

// Dashboard data types
interface DashboardData {
    churnAlert: {
        title: string;
        description: string;
        customerName: string;
        severity: 'critical' | 'high';
    } | null;
    theme: {
        name: string;
        description: string;
        isEmerging: boolean;
    } | null;
    outcome: {
        title: string;
        featureName: string;
    } | null;
    recentActivity: Array<{
        id: string;
        content: string;
        authorEmail: string;
        createdAt: string;
        sentiment: number | null;
    }>;
    sentimentScore: number;
}

interface MissionControlDashboardProps {
    userName?: string;
    projectSlug: string;
    projectId: string;
    dashboardData?: DashboardData;
}

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

export function MissionControlDashboard({
    userName = 'there',
    projectSlug,
    projectId,
    dashboardData,
}: MissionControlDashboardProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Theme-aware color palette
    const colors = {
        bg: isDark ? '#0d1117' : '#f8fafc',
        cardBg: isDark ? '#1e2530' : '#ffffff',
        panelBg: isDark ? '#161b22' : '#f1f5f9',
        textPrimary: isDark ? '#e6edf3' : '#1e293b',
        textSecondary: isDark ? '#8b949e' : '#64748b',
        textMuted: isDark ? '#6e7681' : '#94a3b8',
        border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        glowOpacity: isDark ? 0.25 : 0.15,
        insetGlowOpacity: isDark ? 0.08 : 0.04,
    };

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
                backgroundColor: colors.bg,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                transition: 'background-color 0.3s ease'
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
                                color: colors.textPrimary,
                                margin: 0,
                                lineHeight: 1.3,
                                letterSpacing: '-0.02em'
                            }}>
                                {getGreeting()}, {userName}.
                            </h1>
                            <p style={{
                                fontSize: '36px',
                                fontWeight: 300,
                                color: colors.textPrimary,
                                margin: 0,
                                lineHeight: 1.3,
                                letterSpacing: '-0.02em'
                            }}>
                                Here's what needs your
                            </p>
                            <p style={{
                                fontSize: '36px',
                                fontWeight: 300,
                                color: colors.textPrimary,
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
                            title={dashboardData?.churnAlert ? "Churn Risk Alert" : "No Churn Risks"}
                            description={dashboardData?.churnAlert
                                ? `${dashboardData.churnAlert.severity === 'critical' ? 'Critical' : 'High'} churn probability for '${dashboardData.churnAlert.customerName}'. ${dashboardData.churnAlert.description}`
                                : "No active churn alerts detected. Your customers are healthy!"}
                            buttonLabel={dashboardData?.churnAlert ? "Review & Act" : "View All"}
                            href={`/${projectSlug}/churn-radar`}
                            accentColor="#fbbf24"
                            isEmpty={!dashboardData?.churnAlert}
                        />

                        {/* New Theme Detected - Teal */}
                        <ActionCard
                            icon={<Lightbulb style={{ width: '24px', height: '24px', color: '#14b8a6' }} />}
                            title={dashboardData?.theme ? (dashboardData.theme.isEmerging ? "Emerging Theme" : "New Theme Detected") : "No New Themes"}
                            description={dashboardData?.theme
                                ? `AI identified a theme: '${dashboardData.theme.name}'. ${dashboardData.theme.description}`
                                : "No new themes detected recently. Check back for new insights."}
                            buttonLabel={dashboardData?.theme ? "Explore Theme" : "View Insights"}
                            href={`/${projectSlug}/ai-insights`}
                            accentColor="#14b8a6"
                            isEmpty={!dashboardData?.theme}
                        />

                        {/* Roadmap Outcome - Emerald */}
                        <ActionCard
                            icon={<CheckCircle style={{ width: '24px', height: '24px', color: '#10b981' }} />}
                            title={dashboardData?.outcome ? "Outcome Ready" : "No Completed Outcomes"}
                            description={dashboardData?.outcome
                                ? `'${dashboardData.outcome.featureName}' outcome analysis is complete. See the impact.`
                                : "No outcome reports completed yet. Set up outcome tracking for your features."}
                            buttonLabel={dashboardData?.outcome ? "View Outcomes" : "Set Up Tracking"}
                            href={`/${projectSlug}/outcomes`}
                            accentColor="#10b981"
                            isEmpty={!dashboardData?.outcome}
                        />
                    </div>
                </div>

                {/* Right Panel - Dynamic Context */}
                <div style={{ width: '320px', flexShrink: 0 }}>
                    <div style={{
                        backgroundColor: colors.panelBg,
                        borderRadius: '16px',
                        padding: '20px',
                        border: `1px solid ${colors.border}`,
                        transition: 'all 0.3s ease'
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
                                color: colors.textPrimary,
                                margin: 0
                            }}>
                                Dynamic Context
                            </h3>
                            <ChevronRight style={{ width: '16px', height: '16px', color: colors.textMuted }} />
                        </div>

                        {/* User Sentiment Pulse */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '8px'
                            }}>
                                <span style={{ fontSize: '13px', fontWeight: 500, color: colors.textSecondary }}>
                                    User Sentiment Pulse
                                </span>
                                <ChevronRight style={{ width: '14px', height: '14px', color: colors.textMuted }} />
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
                                    backgroundColor: (dashboardData?.sentimentScore || 0.5) >= 0.6 ? '#10b981' : (dashboardData?.sentimentScore || 0.5) >= 0.4 ? '#fbbf24' : '#ef4444'
                                }} />
                                <span style={{ fontSize: '13px', color: (dashboardData?.sentimentScore || 0.5) >= 0.6 ? '#10b981' : (dashboardData?.sentimentScore || 0.5) >= 0.4 ? '#fbbf24' : '#ef4444' }}>
                                    {(dashboardData?.sentimentScore || 0.5) >= 0.6 ? 'Generally Positive' : (dashboardData?.sentimentScore || 0.5) >= 0.4 ? 'Mixed Sentiment' : 'Concerning Trend'}
                                </span>
                            </div>
                            {/* Sentiment Chart */}
                            <SentimentLineChart />
                        </div>

                        <div style={{
                            height: '1px',
                            backgroundColor: colors.border,
                            margin: '16px 0'
                        }} />

                        {/* Recent Activity */}
                        <div>
                            <h4 style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: colors.textPrimary,
                                margin: '0 0 16px 0'
                            }}>
                                Recent Activity & Insights
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                                    dashboardData.recentActivity.slice(0, 3).map((activity, index) => (
                                        <ActivityItem
                                            key={activity.id || index}
                                            icon={<MessageSquare style={{ width: '14px', height: '14px', color: activity.sentiment && activity.sentiment > 0.5 ? '#14b8a6' : '#fbbf24' }} />}
                                            title={`${activity.authorEmail?.split('@')[0] || 'User'}: "${activity.content}"`}
                                            time={formatTimeAgo(activity.createdAt)}
                                        />
                                    ))
                                ) : (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '20px',
                                        color: colors.textSecondary,
                                        fontSize: '13px'
                                    }}>
                                        <Inbox style={{ width: '24px', height: '24px', margin: '0 auto 8px', opacity: 0.5 }} />
                                        No recent activity yet
                                    </div>
                                )}
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

// Action Card - theme-aware with vibrant glow
function ActionCard({
    icon,
    title,
    description,
    buttonLabel,
    href,
    accentColor,
    isEmpty = false,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    buttonLabel: string;
    href: string;
    accentColor: string;
    isEmpty?: boolean;
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const cardBg = isDark ? '#1e2530' : '#ffffff';
    const textPrimary = isDark ? '#ffffff' : '#1e293b';
    const textSecondary = isDark ? '#9ca3af' : '#64748b';
    const buttonText = isDark ? '#0d1117' : '#ffffff';

    // Reduce glow for empty states
    const glowIntensity = isEmpty ? (isDark ? '30' : '20') : (isDark ? '60' : '40');
    const insetGlow = isEmpty ? (isDark ? '08' : '04') : (isDark ? '15' : '08');

    return (
        <div style={{
            position: 'relative',
            borderRadius: '16px',
            padding: '20px',
            backgroundColor: cardBg,
            border: `2px solid ${accentColor}`,
            boxShadow: isDark
                ? `0 0 80px ${accentColor}${glowIntensity}, 0 0 40px ${accentColor}50, inset 0 0 40px ${accentColor}${insetGlow}`
                : `0 0 40px ${accentColor}30, 0 4px 12px rgba(0,0,0,0.1)`,
            overflow: 'hidden',
            transition: 'all 0.3s ease',
        }}>
            {/* Inner glow effect - gradient from borders */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: isDark
                    ? `radial-gradient(ellipse at top, ${accentColor}20 0%, transparent 50%), radial-gradient(ellipse at bottom, ${accentColor}15 0%, transparent 40%)`
                    : `radial-gradient(ellipse at top, ${accentColor}10 0%, transparent 50%)`,
                pointerEvents: 'none'
            }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Icon circle */}
                <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: `${accentColor}${isDark ? '30' : '20'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    boxShadow: isDark ? `0 0 20px ${accentColor}40` : 'none'
                }}>
                    {icon}
                </div>

                {/* Title */}
                <h3 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: textPrimary,
                    margin: '0 0 8px 0',
                    letterSpacing: '-0.01em'
                }}>
                    {title}
                </h3>

                {/* Description */}
                <p style={{
                    fontSize: '13px',
                    color: textSecondary,
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
                        color: buttonText,
                        fontWeight: 700,
                        fontSize: '14px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: accentColor,
                        textDecoration: 'none',
                        boxShadow: isDark
                            ? `0 8px 30px ${accentColor}70, 0 0 50px ${accentColor}50, 0 0 80px ${accentColor}30`
                            : `0 4px 16px ${accentColor}40`
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

// Activity Item - theme-aware
function ActivityItem({
    icon,
    title,
    time
}: {
    icon: React.ReactNode;
    title: string;
    time: string;
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const textColor = isDark ? '#c9d1d9' : '#475569';
    const timeColor = isDark ? '#6e7681' : '#94a3b8';

    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ marginTop: '2px', flexShrink: 0 }}>
                {icon}
            </div>
            <div style={{ flex: 1 }}>
                <p style={{
                    fontSize: '13px',
                    color: textColor,
                    margin: 0,
                    lineHeight: 1.4
                }}>
                    {title}
                </p>
                <p style={{
                    fontSize: '11px',
                    color: timeColor,
                    margin: '4px 0 0 0'
                }}>
                    {time}
                </p>
            </div>
        </div>
    );
}

export default MissionControlDashboard;
