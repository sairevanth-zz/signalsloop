/**
 * Competitor War Room Page
 * Real-time competitor alerts and job posting intelligence
 */

'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { WarRoomDashboard } from '@/components/war-room';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Shield, Settings } from 'lucide-react';
import Link from 'next/link';

export default function WarRoomPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProject() {
      if (!slug) {
        setError('No project specified');
        setLoading(false);
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        setError('Unable to connect');
        setLoading(false);
        return;
      }

      try {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('id, name')
          .eq('slug', slug)
          .single();

        if (projectError || !project) {
          setError('Project not found');
          setLoading(false);
          return;
        }

        setProjectId(project.id);
        setProjectName(project.name);
      } catch (err) {
        console.error('[WarRoom] Error loading project:', err);
        setError('Failed to load project');
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading War Room...</p>
        </div>
      </div>
    );
  }

  if (error || !projectId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Project not found'}</p>
          <Link href="/app">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Link href="/app" className="hover:text-gray-900 inline-flex items-center">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Dashboard
                </Link>
                <span>→</span>
                <Link href={`/${slug}/dashboard`} className="hover:text-gray-900">
                  {projectName}
                </Link>
                <span>→</span>
                <span className="text-gray-900 font-medium">War Room</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="h-8 w-8 text-red-500" />
                Competitor War Room
              </h1>
              <p className="text-gray-600 mt-1">
                Real-time competitive alerts, job posting intelligence, and hiring trends
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/${slug}/competitive`}>
                <Button variant="outline">
                  View Full Intel
                </Button>
              </Link>
              <Link href={`/${slug}/settings`}>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* War Room Dashboard */}
        <WarRoomDashboard projectId={projectId} projectSlug={slug} />
      </div>
    </div>
  );
}
