'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsGroup {
    id: string;
    label: string;
    icon: React.ReactNode;
    items: { value: string; label: string; icon: React.ReactNode }[];
}

interface GroupedSettingsNavProps {
    groups: SettingsGroup[];
    activeTab: string;
    onTabChange: (tab: string) => void;
    searchQuery?: string;
}

export function GroupedSettingsNav({
    groups,
    activeTab,
    onTabChange,
    searchQuery = ''
}: GroupedSettingsNavProps) {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
        // Initially expand the group containing the active tab
        const activeGroup = groups.find(g => g.items.some(item => item.value === activeTab));
        return new Set(activeGroup ? [activeGroup.id] : [groups[0]?.id]);
    });

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    // Filter items based on search
    const filteredGroups = groups.map(group => ({
        ...group,
        items: searchQuery
            ? group.items.filter(item =>
                item.label.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : group.items
    })).filter(group => searchQuery ? group.items.length > 0 : true);

    return (
        <div className="w-64 flex-shrink-0 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-4 h-fit sticky top-4">
            <nav className="space-y-2">
                {filteredGroups.map(group => (
                    <div key={group.id}>
                        {/* Group Header */}
                        <button
                            onClick={() => toggleGroup(group.id)}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all",
                                "hover:bg-gray-100/80 font-medium text-gray-700",
                                expandedGroups.has(group.id) && "bg-gray-50"
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="text-gray-500">{group.icon}</span>
                                <span className="text-sm">{group.label}</span>
                            </div>
                            {expandedGroups.has(group.id) ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                        </button>

                        {/* Group Items */}
                        {expandedGroups.has(group.id) && (
                            <div className="ml-2 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3">
                                {group.items.map(item => (
                                    <button
                                        key={item.value}
                                        onClick={() => onTabChange(item.value)}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all",
                                            activeTab === item.value
                                                ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-sm"
                                                : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"
                                        )}
                                    >
                                        <span className={cn(
                                            "flex-shrink-0",
                                            activeTab === item.value ? "text-white" : "text-gray-400"
                                        )}>
                                            {item.icon}
                                        </span>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </nav>
        </div>
    );
}
