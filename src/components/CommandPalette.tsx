'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
    Search, MessageSquare, Map, Users, Sparkles, Settings,
    Inbox, FileBarChart, AlertTriangle, Swords, Shield, Activity,
    FileText, Zap, Bell, Mail, Upload, Download, BarChart3,
    Key, Globe, Plug, UserPlus, Briefcase, Home, Command
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
    id: string;
    label: string;
    icon: React.ElementType;
    href: string;
    category: string;
    keywords?: string[];
}

function getCommands(projectSlug: string): CommandItem[] {
    return [
        // Core Navigation
        { id: 'home', label: 'Mission Control', icon: Home, href: `/${projectSlug}`, category: 'Navigation', keywords: ['dashboard', 'home', 'main'] },
        { id: 'board', label: 'Feedback Board', icon: MessageSquare, href: `/${projectSlug}/board`, category: 'Navigation', keywords: ['feedback', 'posts', 'ideas'] },
        { id: 'roadmap', label: 'Roadmap', icon: Map, href: `/${projectSlug}/roadmap`, category: 'Navigation', keywords: ['plan', 'timeline', 'features'] },

        // Intelligence
        { id: 'inbox', label: 'Universal Inbox', icon: Inbox, href: `/${projectSlug}/inbox`, category: 'Intelligence', keywords: ['messages', 'notifications'] },
        { id: 'briefs', label: 'Executive Briefs', icon: FileBarChart, href: `/${projectSlug}/briefs`, category: 'Intelligence', keywords: ['reports', 'summary'] },
        { id: 'ai-insights', label: 'AI Insights', icon: Sparkles, href: `/${projectSlug}/ai-insights`, category: 'Intelligence', keywords: ['analysis', 'trends'] },
        { id: 'churn', label: 'Churn Radar', icon: AlertTriangle, href: `/${projectSlug}/churn-radar`, category: 'Intelligence', keywords: ['risk', 'retention'] },
        { id: 'outcomes', label: 'Predictions', icon: BarChart3, href: `/${projectSlug}/outcomes`, category: 'Intelligence', keywords: ['forecast', 'predict'] },

        // Competitive
        { id: 'war-room', label: 'War Room', icon: Swords, href: `/${projectSlug}/war-room`, category: 'Competitive', keywords: ['battle', 'compete'] },
        { id: 'competitive', label: 'Competitive Intel', icon: Shield, href: `/${projectSlug}/competitive`, category: 'Competitive', keywords: ['competitors', 'analysis'] },

        // Team
        { id: 'stakeholders', label: 'Stakeholder Intelligence', icon: Users, href: `/${projectSlug}/settings/stakeholders`, category: 'Team', keywords: ['people', 'management'] },
        { id: 'teammates', label: 'Team Members', icon: UserPlus, href: `/${projectSlug}/settings?tab=teammates`, category: 'Team', keywords: ['members', 'access'] },

        // Settings
        { id: 'settings', label: 'Project Settings', icon: Settings, href: `/${projectSlug}/settings`, category: 'Settings', keywords: ['config', 'preferences'] },
        { id: 'api-keys', label: 'API Keys', icon: Key, href: `/${projectSlug}/settings?tab=api-keys`, category: 'Settings', keywords: ['keys', 'widget'] },
        { id: 'integrations', label: 'Integrations', icon: Plug, href: `/${projectSlug}/settings?tab=integrations`, category: 'Settings', keywords: ['connect', 'apps', 'slack'] },
        { id: 'webhooks', label: 'Webhooks', icon: Zap, href: `/${projectSlug}/settings?tab=webhooks`, category: 'Settings', keywords: ['hooks', 'automation'] },
        { id: 'notifications', label: 'Notifications', icon: Bell, href: `/${projectSlug}/settings?tab=notifications`, category: 'Settings', keywords: ['alerts', 'email'] },
        { id: 'import', label: 'Import Data', icon: Upload, href: `/${projectSlug}/settings?tab=import`, category: 'Settings', keywords: ['csv', 'upload'] },
        { id: 'export', label: 'Export Data', icon: Download, href: `/${projectSlug}/settings?tab=export`, category: 'Settings', keywords: ['download', 'backup'] },

        // Specs
        { id: 'specs', label: 'Product Specs', icon: FileText, href: `/${projectSlug}/specs`, category: 'Navigation', keywords: ['documents', 'requirements'] },
        { id: 'new-spec', label: 'Create New Spec', icon: FileText, href: `/${projectSlug}/specs/new`, category: 'Actions', keywords: ['new', 'create', 'document'] },
    ];
}

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const params = useParams();
    const projectSlug = params?.slug as string || '';

    const commands = useMemo(() => projectSlug ? getCommands(projectSlug) : [], [projectSlug]);

    const filteredCommands = useMemo(() => {
        if (!search) return commands;
        const searchLower = search.toLowerCase();
        return commands.filter(cmd =>
            cmd.label.toLowerCase().includes(searchLower) ||
            cmd.category.toLowerCase().includes(searchLower) ||
            cmd.keywords?.some(k => k.includes(searchLower))
        );
    }, [commands, search]);

    // Group by category
    const groupedCommands = useMemo(() => {
        const groups: Record<string, CommandItem[]> = {};
        filteredCommands.forEach(cmd => {
            if (!groups[cmd.category]) groups[cmd.category] = [];
            groups[cmd.category].push(cmd);
        });
        return groups;
    }, [filteredCommands]);

    // Keyboard shortcut to open (Cmd+K or Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(prev => !prev);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Reset state when opened
    useEffect(() => {
        if (open) {
            setSearch('');
            setSelectedIndex(0);
        }
    }, [open]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                const selected = filteredCommands[selectedIndex];
                if (selected) {
                    router.push(selected.href);
                    setOpen(false);
                }
                break;
            case 'Escape':
                setOpen(false);
                break;
        }
    }, [filteredCommands, selectedIndex, router]);

    // Keep selected index in bounds
    useEffect(() => {
        if (selectedIndex >= filteredCommands.length) {
            setSelectedIndex(Math.max(0, filteredCommands.length - 1));
        }
    }, [filteredCommands.length, selectedIndex]);

    const handleSelect = (cmd: CommandItem) => {
        router.push(cmd.href);
        setOpen(false);
    };

    // Flatten for index tracking
    let currentIndex = 0;

    if (!projectSlug) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="p-0 max-w-xl overflow-hidden bg-slate-900 border-slate-700">
                {/* Search Input */}
                <div className="flex items-center border-b border-slate-700 px-4">
                    <Search className="w-5 h-5 text-slate-400 mr-3" />
                    <input
                        type="text"
                        placeholder="Search pages and actions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 h-14 bg-transparent text-white placeholder-slate-500 outline-none text-base"
                        autoFocus
                    />
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-400 bg-slate-800 rounded border border-slate-700">
                        <Command className="w-3 h-3" />K
                    </kbd>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto p-2">
                    {filteredCommands.length === 0 ? (
                        <div className="py-8 text-center text-slate-500">
                            No results found for "{search}"
                        </div>
                    ) : (
                        Object.entries(groupedCommands).map(([category, items]) => (
                            <div key={category} className="mb-2">
                                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    {category}
                                </div>
                                {items.map((cmd) => {
                                    const isSelected = currentIndex === selectedIndex;
                                    const itemIndex = currentIndex;
                                    currentIndex++;

                                    return (
                                        <button
                                            key={cmd.id}
                                            onClick={() => handleSelect(cmd)}
                                            onMouseEnter={() => setSelectedIndex(itemIndex)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                                                isSelected ? "bg-teal-500/20 text-teal-400" : "text-slate-300 hover:bg-slate-800"
                                            )}
                                        >
                                            <cmd.icon className={cn("w-5 h-5", isSelected ? "text-teal-400" : "text-slate-500")} />
                                            <span className={cn("flex-1", isSelected && "text-white")}>{cmd.label}</span>
                                            {isSelected && (
                                                <kbd className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">↵</kbd>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer hint */}
                <div className="border-t border-slate-700 px-4 py-2 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">↑</kbd>
                        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">↓</kbd>
                        to navigate
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">↵</kbd>
                        to select
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">esc</kbd>
                        to close
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
