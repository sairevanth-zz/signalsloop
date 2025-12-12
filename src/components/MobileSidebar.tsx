'use client';

/**
 * MobileSidebar - Hamburger menu + slide-out sidebar for mobile
 * 
 * Shows on screens < 1024px (lg breakpoint)
 * Overlays the screen with the WorkflowSidebar content
 */

import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { WorkflowSidebar } from './WorkflowSidebar';
import { cn } from '@/lib/utils';

interface MobileSidebarProps {
    projectSlug?: string;
}

export function MobileSidebar({ projectSlug }: MobileSidebarProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Close sidebar on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    // Prevent body scroll when sidebar is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <>
            {/* Hamburger Button - visible only on mobile */}
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Open navigation menu"
            >
                <Menu className="w-6 h-6 text-white" />
            </button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Slide-out Sidebar */}
            <div
                className={cn(
                    "fixed top-0 left-0 h-full w-72 bg-slate-900 z-50 transform transition-transform duration-300 ease-in-out lg:hidden",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Close Button */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-8 h-8 rounded-lg" />
                        <span className="text-lg font-bold text-white">SignalsLoop</span>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label="Close navigation menu"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Sidebar Content */}
                <div className="h-[calc(100vh-73px)] overflow-y-auto">
                    <WorkflowSidebar projectSlug={projectSlug} onNavigate={() => setIsOpen(false)} />
                </div>
            </div>
        </>
    );
}
