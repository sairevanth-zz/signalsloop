/**
 * Competitive Intelligence Dashboard Page
 * Project-specific route: /{slug}/competitive
 */

'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { CompetitiveOverview } from '@/components/competitive';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CompetitiveIntelligencePage() {
  const params = useParams();
  const supabase = getSupabaseClient();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProject() {
      if (!params?.slug) {
        setError('No project specified');
        setLoading(false);
        return;
      }

      try {
        // Get project by slug
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name')
          .eq('slug', params.slug as string)
          .single();

        if (projectError || !projectData) {
          setError('Project not found');
          setLoading(false);
          return;
        }

        setProjectId(projectData.id);
        setProjectName(projectData.name);
      } catch (err) {
        console.error('Error loading project:', err);
        setError('Failed to load project');
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [params?.slug, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading competitive intelligence...</p>
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/app" className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-flex items-center">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Competitive Intelligence</h1>
            <p className="text-gray-600 mt-1">{projectName}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/${params?.slug}/board`}>
              <Button variant="outline">View Board</Button>
            </Link>
            <Link href={`/${params?.slug}/settings`}>
              <Button variant="outline">Settings</Button>
            </Link>
          </div>
        </div>

        {/* Competitive Intelligence Overview */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          }
        >
          <CompetitiveOverview
            projectId={projectId}
            onCompetitorClick={(competitorId) => {
              console.log('Competitor clicked:', competitorId);
              // Future: navigate to detailed competitor profile
            }}
            onFeatureGapClick={(gapId) => {
              console.log('Feature gap clicked:', gapId);
              // Future: navigate to detailed feature gap view
            }}
            onRecommendationClick={(recId) => {
              console.log('Recommendation clicked:', recId);
              // Future: navigate to detailed recommendation view
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
