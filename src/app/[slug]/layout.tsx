'use client';

/**
 * Project-Specific Layout
 * Provides TourProvider, ShortcutsProvider, WorkflowSidebar and global components
 */

import React, { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { TooltipProvider } from '@/components/ui/tooltip';
import { FloatingAskAI } from '@/components/dashboard/FloatingAskAI';
import { TourProvider } from '@/components/tours/TourProvider';
import { ShortcutsProvider } from '@/components/shortcuts/ShortcutsProvider';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';
import { WorkflowSidebar } from '@/components/WorkflowSidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import GlobalBanner from '@/components/GlobalBanner';
import { getSupabaseClient } from '@/lib/supabase-client';
import { CommandPalette } from '@/components/CommandPalette';

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

  // Check if we're on a public page (no auth required, no sidebar)
  const isPublicPage = pathname === `/${projectSlug}` ||
    pathname?.includes('/post/') ||
    pathname?.endsWith('/vote') ||
    pathname?.endsWith('/respond');

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
            <FloatingAskAI projectSlug={projectSlug} />
            <CommandPalette />
          </TourProvider>
        </ShortcutsProvider>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <ShortcutsProvider projectSlug={projectSlug}>
        <TourProvider autoStart={true}>
          <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117]">
            {/* Global Header with Mobile Menu */}
            <div className="sticky top-0 z-50 flex items-center bg-[#0d1117] border-b border-white/10">
              <div className="lg:hidden pl-3">
                <MobileSidebar projectSlug={projectSlug} />
              </div>
              <div className="flex-1">
                <GlobalBanner />
              </div>
            </div>

            {/* Push Notification Prompt - only on dashboard */}
            {showNotificationPrompt && projectId && (
              <PushNotificationPrompt
                projectId={projectId}
                variant="banner"
              />
            )}

            {/* Main Layout with Sidebar */}
            <div className="flex">
              {/* Workflow Sidebar - always dark for branding consistency */}
              <aside
                className="hidden lg:block w-64 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto bg-[#1e2228] border-r border-white/10"
              >
                <WorkflowSidebar projectSlug={projectSlug} />
              </aside>

              {/* Main Content - theme-aware background */}
              <main className="flex-1 min-w-0 bg-gray-50 dark:bg-[#13151a]">
                {children}
              </main>
            </div>

            <FloatingAskAI projectSlug={projectSlug} projectId={projectId || undefined} />
            <CommandPalette />
          </div>
        </TourProvider>
      </ShortcutsProvider>
    </TooltipProvider>
  );
}
