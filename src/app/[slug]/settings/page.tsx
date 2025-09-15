'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiKeySettings } from '@/components/ApiKeySettings';
import BoardSettings from '@/components/BoardSettings';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import { 
  Key, 
  Settings, 
  Shield,
  Users,
  Palette,
  Loader2
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
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-6">
              {[1,2,3].map(i => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your {project.name} project settings
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="api-keys" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="board" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Board Settings
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">API Keys</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage API keys for embedding widgets
                  </p>
                </div>
                <Button 
                  onClick={() => router.push(`/${projectSlug}/settings/testing`)}
                  variant="outline"
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
            <BoardSettings 
              projectSlug={project.slug}
              userPlan={project.plan}
              onShowNotification={handleShowNotification}
            />
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Team Management</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Invite team members and manage permissions
                  </p>
                  <p className="text-xs text-orange-600">
                    Coming soon - Pro feature
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Billing & Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Billing & Subscription</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage your subscription and billing information
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                    <h4 className="font-medium text-blue-900 mb-2">Current Plan: {project.plan.charAt(0).toUpperCase() + project.plan.slice(1)}</h4>
                    <p className="text-sm text-blue-700">
                      {project.plan === 'free' 
                        ? 'Upgrade to Pro for advanced features like custom CSS, team management, and priority support.'
                        : 'You have access to all Pro features including custom branding and advanced analytics.'
                      }
                    </p>
                    {project.plan === 'free' && (
                      <button className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                        Upgrade to Pro
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
