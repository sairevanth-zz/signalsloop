'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiKeySettings } from '@/components/ApiKeySettings';
import BoardSettings from '@/components/BoardSettings';
import GlobalBanner from '@/components/GlobalBanner';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import { 
  Key, 
  Settings, 
  Shield,
  Users,
  Upload,
  BarChart3,
  Wrench
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro';
}

export default function SettingsPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('api-keys');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabase, setSupabase] = useState<any>(null);
  
  const params = useParams();
  const router = useRouter();
  const projectSlug = params.slug as string;

  // Initialize Supabase client safely
  useEffect(() => {
    const client = getSupabaseClient();
    if (client) {
      setSupabase(client);
    }
  }, []);

  useEffect(() => {
    if (supabase && projectSlug) {
      loadProject();
    }
  }, [supabase, projectSlug]);

  const loadProject = async () => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', projectSlug)
        .single();

      if (projectError || !projectData) {
        toast.error('Project not found');
        router.push('/');
        return;
      }

      setProject(projectData);

    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Something went wrong');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleShowNotification = (message: string, type: 'success' | 'error' | 'info') => {
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast.info(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <GlobalBanner 
          showBackButton={true} 
          backLabel="Back to Dashboard" 
        />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200/50 rounded w-1/3 mb-6"></div>
            <div className="space-y-6">
              {[1,2,3].map(i => (
                <div key={i} className="h-48 bg-gray-200/50 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <GlobalBanner 
          showBackButton={true} 
          backLabel="Back to Dashboard" 
        />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h2>
            <p className="text-gray-600">The project you&apos;re looking for doesn&apos;t exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <GlobalBanner 
        showBackButton={true} 
        backUrl="/app" 
        backLabel="Back to Dashboard" 
      />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6 mb-6">
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Project Settings
              </span>
            </h1>
            <p className="text-gray-600 text-lg">
              Manage your <span className="font-semibold text-blue-600">{project.name}</span> project settings
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-2 mb-6">
            <TabsList className="grid w-full grid-cols-7 bg-transparent">
              <TabsTrigger 
                value="api-keys" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg"
              >
                <Key className="w-4 h-4" />
                API Keys
              </TabsTrigger>
              <TabsTrigger 
                value="board" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg"
              >
                <Settings className="w-4 h-4" />
                Board Settings
              </TabsTrigger>
              <TabsTrigger 
                value="team" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg"
              >
                <Users className="w-4 h-4" />
                Team
              </TabsTrigger>
              <TabsTrigger 
                value="billing" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg"
              >
                <Shield className="w-4 h-4" />
                Billing
              </TabsTrigger>
              <TabsTrigger 
                value="csv-import" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg"
              >
                <Upload className="w-4 h-4" />
                CSV Import
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="tools" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg"
              >
                <Wrench className="w-4 h-4" />
                Tools
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="api-keys" className="mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">API Keys</h3>
                  <p className="text-gray-600">
                    Manage API keys for embedding widgets
                  </p>
                </div>
                <Button 
                  onClick={() => router.push(`/${projectSlug}/settings/testing`)}
                  variant="outline"
                  className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80"
                >
                  Test Widget
                </Button>
              </div>
              <ApiKeySettings 
                projectId={project.id} 
                projectSlug={project.slug}
              />
            </div>
          </TabsContent>

          <TabsContent value="board" className="mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
              <BoardSettings 
                projectSlug={project.slug}
                userPlan={project.plan}
                onShowNotification={handleShowNotification}
              />
            </div>
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Team Management</h3>
                <p className="text-gray-600 mb-4">
                  Invite team members and manage permissions
                </p>
                <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-orange-700 font-medium">
                    Coming soon - Pro feature
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Billing & Subscription</h3>
                <p className="text-gray-600 mb-4">
                  Manage your subscription and billing information
                </p>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Current Plan: <span className="font-bold">{project.plan.charAt(0).toUpperCase() + project.plan.slice(1)}</span>
                  </h4>
                  <p className="text-sm text-blue-700 mb-4">
                    {project.plan === 'free' 
                      ? 'Upgrade to Pro for advanced features like custom CSS, team management, and priority support.'
                      : 'You have access to all Pro features including custom branding and advanced analytics.'
                    }
                  </p>
                  {project.plan === 'free' && (
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
                      Upgrade to Pro
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="csv-import" className="mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">CSV Import</h3>
                  <p className="text-gray-600">
                    {project?.plan === 'pro' 
                      ? 'Import posts and votes from CSV files into your project'
                      : 'CSV import is available for Pro users'
                    }
                  </p>
                </div>
                {project?.plan === 'free' && (
                  <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium text-yellow-800">Pro Feature</span>
                  </div>
                )}
              </div>
              
              {project?.plan === 'pro' ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-medium text-blue-900 mb-4 flex items-center">
                      <Upload className="w-5 h-5 mr-2" />
                      Import Posts & Votes
                    </h4>
                    <p className="text-sm text-blue-700 mb-4">
                      Upload CSV files to import posts and votes into <strong>{project.name}</strong>. Supports bulk operations and data validation.
                    </p>
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => window.open('/csv-import-demo', '_blank')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Import CSV
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => window.open('/api/admin/validate-csv', '_blank')}
                      >
                        Validate CSV
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/60 border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Supported Formats</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• CSV files with headers</li>
                        <li>• UTF-8 encoding</li>
                        <li>• Max file size: 10MB</li>
                      </ul>
                    </div>
                    <div className="bg-white/60 border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Import Features</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Bulk post creation</li>
                        <li>• Vote seeding</li>
                        <li>• Data validation</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Upload className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-yellow-900 mb-2">CSV Import - Pro Feature</h4>
                  <p className="text-yellow-700 mb-6 max-w-md mx-auto">
                    Import posts and votes from CSV files. Bulk operations, data validation, and automated processing.
                  </p>
                  <Button 
                    onClick={() => window.open('/billing', '_blank')}
                    className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white"
                  >
                    Upgrade to Pro
                  </Button>
                  <div className="mt-4">
                    <Button 
                      variant="outline"
                      onClick={() => window.open('/csv-import-demo', '_blank')}
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    >
                      View Demo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h3>
                  <p className="text-gray-600">
                    {project?.plan === 'pro' 
                      ? 'View detailed analytics and insights for your project'
                      : 'Advanced analytics is available for Pro users'
                    }
                  </p>
                </div>
                {project?.plan === 'free' && (
                  <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium text-yellow-800">Pro Feature</span>
                  </div>
                )}
              </div>
              
              {project?.plan === 'pro' ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                    <h4 className="font-medium text-green-900 mb-4 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      {project.name} Analytics
                    </h4>
                    <p className="text-sm text-green-700 mb-4">
                      Track user behavior, post engagement, and project metrics for <strong>{project.name}</strong> with our integrated analytics dashboard.
                    </p>
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => window.open('/analytics-demo', '_blank')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        View Analytics
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => window.open('/posthog-demo', '_blank')}
                      >
                        PostHog Demo
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/60 border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">User Tracking</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Page views</li>
                        <li>• User sessions</li>
                        <li>• Event tracking</li>
                      </ul>
                    </div>
                    <div className="bg-white/60 border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Post Metrics</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Vote counts</li>
                        <li>• Comment activity</li>
                        <li>• Category breakdown</li>
                      </ul>
                    </div>
                    <div className="bg-white/60 border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">AI Insights</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Categorization stats</li>
                        <li>• Confidence scores</li>
                        <li>• Time saved</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BarChart3 className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-yellow-900 mb-2">Advanced Analytics - Pro Feature</h4>
                  <p className="text-yellow-700 mb-6 max-w-md mx-auto">
                    Track user behavior, post engagement, and project metrics with detailed analytics and AI insights.
                  </p>
                  <Button 
                    onClick={() => window.open('/billing', '_blank')}
                    className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white"
                  >
                    Upgrade to Pro
                  </Button>
                  <div className="mt-4">
                    <Button 
                      variant="outline"
                      onClick={() => window.open('/analytics-demo', '_blank')}
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    >
                      View Demo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tools" className="mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Admin Tools</h3>
                  <p className="text-gray-600">
                    {project?.plan === 'pro' 
                      ? 'Additional tools and utilities for project management'
                      : 'Admin tools are available for Pro users'
                    }
                  </p>
                </div>
                {project?.plan === 'free' && (
                  <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium text-yellow-800">Pro Feature</span>
                  </div>
                )}
              </div>
              
              {project?.plan === 'pro' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
                    <h4 className="font-medium text-purple-900 mb-3 flex items-center">
                      <Wrench className="w-5 h-5 mr-2" />
                      SEO Tools
                    </h4>
                    <p className="text-sm text-purple-700 mb-4">
                      Optimize <strong>{project.name}</strong>'s search engine visibility and social media sharing.
                    </p>
                    <Button 
                      onClick={() => window.open('/seo-demo', '_blank')}
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      SEO Tools
                    </Button>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6">
                    <h4 className="font-medium text-orange-900 mb-3 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Open Graph
                    </h4>
                    <p className="text-sm text-orange-700 mb-4">
                      Generate dynamic Open Graph images for <strong>{project.name}</strong> social media sharing.
                    </p>
                    <Button 
                      onClick={() => window.open('/og-demo', '_blank')}
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      OG Generator
                    </Button>
                  </div>

                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
                    <h4 className="font-medium text-indigo-900 mb-3 flex items-center">
                      <Settings className="w-5 h-5 mr-2" />
                      Project Board
                    </h4>
                    <p className="text-sm text-indigo-700 mb-4">
                      View <strong>{project.name}</strong> board with all posts and interactive features.
                    </p>
                    <Button 
                      onClick={() => window.open(`/${project.slug}/board`, '_blank')}
                      variant="outline"
                      className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                    >
                      View Board
                    </Button>
                  </div>

                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-6">
                    <h4 className="font-medium text-teal-900 mb-3 flex items-center">
                      <Key className="w-5 h-5 mr-2" />
                      API Testing
                    </h4>
                    <p className="text-sm text-teal-700 mb-4">
                      Test API endpoints and validate data import/export for <strong>{project.name}</strong>.
                    </p>
                    <Button 
                      onClick={() => window.open('/api/analytics/events', '_blank')}
                      variant="outline"
                      className="border-teal-300 text-teal-700 hover:bg-teal-50"
                    >
                      API Test
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Wrench className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-yellow-900 mb-2">Admin Tools - Pro Feature</h4>
                  <p className="text-yellow-700 mb-6 max-w-md mx-auto">
                    Access advanced admin tools including SEO optimization, Open Graph generation, and API testing.
                  </p>
                  <Button 
                    onClick={() => window.open('/billing', '_blank')}
                    className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white"
                  >
                    Upgrade to Pro
                  </Button>
                  <div className="mt-4">
                    <Button 
                      variant="outline"
                      onClick={() => window.open('/seo-demo', '_blank')}
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    >
                      View Demo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
