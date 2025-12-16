'use client';

/**
 * WorkflowSidebar - Option A+C Hybrid
 * 
 * Structure from implementation_plan.md:
 * - 🎯 Mission Control (highlighted, default landing)
 * - 📥 Collect (expandable)
 * - 🧠 Understand (expandable)
 * - 🗺️ Plan (expandable)
 * - 📊 Track (expandable)
 * 
 * Colors:
 * - Background: #1a1d23 (deep slate)
 * - Cards: #2d3139
 * - Primary: #14b8a6 (teal)
 * - Accent: #f59e0b (warm gold)
 */

import React, { useState, useEffect } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
    ChevronDown,
    ChevronRight,
    Target,
    Inbox,
    Lightbulb,
    Map,
    BarChart3,
    Settings,
    MessageSquare,
    Phone,
    Search,
    FileText,
    TrendingUp,
    FileBarChart,
    HelpCircle,
    Sparkles,
    Mail,
    Brain,
    Scale,
    Beaker,
    AlertTriangle,
    Swords,
    Activity,
    Zap,
    Command,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface WorkflowSidebarProps {
    projectSlug?: string;
    onNavigate?: () => void; // Called when a navigation item is clicked (for mobile sidebar close)
}

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    requiresProject?: boolean;
}

interface NavZone {
    id: string;
    label: string;
    icon: React.ElementType;
    items: NavItem[];
}

