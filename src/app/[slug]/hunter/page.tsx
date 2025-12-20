/**
 * Project-Specific AI Feedback Hunter Page
 * Autonomous feedback discovery for this specific project
 * 
 * Note: Layout already provides GlobalBanner and sidebar, so this page
 * only renders content.
 */

'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase-client';
import { HunterDashboard } from '@/components/hunter';
import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';
import Link from 'next/link';

export default function ProjectHunterPage() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const projectSlug = params?.slug as string;

  // Use ref to track if project has been loaded (prevents re-fetch on tab switch)
  const projectLoadedRef = useRef(false);

  const loadProject = useCallback(async () => {
    // Skip if already loaded
    if (projectLoadedRef.current) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', projectSlug)
        .single();

      if (error) throw error;
      setProject(data);
      projectLoadedRef.current = true;
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  }, [projectSlug]);

  useEffect(() => {
    if (user && projectSlug && !projectLoadedRef.current) {
      loadProject();
    }
  }, [user, projectSlug, loadProject]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Brain className="w-12 h-12 text-teal-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading AI Feedback Hunter...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Project not found</p>
          <Link href="/app">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#13151a]">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Brain className="w-8 h-8 text-teal-500" />
                AI Feedback Hunter
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Autonomous feedback discovery for {project.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hunter Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HunterDashboard projectId={project.id} />
      </div>
    </div>
  );
}
