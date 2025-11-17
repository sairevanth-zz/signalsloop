'use client';

/**
 * Auto-Generated User Stories Page
 *
 * AI-powered conversion of themes to sprint-ready user stories
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import GlobalBanner from '@/components/GlobalBanner';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Zap, FileText, Target } from 'lucide-react';
import { UserStoriesDashboard } from '@/components/user-stories/UserStoriesDashboard';

function UserStoriesContent() {
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
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-6">
              <Zap className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Auto-Generated User Stories</h1>
            <p className="text-lg text-gray-600 mb-8">
              Transform feedback themes into sprint-ready user stories with AI
            </p>
            <Button asChild size="lg">
              <Link href="/login">Sign In to Get Started</Link>
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
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <div className="mb-6">
                <Zap className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Auto-Generated User Stories</h1>
              <p className="text-lg text-gray-600">
                Convert feedback themes into development-ready user stories
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <FileText className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">AI-Generated Stories</h3>
                <p className="text-sm text-gray-600">
                  GPT-4 converts themes into proper user story format with acceptance criteria
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <Target className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-semibold mb-2">Story Point Estimation</h3>
                <p className="text-sm text-gray-600">
                  Automatic Fibonacci scale estimation based on complexity and effort
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <ArrowLeft className="w-8 h-8 text-purple-600 mb-3" />
                <h3 className="font-semibold mb-2">Jira Export</h3>
                <p className="text-sm text-gray-600">
                  One-click export to Jira with all fields properly formatted
                </p>
              </div>
            </div>

            <div className="text-center">
              <Button asChild size="lg">
                <Link href="/app">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Select a Project
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalBanner showBackButton={true} backLabel="Back to Dashboard" />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Auto-Generated User Stories</h1>
          <p className="text-gray-600">
            Transform feedback themes into sprint-ready development work
          </p>
        </div>
        <UserStoriesDashboard projectId={projectId} />
      </div>
    </div>
  );
}

export default function UserStoriesPage() {
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
      <UserStoriesContent />
    </Suspense>
  );
}
