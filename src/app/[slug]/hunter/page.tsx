/**
 * Project-Specific AI Feedback Hunter Page
 * Autonomous feedback discovery for this specific project
 */

'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase-client';
import { HunterDashboard } from '@/components/hunter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Brain } from 'lucide-react';
import Link from 'next/link';
import GlobalBanner from '@/components/GlobalBanner';

export default function ProjectHunterPage() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const projectSlug = params?.slug as string;
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (user && supabase && projectSlug) {
      loadProject();
    }
  }, [user, supabase, projectSlug]);

  const loadProject = async () => {
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
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Brain className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading AI Feedback Hunter...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <p className="text-gray-600">Project not found</p>
          <Link href="/app">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <GlobalBanner />

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/${projectSlug}/board`}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Board
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Brain className="w-8 h-8 text-blue-600" />
                  AI Feedback Hunter
                </h1>
                <p className="text-gray-600 mt-1">
                  Autonomous feedback discovery for {project.name}
                </p>
              </div>
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
