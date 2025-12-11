'use client';

/**
 * WorkflowSidebar - Redesigned to match approved mockup
 * 
 * Structure:
 * - SignalsLoop logo
 * - Mission Control (prominent teal button)
 * - 4 collapsible zones: Collect, Understand, Plan, Track
 * - Bottom: Settings, Help, Plan info
 */

import React, { useState, useEffect } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ChevronDown,
    ChevronUp,
    Sparkles,
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
    Target,
    FileBarChart,
    Activity,
    HelpCircle,
    Crown,
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
    requiresProject?: boolean;
}

interface NavZone {
    id: string;
    label: string;
    icon: React.ElementType;
    items: NavItem[];
}

export function WorkflowSidebar({
    projectSlug,
    onCreateProject,
    userPlan = 'free'
}: WorkflowSidebarProps) {
    const pathname = usePathname();
    const params = useParams();
    const currentSlug = projectSlug || (params?.slug as string) || '';

    // Track which zones are expanded - default Collect to expanded
    const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({
        'collect': true,
        'understand': true,
        'plan': true,
        'track': true,
    });

    // Define 4 workflow zones matching mockup
    const navZones: NavZone[] = [
        {
            id: 'collect',
            label: 'Collect',
            icon: Inbox,
            items: [
                { label: 'Feedback', href: currentSlug ? `/${currentSlug}/board` : '#', icon: MessageSquare, requiresProject: true },
                { label: 'Inbox', href: currentSlug ? `/${currentSlug}/inbox` : '#', icon: Inbox, requiresProject: true },
                { label: 'Calls', href: '/app/calls', icon: Phone },
                { label: 'Hunter', href: currentSlug ? `/${currentSlug}/hunter` : '#', icon: Search, requiresProject: true },
            ]
        },
        {
            id: 'understand',
            label: 'Understand',
            icon: Lightbulb,
            items: [
                { label: 'AI Insights', href: currentSlug ? `/${currentSlug}/ai-insights` : '#', icon: Lightbulb, requiresProject: true },
                { label: 'Themes', href: currentSlug ? `/${currentSlug}/ai-insights` : '#', icon: Activity, requiresProject: true },
                { label: 'Predictions', href: '/app/predictions', icon: TrendingUp },
            ]
        },
        {
            id: 'plan',
            label: 'Plan',
            icon: Map,
            items: [
                { label: 'Roadmap', href: currentSlug ? `/${currentSlug}/roadmap` : '/app/roadmap', icon: Map },
                { label: 'Specs', href: currentSlug ? `/${currentSlug}/specs` : '#', icon: FileText, requiresProject: true },
                { label: 'Stories', href: '/app/user-stories', icon: FileText },
            ]
        },
        {
            id: 'track',
            label: 'Track',
            icon: BarChart3,
            items: [
                { label: 'Outcomes', href: currentSlug ? `/${currentSlug}/outcomes` : '/app/outcomes', icon: Target },
                { label: 'Analytics', href: '/app/analytics', icon: BarChart3 },
                { label: 'Briefs', href: currentSlug ? `/${currentSlug}/briefs` : '#', icon: FileBarChart, requiresProject: true },
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

    return (
        <div className="w-64 h-full bg-[#1a1d23] text-white flex flex-col">
            {/* Logo */}
            <div className="p-4">
                <Link href="/app" className="text-xl font-semibold text-white">
                    Signals<span className="text-teal-400">Loop</span>
                </Link>
            </div>

            {/* Mission Control Button - Prominent teal button */}
            <div className="px-3 mb-4">
                <Link
                    href={currentSlug ? `/${currentSlug}/dashboard` : '/app/mission-control'}
                    className={cn(
                        "flex items-center gap-3 w-full px-4 py-3 rounded-lg font-medium transition-all",
                        isMissionControlActive
                            ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20"
                            : "bg-teal-500/10 text-teal-400 hover:bg-teal-500/20"
                    )}
                >
                    <Sparkles className="w-5 h-5" />
                    <span>Mission Control</span>
                </Link>
            </div>

            {/* Navigation Zones */}
            <nav className="flex-1 overflow-y-auto px-3 space-y-2">
                {navZones.map((zone) => {
                    const ZoneIcon = zone.icon;
                    const isExpanded = expandedZones[zone.id];

                    return (
                        <div key={zone.id}>
                            {/* Zone Header */}
                            <button
                                onClick={() => toggleZone(zone.id)}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                            >
                                <span>{zone.label}</span>
                                {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-slate-500" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-500" />
                                )}
                            </button>

                            {/* Zone Items */}
                            {isExpanded && (
                                <div className="ml-2 space-y-0.5">
                                    {zone.items.map((item) => {
                                        const ItemIcon = item.icon;
                                        const isActive = isActiveItem(item.href);
                                        const isDisabled = item.requiresProject && !currentSlug;

                                        if (isDisabled) {
                                            return (
                                                <div
                                                    key={item.label}
                                                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-not-allowed"
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
                                                        ? "bg-slate-800 text-white"
                                                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                                )}
                                            >
                                                <ItemIcon className="w-4 h-4" />
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
            <div className="p-3 border-t border-slate-800 space-y-1">
                {currentSlug && (
                    <Link
                        href={`/${currentSlug}/settings`}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                            pathname?.includes('/settings')
                                ? "bg-slate-800 text-white"
                                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                        )}
                    >
                        <Settings className="w-4 h-4" />
                        <span>Project Settings</span>
                    </Link>
                )}

                <Link
                    href="/app/help"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        pathname === '/app/help'
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    )}
                >
                    <HelpCircle className="w-4 h-4" />
                    <span>Help Center</span>
                </Link>

                {/* Plan Badge */}
                <div className="flex items-center gap-2 px-3 py-2">
                    <Crown className={cn("w-4 h-4", userPlan === 'pro' ? "text-amber-400" : "text-slate-500")} />
                    <span className="text-sm text-slate-400">Plan</span>
                    <Badge
                        variant="outline"
                        className={cn(
                            "ml-auto text-xs",
                            userPlan === 'pro'
                                ? "border-amber-500/50 text-amber-400"
                                : "border-slate-600 text-slate-400"
                        )}
                    >
                        {userPlan === 'pro' ? 'Pro' : 'Free'}
                    </Badge>
                </div>
            </div>
        </div>
    );
}

export default WorkflowSidebar;
