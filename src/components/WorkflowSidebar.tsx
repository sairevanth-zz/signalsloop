'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ChevronDown,
    ChevronRight,
    Brain,
    Inbox,
    Lightbulb,
    Map,
    BarChart3,
    Settings,
    MessageSquare,
    Phone,
    Search,
    FileText,
    Users,
    Beaker,
    TrendingUp,
    AlertTriangle,
    Swords,
    FileBarChart,
    Briefcase,
    Target,
    Activity,
    Zap,
    HelpCircle,
    Plus,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface WorkflowSidebarProps {
    projectSlug?: string;
    onCreateProject?: () => void;
    userPlan?: 'free' | 'pro';
}

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    badge?: string;
    badgeColor?: string;
    requiresProject?: boolean;
    disabled?: boolean;
}

interface NavZone {
    id: string;
    label: string;
    icon: React.ElementType;
    iconColor: string;
    items: NavItem[];
    defaultOpen?: boolean;
}

export function WorkflowSidebar({
    projectSlug,
    onCreateProject,
    userPlan = 'free'
}: WorkflowSidebarProps) {
    const pathname = usePathname();
    const params = useParams();
    const currentSlug = projectSlug || (params?.slug as string) || '';

    // Track which zones are expanded
    const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({
        'mission-control': true,
        'collect': false,
        'understand': false,
        'plan': false,
        'track': false,
    });

    // Define navigation zones with all features
    const navZones: NavZone[] = [
        {
            id: 'mission-control',
            label: 'Mission Control',
            icon: Brain,
            iconColor: 'text-teal-500',
            defaultOpen: true,
            items: [
                { label: 'AI Command Center', href: '/app/mission-control', icon: Brain },
                { label: 'AI Insights', href: currentSlug ? `/${currentSlug}/ai-insights` : '/app/mission-control', icon: Lightbulb, requiresProject: true },
            ]
        },
        {
            id: 'collect',
            label: 'Collect',
            icon: Inbox,
            iconColor: 'text-teal-500',
            items: [
                { label: 'Feedback Board', href: currentSlug ? `/${currentSlug}/board` : '#', icon: MessageSquare, requiresProject: true },
                { label: 'Universal Inbox', href: currentSlug ? `/${currentSlug}/inbox` : '#', icon: Inbox, requiresProject: true },
                { label: 'Call Intelligence', href: '/app/calls', icon: Phone },
                { label: 'Feedback Hunter', href: currentSlug ? `/${currentSlug}/hunter` : '#', icon: Search, requiresProject: true },
            ]
        },
        {
            id: 'understand',
            label: 'Understand',
            icon: Lightbulb,
            iconColor: 'text-amber-500',
            items: [
                { label: 'Themes & Patterns', href: currentSlug ? `/${currentSlug}/ai-insights` : '#', icon: Lightbulb, requiresProject: true },
                { label: 'Feature Predictions', href: '/app/predictions', icon: TrendingUp },
                { label: "Devil's Advocate", href: '/app/devils-advocate', icon: AlertTriangle },
                { label: 'AI Reasoning', href: '/app/reasoning', icon: Brain },
                { label: 'Competitive Intel', href: currentSlug ? `/${currentSlug}/competitive` : '/app/competitors', icon: Swords },
            ]
        },
        {
            id: 'plan',
            label: 'Plan',
            icon: Map,
            iconColor: 'text-teal-500',
            items: [
                { label: 'Roadmap', href: currentSlug ? `/${currentSlug}/roadmap` : '/app/roadmap', icon: Map },
                { label: 'Specs / PRDs', href: currentSlug ? `/${currentSlug}/specs` : '#', icon: FileText, requiresProject: true },
                { label: 'User Stories', href: '/app/user-stories', icon: Users },
                { label: 'Experiments', href: currentSlug ? `/${currentSlug}/experiments` : '#', icon: Beaker, requiresProject: true },
            ]
        },
        {
            id: 'track',
            label: 'Track',
            icon: BarChart3,
            iconColor: 'text-amber-500',
            items: [
                { label: 'Feature Outcomes', href: currentSlug ? `/${currentSlug}/outcomes` : '/app/outcomes', icon: Target },
                { label: 'Analytics', href: '/app/analytics', icon: BarChart3 },
                { label: 'Executive Briefs', href: currentSlug ? `/${currentSlug}/briefs` : '#', icon: FileBarChart, requiresProject: true },
                { label: 'Churn Radar', href: currentSlug ? `/${currentSlug}/churn-radar` : '#', icon: AlertTriangle, requiresProject: true },
                { label: 'War Room', href: currentSlug ? `/${currentSlug}/war-room` : '#', icon: Swords, requiresProject: true },
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

    const isActiveZone = (zone: NavZone) => {
        return zone.items.some(item => isActiveItem(item.href));
    };

    // Auto-expand zone if current page is in it
    useEffect(() => {
        navZones.forEach(zone => {
            if (isActiveZone(zone) && !expandedZones[zone.id]) {
                setExpandedZones(prev => ({ ...prev, [zone.id]: true }));
            }
        });
    }, [pathname]);

    return (
        <div className="w-72 h-full bg-slate-900 text-white flex flex-col">
            {/* Logo / Header */}
            <div className="p-4 border-b border-white/10">
                <Link href="/app" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold text-lg text-white">SignalsLoop</span>
                </Link>
            </div>

            {/* Quick Create Button */}
            {onCreateProject && (
                <div className="p-4 border-b border-white/10">
                    <Button
                        onClick={onCreateProject}
                        className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                    </Button>
                </div>
            )}

            {/* Navigation Zones */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {navZones.map((zone) => {
                    const ZoneIcon = zone.icon;
                    const isExpanded = expandedZones[zone.id];
                    const isZoneActive = isActiveZone(zone);

                    return (
                        <div key={zone.id} className="mb-1">
                            {/* Zone Header */}
                            <button
                                onClick={() => toggleZone(zone.id)}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    isZoneActive
                                        ? "bg-teal-500/20 text-teal-300"
                                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <ZoneIcon className={cn(
                                        "w-5 h-5",
                                        isZoneActive ? "text-teal-400" : zone.iconColor
                                    )} />
                                    <span className={cn(
                                        isZoneActive ? "text-teal-300" : "text-gray-200"
                                    )}>{zone.label}</span>
                                </div>
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                            </button>

                            {/* Zone Items */}
                            {isExpanded && (
                                <div className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1">
                                    {zone.items.map((item) => {
                                        const ItemIcon = item.icon;
                                        const isActive = isActiveItem(item.href);
                                        const isDisabled = item.requiresProject && !currentSlug;

                                        if (isDisabled) {
                                            return (
                                                <div
                                                    key={item.label}
                                                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 cursor-not-allowed"
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
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                                    isActive
                                                        ? "bg-teal-500/30 text-teal-300 font-medium"
                                                        : "text-gray-300 hover:bg-teal-500/10 hover:text-teal-300"
                                                )}
                                            >
                                                <ItemIcon className={cn(
                                                    "w-4 h-4",
                                                    isActive ? "text-teal-400" : "text-gray-400"
                                                )} />
                                                <span className="flex-1">{item.label}</span>
                                                {item.badge && (
                                                    <Badge
                                                        className={cn(
                                                            "text-xs",
                                                            item.badgeColor || "bg-teal-500 text-white"
                                                        )}
                                                    >
                                                        {item.badge}
                                                    </Badge>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Bottom Section - Settings & Help */}
            <div className="p-3 border-t border-white/10 space-y-1">
                {currentSlug && (
                    <Link
                        href={`/${currentSlug}/settings`}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                            pathname?.includes('/settings')
                                ? "bg-teal-500/20 text-teal-300"
                                : "text-gray-400 hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <Settings className="w-5 h-5" />
                        <span>Project Settings</span>
                    </Link>
                )}

                <Link
                    href="/app/help"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                        pathname === '/app/help'
                            ? "bg-teal-500/20 text-teal-300"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                >
                    <HelpCircle className="w-5 h-5" />
                    <span>Help Center</span>
                </Link>
            </div>

            {/* Plan Status */}
            <div className="p-3 border-t border-white/10">
                <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Plan</span>
                    </div>
                    <Badge
                        className={cn(
                            "text-xs",
                            userPlan === 'pro'
                                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                                : "bg-gray-600 text-gray-300"
                        )}
                    >
                        {userPlan === 'pro' ? 'PRO' : 'FREE'}
                    </Badge>
                </div>
            </div>
        </div>
    );
}

export default WorkflowSidebar;
