'use client';

/**
 * Customer Call Intelligence Engine
 *
 * Dashboard for analyzing customer call transcripts
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase-client';
import GlobalBanner from '@/components/GlobalBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Phone, TrendingUp, TrendingDown, AlertTriangle, Users } from 'lucide-react';
import { CallsDashboard } from '@/components/calls/CallsDashboard';

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
              <Phone className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Call Intelligence Engine</h1>
            <p className="text-lg text-gray-600 mb-8">
              Turn customer calls into actionable insights with AI-powered analysis
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <TrendingUp className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">Revenue Insights</h3>
              <p className="text-sm text-gray-600">
                Identify expansion opportunities and churn risks based on call sentiment
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <AlertTriangle className="w-8 h-8 text-orange-600 mb-3" />
              <h3 className="font-semibold mb-2">Objection Tracking</h3>
              <p className="text-sm text-gray-600">
                Automatically detect and categorize customer objections
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <Users className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold mb-2">Competitive Intel</h3>
              <p className="text-sm text-gray-600">
                Track competitor mentions and understand market positioning
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Projects Found</CardTitle>
                <CardDescription>
                  Create a project first to start analyzing customer calls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/app/create">
                  <Button>Create Project</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div>
              <h2 className="text-2xl font-bold mb-6">Select a Project</h2>
              <div className="grid gap-4">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => router.push(`/app/calls?projectId=${project.id}`)}
                  >
                    <CardHeader>
                      <CardTitle>{project.name}</CardTitle>
                      <CardDescription>Click to view call analytics</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CallsPageContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('projectId');
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to view call analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!projectId) {
    return <ProjectSelector />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalBanner />
      <CallsDashboard projectId={projectId} />
    </div>
  );
}

export default function CallsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <CallsPageContent />
    </Suspense>
  );
}
