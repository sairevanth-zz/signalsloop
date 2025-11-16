/**
 * Competitive Intelligence Dashboard Page
 * Project-specific route: /{slug}/competitive
 */

'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { HybridCompetitiveDashboard } from '@/components/competitive';
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
  const [refreshKey, setRefreshKey] = useState(0);

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
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Link href="/app" className="hover:text-gray-900 inline-flex items-center">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Dashboard
                </Link>
                <span>→</span>
                <Link href={`/${params?.slug}/board`} className="hover:text-gray-900">
                  {projectName}
                </Link>
                <span>→</span>
                <span className="text-gray-900 font-medium">Competitive Intelligence</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Competitive Intelligence</h1>
              <p className="text-gray-600 mt-1">Track competitors, identify feature gaps, and discover strategic opportunities</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/${params?.slug}/board`}>
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Board
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Hybrid Competitive Intelligence Dashboard */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          }
        >
          <HybridCompetitiveDashboard
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