export function WorkflowSidebar({ projectSlug, onNavigate }: WorkflowSidebarProps) {
    const pathname = usePathname();
    const params = useParams();
    const currentSlug = projectSlug || (params?.slug as string) || '';

    // Track which zones are expanded
    const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({
        'collect': true,
        'understand': false,
        'plan': false,
        'track': false,
        'ai-tools': false,
    });

    // Define 4 workflow zones matching implementation plan EXACTLY
    const navZones: NavZone[] = [
        {
            id: 'collect',
            label: 'Collect',
            icon: Inbox,
            items: [
                { label: 'Feedback Board', href: currentSlug ? `/${currentSlug}/board` : '#', icon: MessageSquare, requiresProject: true },
                { label: 'Universal Inbox', href: currentSlug ? `/${currentSlug}/inbox` : '#', icon: Mail, requiresProject: true },
                { label: 'Call Intelligence', href: currentSlug ? `/${currentSlug}/calls` : '#', icon: Phone, requiresProject: true },
                { label: 'AI Feedback Hunter', href: currentSlug ? `/${currentSlug}/hunter` : '#', icon: Search, requiresProject: true },
            ]
        },
        {
            id: 'understand',
            label: 'Understand',
            icon: Lightbulb,
            items: [
                { label: 'AI Insights & Themes', href: currentSlug ? `/${currentSlug}/ai-insights` : '#', icon: Lightbulb, requiresProject: true },
                { label: 'Sentiment Analysis', href: currentSlug ? `/${currentSlug}/ai-insights` : '#', icon: Activity, requiresProject: true },
                { label: 'Feature Predictions', href: '/app/predictions', icon: TrendingUp },
                { label: "Devil's Advocate", href: '/app/devils-advocate', icon: Scale },
                { label: 'AI Reasoning', href: '/app/reasoning', icon: Brain },
            ]
        },
        {
            id: 'plan',
            label: 'Plan',
            icon: Map,
            items: [
                { label: 'Roadmap', href: currentSlug ? `/${currentSlug}/roadmap` : '/app/roadmap', icon: Map },
                { label: 'Specs / PRDs', href: currentSlug ? `/${currentSlug}/specs` : '#', icon: FileText, requiresProject: true },
                { label: 'User Stories', href: '/app/user-stories', icon: FileText },
                { label: 'Experiments', href: currentSlug ? `/${currentSlug}/experiments` : '#', icon: Beaker, requiresProject: true },
            ]
        },
        {
            id: 'track',
            label: 'Track',
            icon: BarChart3,
            items: [
                { label: 'Feature Outcomes', href: currentSlug ? `/${currentSlug}/outcomes` : '/app/outcomes', icon: Target },
                { label: 'Analytics Dashboard', href: '/app/analytics', icon: BarChart3 },
                { label: 'Executive Briefs', href: currentSlug ? `/${currentSlug}/briefs` : '#', icon: FileBarChart, requiresProject: true },
                { label: 'Churn Radar', href: currentSlug ? `/${currentSlug}/churn-radar` : '#', icon: AlertTriangle, requiresProject: true },
                { label: 'War Room', href: currentSlug ? `/${currentSlug}/war-room` : '#', icon: Swords, requiresProject: true },
            ]
        },
        {
            id: 'ai-tools',
            label: 'AI Tools',
            icon: Zap,
            items: [
                { label: 'Auto-Prioritize', href: currentSlug ? `/${currentSlug}/ai-tools?action=prioritize` : '#', icon: Target, requiresProject: true },
                { label: 'Smart Categorize', href: currentSlug ? `/${currentSlug}/ai-tools?action=categorize` : '#', icon: Sparkles, requiresProject: true },
                { label: 'Find Duplicates', href: currentSlug ? `/${currentSlug}/ai-tools?action=duplicates` : '#', icon: Search, requiresProject: true },
                { label: 'Analyze Sentiment', href: currentSlug ? `/${currentSlug}/ai-tools?action=sentiment` : '#', icon: Activity, requiresProject: true },
            ]
        },
    ];

    const toggleZone = (zoneId: string) => {
        setExpandedZones(prev => ({
            ...prev,
            [zoneId]: !prev[zoneId]
        }));
    };

    const isActiveItem = (href: string) => {
        if (href === '#') return false;
        return pathname === href || pathname?.startsWith(href + '/');
    };

    const isMissionControlActive = pathname?.includes('/dashboard') || pathname?.includes('/mission-control');

    // Auto-expand zone if current page is in it
    useEffect(() => {
        navZones.forEach(zone => {
            const hasActiveItem = zone.items.some(item => isActiveItem(item.href));
            if (hasActiveItem && !expandedZones[zone.id]) {
                setExpandedZones(prev => ({ ...prev, [zone.id]: true }));
            }
        });
    }, [pathname]);

    return (
        <div className="w-64 h-full flex flex-col" style={{ backgroundColor: '#1e2228' }}>
            {/* Logo */}
            <div className="p-4 border-b border-white/10">
                <Link href="/app" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#14b8a6' }}>
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-semibold text-white">SignalsLoop</span>
                </Link>
            </div>

            {/* Mission Control - Prominent highlighted button */}
            <div className="p-3">
                <Link
                    href={currentSlug ? `/${currentSlug}/dashboard` : '/app/mission-control'}
                    onClick={onNavigate}
                    className={cn(
                        "flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium transition-all",
                        isMissionControlActive
                            ? "text-white shadow-lg"
                            : "text-white/80 hover:text-white"
                    )}
                    style={{
                        background: isMissionControlActive ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%)',
                        boxShadow: isMissionControlActive ? '0 8px 32px rgba(245, 158, 11, 0.5), 0 0 20px rgba(245, 158, 11, 0.3)' : '0 4px 14px rgba(245, 158, 11, 0.2)'
                    }}
                >
                    <Sparkles className="w-5 h-5" />
                    <span>Mission Control</span>
                </Link>
            </div>

            {/* Navigation Zones */}
            <nav className="flex-1 overflow-y-auto px-3 space-y-1">
                {navZones.map((zone) => {
                    const ZoneIcon = zone.icon;
                    const isExpanded = expandedZones[zone.id];
                    const hasActiveItem = zone.items.some(item => isActiveItem(item.href));

                    return (
                        <div key={zone.id} className="mb-1">
                            {/* Zone Header */}
                            <button
                                onClick={() => toggleZone(zone.id)}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                    hasActiveItem
                                        ? "text-white"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                                style={hasActiveItem ? { backgroundColor: 'rgba(20, 184, 166, 0.1)' } : {}}
                            >
                                <div className="flex items-center gap-3">
                                    <ZoneIcon
                                        className="w-5 h-5"
                                        style={{ color: hasActiveItem ? '#14b8a6' : undefined }}
                                    />
                                    <span>{zone.label}</span>
                                </div>
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                )}
                            </button>

                            {/* Zone Items */}
                            {isExpanded && (
                                <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-0.5">
                                    {zone.items.map((item) => {
                                        const ItemIcon = item.icon;
                                        const isActive = isActiveItem(item.href);
                                        const isDisabled = item.requiresProject && !currentSlug;

                                        if (isDisabled) {
                                            return (
                                                <div
                                                    key={item.label}
                                                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 cursor-not-allowed"
                                                    title="Select a project first"
                                                >
                                                    <ItemIcon className="w-4 h-4" />
                                                    <span>{item.label}</span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <Link
                                                key={item.label}
                                                href={item.href}
                                                onClick={onNavigate}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                                                    isActive
                                                        ? "text-white font-medium"
                                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                                )}
                                                style={isActive ? {
                                                    backgroundColor: 'rgba(20, 184, 166, 0.15)',
                                                    color: '#5eead4' // teal-300
                                                } : {}}
                                            >
                                                <ItemIcon
                                                    className="w-4 h-4"
                                                    style={isActive ? { color: '#14b8a6' } : {}}
                                                />
                                                <span>{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-3 border-t border-white/10 space-y-1">
                {/* Quick Search Hint */}
                <button
                    onClick={() => {
                        // Trigger Cmd+K by dispatching keyboard event
                        const event = new KeyboardEvent('keydown', {
                            key: 'k',
                            metaKey: true,
                            bubbles: true
                        });
                        document.dispatchEvent(event);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <Search className="w-4 h-4" />
                        <span>Quick Search</span>
                    </div>
                    <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-white/10 rounded border border-white/20 text-gray-500 group-hover:text-gray-300 group-hover:border-white/30">
                        <Command className="w-2.5 h-2.5" />K
                    </kbd>
                </button>

                {currentSlug && (
                    <Link
                        href={`/${currentSlug}/settings`}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                            pathname?.includes('/settings')
                                ? "text-white font-medium"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                        style={pathname?.includes('/settings') ? {
                            backgroundColor: 'rgba(20, 184, 166, 0.15)',
                            color: '#5eead4'
                        } : {}}
                    >
                        <Settings className="w-4 h-4" style={pathname?.includes('/settings') ? { color: '#14b8a6' } : {}} />
                        <span>Project Settings</span>
                    </Link>
                )}

                <Link
                    href="/app/help"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                        pathname === '/app/help'
                            ? "text-white font-medium"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                    style={pathname === '/app/help' ? {
                        backgroundColor: 'rgba(20, 184, 166, 0.15)',
                        color: '#5eead4'
                    } : {}}
                >
                    <HelpCircle className="w-4 h-4" style={pathname === '/app/help' ? { color: '#14b8a6' } : {}} />
                    <span>Help & Docs</span>
                </Link>
            </div>
        </div>
    );
}

export default WorkflowSidebar;
