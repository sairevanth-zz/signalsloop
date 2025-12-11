'use client';

/**
 * Project-Specific Layout
 * Provides TourProvider, ShortcutsProvider, WorkflowSidebar and global components
 */

import React, { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AskModal } from '@/components/ask/AskModal';
import { TourProvider } from '@/components/tours/TourProvider';
import { ShortcutsProvider } from '@/components/shortcuts/ShortcutsProvider';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';
import { WorkflowSidebar } from '@/components/WorkflowSidebar';
import GlobalBanner from '@/components/GlobalBanner';
import { getSupabaseClient } from '@/lib/supabase-client';

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const params = useParams();
  const pathname = usePathname();
  const projectSlug = params?.slug as string;
  const [projectId, setProjectId] = useState<string | null>(null);

  // Only show notification prompt on dashboard page
  const showNotificationPrompt = pathname?.includes('/dashboard');

  // Check if we're on the public board page (no auth required pages)
  const isPublicPage = pathname === `/${projectSlug}` || pathname?.includes('/post/');

  // Fetch project ID from slug
  useEffect(() => {
    async function fetchProjectId() {
      const supabase = getSupabaseClient();
      if (!supabase || !projectSlug) return;

      const { data } = await supabase
        .from('projects')
        .select('id')
        .eq('slug', projectSlug)
        .single();

      if (data) {
        setProjectId(data.id);
      }
    }
    fetchProjectId();
  }, [projectSlug]);

  // Public pages render without sidebar
  if (isPublicPage) {
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

  return (
    <TooltipProvider>
      <ShortcutsProvider projectSlug={projectSlug}>
        <TourProvider autoStart={true}>
          <div className="min-h-screen" style={{ backgroundColor: '#0d1117' }}>
            {/* Global Header */}
            <GlobalBanner />

            {/* Push Notification Prompt - only on dashboard */}
            {showNotificationPrompt && projectId && (
              <PushNotificationPrompt
                projectId={projectId}
                variant="banner"
              />
            )}

            {/* Main Layout with Sidebar */}
            <div className="flex">
              {/* Workflow Sidebar */}
              <aside
                className="hidden lg:block w-64 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto"
                style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}
              >
                <WorkflowSidebar projectSlug={projectSlug} />
              </aside>

              {/* Main Content */}
              <main className="flex-1 min-w-0">
                {children}
              </main>
            </div>

            <AskModal />
          </div>
        </TourProvider>
      </ShortcutsProvider>
    </TooltipProvider>
  );
}
