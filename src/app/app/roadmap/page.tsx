'use client';

/**
 * AI Roadmap Suggestions Page
 *
 * Main page for viewing and managing AI-generated product roadmap
 * Based on multi-factor analysis of all feedback themes
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { RoadmapDashboard } from '@/components/roadmap';
import GlobalBanner from '@/components/GlobalBanner';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

function RoadmapContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [projectId, setProjectId] = useState<string>('');

  useEffect(() => {
    const id = searchParams.get('projectId');
    if (id) {
      setProjectId(id);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GlobalBanner />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GlobalBanner />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">AI Roadmap Suggestions</h1>
            <p className="text-gray-600 mb-8">
              Please sign in to access AI roadmap suggestions
            </p>
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GlobalBanner />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">AI Roadmap Suggestions</h1>
            <p className="text-gray-600 mb-8">
              Please select a project to view roadmap suggestions
            </p>
            <Button asChild>
              <Link href="/app">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalBanner showBackButton={true} backLabel="Back to Dashboard" />
      <div className="container mx-auto px-4 py-8">
        <RoadmapDashboard projectId={projectId} />
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <GlobalBanner />
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <RoadmapContent />
    </Suspense>
  );
}
