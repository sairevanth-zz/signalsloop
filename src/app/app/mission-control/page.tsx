'use client';

/**
 * Mission Control Page
 *
 * Direct access to Mission Control dashboard with project selector
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase-client';
import GlobalBanner from '@/components/GlobalBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Brain, Sparkles, Target, TrendingUp } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  slug: string;
}

function ProjectSelector() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function loadProjects() {
      if (!supabase || !user) return;

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, slug')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [supabase, user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalBanner />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="mb-6">
              <Brain className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Mission Control</h1>
            <p className="text-lg text-gray-600 mb-8">
              AI-powered executive dashboard with real-time insights and sentiment tracking
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <Sparkles className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold mb-2">AI-Powered Briefings</h3>
              <p className="text-sm text-gray-600">
                Get executive summaries and actionable insights powered by GPT-4
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <TrendingUp className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">Real-Time Sentiment</h3>
              <p className="text-sm text-gray-600">
                Track customer sentiment and feedback velocity in real-time
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <Target className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold mb-2">Priority Insights</h3>
              <p className="text-sm text-gray-600">
                Understand what matters most to your customers right now
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Select a Project
              </CardTitle>
              <CardDescription>
                Choose a project to view its Mission Control dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading projects...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No projects found</p>
                  <Button asChild>
                    <Link href="/app/create">Create Your First Project</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => router.push(`/${project.slug}/dashboard`)}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                          {project.name}
                        </h3>
                        <p className="text-sm text-gray-500">/{project.slug}</p>
                      </div>
                      <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-blue-600 rotate-180" />
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-6 text-center">
                <Button asChild variant="outline">
                  <Link href="/app">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MissionControlContent() {
  const { user, loading } = useAuth();

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
              <Brain className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Mission Control</h1>
            <p className="text-lg text-gray-600 mb-8">
              AI-powered executive dashboard with real-time insights
            </p>
            <Button asChild size="lg">
              <Link href="/login">Sign In to Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <ProjectSelector />;
}

export default function MissionControlPage() {
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
      <MissionControlContent />
    </Suspense>
  );
}
