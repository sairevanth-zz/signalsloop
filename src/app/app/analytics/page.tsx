'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase-client';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

function AnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectId = searchParams.get('projectId');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!projectId) {
      fetchProjects();
      return;
    }

    fetchProject();
  }, [user, authLoading, projectId]);

  const fetchProjects = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('id, name, slug, created_at')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching projects:', fetchError);
        setError('Failed to load projects');
        return;
      }

      setProjects(data || []);
    } catch (err) {
      console.error('Error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchProject = async () => {
    if (!projectId) return;

    try {
      const supabase = getSupabaseClient();
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('id, name, slug')
        .eq('id', projectId)
        .single();

      if (fetchError) {
        console.error('Error fetching project:', fetchError);
        setError('Failed to load project');
        return;
      }

      if (!data) {
        setError('Project not found');
        return;
      }

      setProject(data);
    } catch (err) {
      console.error('Error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show project selector if no projectId is provided
  if (!projectId && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <Link href="/app">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <BarChart3 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Select a Project</h1>
              <p className="text-gray-600">Choose a project to view its analytics dashboard</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-center">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {projects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">You don't have any projects yet.</p>
                <Link href="/app/create">
                  <Button>Create Your First Project</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((proj) => (
                  <Link
                    key={proj.id}
                    href={`/app/analytics?projectId=${proj.id}`}
                    className="block"
                  >
                    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <BarChart3 className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2 truncate">{proj.name}</h3>
                      <p className="text-sm text-gray-600">View analytics dashboard</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center mt-20">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {error || 'Unable to Load Analytics'}
            </h1>
            <p className="text-gray-600 mb-6">
              The project you requested could not be found or you do not have access to it.
            </p>
            <Link href="/app">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/app">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-600">Analytics Dashboard</p>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard Component */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <AnalyticsDashboard projectId={projectId} />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <AnalyticsContent />
    </Suspense>
  );
}
