'use client';

/**
 * Dashboard Layout
 * Provides global components like AskModal with Cmd+K shortcut
 */

import React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AskModal } from '@/components/ask/AskModal';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <TooltipProvider>
      {children}
      <AskModal />
    </TooltipProvider>
  );
}
