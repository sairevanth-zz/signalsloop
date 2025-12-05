'use client';

/**
 * Project-Specific Layout
 * Provides TourProvider, ShortcutsProvider, and global components
 */

import React, { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AskModal } from '@/components/ask/AskModal';
import { TourProvider } from '@/components/tours/TourProvider';
import { ShortcutsProvider } from '@/components/shortcuts/ShortcutsProvider';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';
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

  return (
    <TooltipProvider>
      <ShortcutsProvider projectSlug={projectSlug}>
        <TourProvider autoStart={true}>
          {/* Push Notification Prompt - only on dashboard */}
          {showNotificationPrompt && projectId && (
            <PushNotificationPrompt 
              projectId={projectId} 
              variant="banner" 
            />
          )}
          {children}
          <AskModal />
        </TourProvider>
      </ShortcutsProvider>
    </TooltipProvider>
  );
}
