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
  Users
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
          backUrl="/app" 
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
          backUrl="/app" 
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
            <TabsList className="grid w-full grid-cols-4 bg-transparent">
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
        </Tabs>
      </div>
    </div>
  );
}
