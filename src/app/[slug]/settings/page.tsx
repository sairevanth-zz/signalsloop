'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiKeySettings } from '@/components/ApiKeySettings';
import BoardSettings from '@/components/BoardSettings';
import { CustomDomainSettings } from '@/components/CustomDomainSettings';
import GlobalBanner from '@/components/GlobalBanner';
import FeedbackExport from '@/components/FeedbackExport';
import { CSVImport } from '@/components/admin/csv-import';
import { ChangelogManager } from '@/components/ChangelogManager';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import { 
  Key, 
  Settings, 
  Shield,
  Upload,
  Download,
  Globe,
  FileText
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
    if (!supabase) return;

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        router.push('/login');
        return;
      }

      // Get project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', projectSlug)
        .eq('owner_id', user.id)
        .single();

      if (projectError || !projectData) {
        console.error('Error loading project:', projectError);
        toast.error('Project not found');
        router.push('/app');
        return;
      }

      setProject(projectData);
    } catch (error) {
      console.error('Unexpected error loading project:', error);
      toast.error('Failed to load project');
      router.push('/app');
    } finally {
      setLoading(false);
    }
  };

  const handleShowNotification = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
            <p className="text-gray-600 mb-6">The project you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => router.push('/app')}>
              Back to Dashboard
            </Button>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Settings</h1>
              <p className="text-gray-600">
                Manage settings for <span className="font-semibold">{project.name}</span>
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.push('/app')}
              className="flex items-center gap-2"
            >
              Back to Dashboard
            </Button>
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
                value="domain" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg"
              >
                <Globe className="w-4 h-4" />
                Custom Domain
              </TabsTrigger>
              <TabsTrigger 
                value="import" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg"
              >
                <Upload className="w-4 h-4" />
                Import
              </TabsTrigger>
              <TabsTrigger 
                value="export" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg"
              >
                <Download className="w-4 h-4" />
                Export
              </TabsTrigger>
              <TabsTrigger 
                value="changelog" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg"
              >
                <FileText className="w-4 h-4" />
                Changelog
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
              </div>
              
              <ApiKeySettings 
                projectId={project.id}
                projectSlug={project.slug}
                userPlan={project.plan}
                onShowNotification={handleShowNotification}
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

          <TabsContent value="domain" className="mt-6">
            <CustomDomainSettings 
              projectId={project.id}
              projectSlug={project.slug}
              userPlan={project.plan}
            />
          </TabsContent>


          <TabsContent value="import" className="mt-6">
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
                <CSVImport projectSlug={project.slug} />
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Upload className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    CSV Import Tool
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Import posts and votes from CSV files into your project. Perfect for migrating data from other feedback systems.
                  </p>
                  <div className="space-y-3">
                    <Button 
                      onClick={() => window.open('/app/billing', '_blank')}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                    >
                      Upgrade to Pro
                    </Button>
                    <p className="text-sm text-gray-500">
                      Try the <Button variant="link" className="p-0 h-auto text-blue-600" onClick={() => window.open('/csv-import-demo', '_blank')}>demo</Button> to see how it works
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Data Export</h3>
                  <p className="text-gray-600">
                    {project?.plan === 'pro' 
                      ? 'Export feedback data to CSV or Excel for analysis'
                      : 'Data export is available for Pro users'
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
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-6">
                  <h4 className="font-medium text-emerald-900 mb-3 flex items-center">
                    <Download className="w-5 h-5 mr-2" />
                    Export Feedback Data
                  </h4>
                  <p className="text-sm text-emerald-700 mb-4">
                    Export feedback data from <strong>{project.name}</strong> to CSV or Excel for analysis in external tools.
                  </p>
                  <FeedbackExport
                    projectSlug={project.slug}
                    projectName={project.name}
                    totalPosts={0} // We don't have this data in settings context
                    totalComments={0}
                    totalVotes={0}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Download className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Data Export
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Export feedback data to CSV or Excel for analysis in external tools. Perfect for reporting and data analysis.
                  </p>
                  <div className="space-y-3">
                    <Button 
                      onClick={() => window.open('/app/billing', '_blank')}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                    >
                      Upgrade to Pro
                    </Button>
                    <p className="text-sm text-gray-500">
                      Try the <Button variant="link" className="p-0 h-auto text-blue-600" onClick={() => window.open('/demo/data-export', '_blank')}>demo</Button> to see how it works
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="changelog" className="mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Changelog Management</h3>
                  <p className="text-gray-600">
                    Create and manage product changelog releases for your users
                  </p>
                </div>
              </div>
              
              {project ? (
                <ChangelogManager projectId={project.id} projectSlug={project.slug} />
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Loading...
                  </h3>
                  <p className="text-gray-600">
                    Loading changelog settings...
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}