/**
 * CommandBar - Feature navigation bar for Mission Control
 * 
 * Horizontal strip with quick-access links to key features.
 * Replaces promotional cards with compact, professional navigation.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
    MessageSquare, Map, Users, Sparkles, Activity,
    Inbox, FileBarChart, AlertTriangle, Swords, Shield, Brain,
    BarChart3
} from 'lucide-react';

interface CommandBarProps {
    projectSlug: string;
    isAdmin?: boolean;
}

interface CommandItemProps {
    href: string;
    icon: React.ElementType;
    label: string;
    badge?: string;
    badgeColor?: string;
    iconColor?: string;
}

function CommandItem({ href, icon: Icon, label, badge, badgeColor = 'bg-blue-500', iconColor = 'text-slate-400' }: CommandItemProps) {
    return (
        <Link
            href={href}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 transition-all group"
        >
            <Icon className={`w-4 h-4 ${iconColor} group-hover:text-white transition-colors`} />
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>
            {badge && (
                <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${badgeColor} text-white`}>
                    {badge}
                </span>
            )}
        </Link>
    );
}

export function CommandBar({ projectSlug, isAdmin = false }: CommandBarProps) {
    return (
        <div className="flex items-center gap-3 flex-wrap">
            {/* Core Navigation */}
            <div className="flex items-center gap-2">
                <CommandItem
                    href={`/${projectSlug}/board`}
                    icon={MessageSquare}
                    label="Feedback Board"
                    iconColor="text-green-400"
                />
                <CommandItem
                    href={`/${projectSlug}/roadmap`}
                    icon={Map}
                    label="Roadmap"
                    iconColor="text-blue-400"
                />
            </div>

            <div className="w-px h-6 bg-slate-700" />

            {/* Premium Features */}
            <div className="flex items-center gap-2">
                <CommandItem
                    href={`/${projectSlug}/settings/stakeholders`}
                    icon={Users}
                    label="Stakeholder Intel"
                    badge="NEW"
                    badgeColor="bg-purple-500"
                    iconColor="text-purple-400"
                />
                <CommandItem
                    href={`/${projectSlug}/outcomes`}
                    icon={Sparkles}
                    label="Predictions"
                    iconColor="text-pink-400"
                />
            </div>

            <div className="w-px h-6 bg-slate-700" />

            {/* Intelligence Suite */}
            <div className="flex items-center gap-2">
                <CommandItem
                    href={`/${projectSlug}/inbox`}
                    icon={Inbox}
                    label="Inbox"
                    iconColor="text-green-400"
                />
                <CommandItem
                    href={`/${projectSlug}/briefs`}
                    icon={FileBarChart}
                    label="Briefs"
                    iconColor="text-blue-400"
                />
                <CommandItem
                    href={`/${projectSlug}/churn-radar`}
                    icon={AlertTriangle}
                    label="Churn Radar"
                    iconColor="text-red-400"
                />
            </div>

            <div className="w-px h-6 bg-slate-700" />

            {/* Competitive */}
            <div className="flex items-center gap-2">
                <CommandItem
                    href={`/${projectSlug}/war-room`}
                    icon={Swords}
                    label="War Room"
                    iconColor="text-orange-400"
                />
                <CommandItem
                    href={`/${projectSlug}/competitive`}
                    icon={Shield}
                    label="Competitive"
                    iconColor="text-purple-400"
                />
            </div>

            {/* Admin Only - Events & Debug */}
            {isAdmin && (
                <>
                    <div className="w-px h-6 bg-slate-700" />
                    <CommandItem
                        href={`/${projectSlug}/events`}
                        icon={Activity}
                        label="Events"
                        iconColor="text-slate-500"
                    />
                </>
            )}
        </div>
    );
}

// Compact version for smaller screens
export function CommandBarCompact({ projectSlug, isAdmin = false }: CommandBarProps) {
    const items = [
        { href: `/${projectSlug}/board`, icon: MessageSquare, color: 'text-green-400' },
        { href: `/${projectSlug}/roadmap`, icon: Map, color: 'text-blue-400' },
        { href: `/${projectSlug}/settings/stakeholders`, icon: Users, color: 'text-purple-400', badge: true },
        { href: `/${projectSlug}/outcomes`, icon: Sparkles, color: 'text-pink-400' },
        { href: `/${projectSlug}/inbox`, icon: Inbox, color: 'text-green-400' },
        { href: `/${projectSlug}/churn-radar`, icon: AlertTriangle, color: 'text-red-400' },
        { href: `/${projectSlug}/competitive`, icon: Shield, color: 'text-purple-400' },
        ...(isAdmin ? [{ href: `/${projectSlug}/events`, icon: Activity, color: 'text-slate-500' }] : []),
    ];

    return (
        <div className="flex items-center justify-center gap-1 p-2 bg-slate-900/80 rounded-xl border border-slate-800/50">
            {items.map((item, index) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className="relative p-2.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                    {item.badge && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-500 rounded-full" />
                    )}
                </Link>
            ))}
        </div>
    );
}
