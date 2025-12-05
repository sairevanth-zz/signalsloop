'use client';

/**
 * Project-Specific Layout
 * Provides TourProvider, ShortcutsProvider, and global components
 */

import React from 'react';
import { useParams } from 'next/navigation';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AskModal } from '@/components/ask/AskModal';
import { TourProvider } from '@/components/tours/TourProvider';
import { ShortcutsProvider } from '@/components/shortcuts/ShortcutsProvider';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const params = useParams();
  const projectSlug = params?.slug as string;

  return (
    <TooltipProvider>
      <ShortcutsProvider projectSlug={projectSlug}>
        <TourProvider autoStart={true}>
          {children}
          <AskModal />
        </TourProvider>
      </ShortcutsProvider>
    </TooltipProvider>
  );
}
