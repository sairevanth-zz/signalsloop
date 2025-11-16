/**
 * Competitive Intelligence Dashboard Client Component
 * Wrapped in Suspense boundary for useSearchParams
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CompetitiveOverview } from '@/components/competitive/CompetitiveOverview';

export default function CompetitiveIntelligenceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    // Get project ID from URL params or localStorage
    const urlProjectId = searchParams.get('projectId');
    const storedProjectId = typeof window !== 'undefined' ? localStorage.getItem('currentProjectId') : null;

    const activeProjectId = urlProjectId || storedProjectId;

    if (activeProjectId) {
      setProjectId(activeProjectId);
    } else {
      // Redirect to project selection if no project
      router.push('/app');
    }
  }, [searchParams, router]);

  const handleCompetitorClick = (competitorId: string) => {
    router.push(`/competitive/competitor/${competitorId}?projectId=${projectId}`);
  };

  const handleFeatureGapClick = (gapId: string) => {
    router.push(`/competitive/gaps/${gapId}?projectId=${projectId}`);
  };

  const handleRecommendationClick = (recommendationId: string) => {
    router.push(`/competitive/recommendations/${recommendationId}?projectId=${projectId}`);
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <CompetitiveOverview
        projectId={projectId}
        onCompetitorClick={handleCompetitorClick}
        onFeatureGapClick={handleFeatureGapClick}
        onRecommendationClick={handleRecommendationClick}
      />
    </div>
  );
}
