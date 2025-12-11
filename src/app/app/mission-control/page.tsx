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

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get user's first name
  const getUserName = () => {
    if (!user?.email) return '';
    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

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
    <div className="min-h-screen bg-slate-950">
      <GlobalBanner />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* AI Greeting Section */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 mb-6">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </div>
              <span className="text-sm text-teal-400 font-medium">AI Ready</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">
              {getGreeting()}, {getUserName()}!
            </h1>
            <p className="text-lg text-slate-400">
              Which project would you like to check on today?
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur">
              <Sparkles className="w-8 h-8 text-teal-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">AI-Powered Briefings</h3>
              <p className="text-sm text-slate-400">
                Get executive summaries and actionable insights powered by GPT-4
              </p>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur">
              <TrendingUp className="w-8 h-8 text-emerald-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Real-Time Sentiment</h3>
              <p className="text-sm text-slate-400">
                Track customer sentiment and feedback velocity in real-time
              </p>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur">
              <Target className="w-8 h-8 text-amber-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Priority Insights</h3>
              <p className="text-sm text-slate-400">
                Understand what matters most to your customers right now
              </p>
            </div>
          </div>

          {/* Project Selection Card */}
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Brain className="w-5 h-5 text-teal-400" />
                Select a Project
              </CardTitle>
              <CardDescription className="text-slate-400">
                Choose a project to view its Mission Control dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">Loading projects...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400 mb-4">No projects found</p>
                  <Button asChild className="bg-teal-600 hover:bg-teal-700">
                    <Link href="/app/create">Create Your First Project</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => router.push(`/${project.slug}/dashboard`)}
                      className="flex items-center justify-between p-4 rounded-lg border border-slate-700 hover:border-teal-500 hover:bg-teal-500/10 transition-all text-left group"
                    >
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-teal-400">
                          {project.name}
                        </h3>
                        <p className="text-sm text-slate-500">/{project.slug}</p>
                      </div>
                      <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-teal-400 rotate-180" />
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                  onClick={() => {
                    sessionStorage.setItem('skipMissionControlRedirect', 'true');
                    router.push('/app');
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  View All Projects
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
      <div className="min-h-screen bg-slate-950">
        <GlobalBanner />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-slate-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950">
        <GlobalBanner />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-6">
              <Brain className="w-16 h-16 text-teal-400 mx-auto mb-4" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Mission Control</h1>
            <p className="text-lg text-slate-400 mb-8">
              AI-powered executive dashboard with real-time insights
            </p>
            <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700">
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
        <div className="min-h-screen bg-slate-950">
          <GlobalBanner />
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <p className="text-slate-400">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <MissionControlContent />
    </Suspense>
  );
}
