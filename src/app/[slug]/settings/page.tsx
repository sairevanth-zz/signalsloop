'use client';

import React, { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiKeySettings } from '@/components/ApiKeySettings';
import { CustomDomainSettings } from '@/components/CustomDomainSettings';
import GlobalBanner from '@/components/GlobalBanner';
import FeedbackExport from '@/components/FeedbackExport';
import { CSVImport } from '@/components/admin/csv-import';
import SimpleChangelogManager from '@/components/SimpleChangelogManager';
import { WebhooksSettings } from '@/components/WebhooksSettings';
import { SlackIntegrationSettings } from '@/components/SlackIntegrationSettings';
import { DiscordIntegrationSettings } from '@/components/DiscordIntegrationSettings';
import { toast } from 'sonner';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import BoardSettings from '@/components/BoardSettings';
import {
  Key,
  Settings,
  Shield,
  Upload,
  Download,
  Globe,
  FileText,
  UserPlus,
  MessageSquare,
  Zap,
  Plug,
  Mail,
  Users
} from 'lucide-react';
import { NotificationRecipientsManager } from '@/components/NotificationRecipientsManager';
import { TeammatesSettings } from '@/components/TeammatesSettings';

interface Project {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro';
}

export default function SettingsPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const slackStatus = searchParams.get('slack');
  const discordStatus = searchParams.get('discord');
  const derivedTab =
    searchParams.get('tab') ?? (slackStatus || discordStatus ? 'integrations' : 'api-keys');
  const [activeTab, setActiveTab] = useState(derivedTab);
  const [apiKey, setApiKey] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabase, setSupabase] = useState<any>(null);
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined);
  
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
    if (!supabase) return;

    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        console.error('Error getting session:', error);
        setAuthUser(null);
        return;
      }
      setAuthUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    if (authUser !== null) return;
    if (!slackStatus && !discordStatus) return;

    let cancelled = false;

    const attemptSessionRefresh = async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (cancelled) return;
        if (error) {
          console.error('Error refreshing session:', error);
          return;
        }
        if (data?.session?.user) {
          setAuthUser(data.session.user);
        }
      } catch (refreshError) {
        if (!cancelled) {
          console.error('Unexpected session refresh error:', refreshError);
        }
      }
    };

    attemptSessionRefresh();

    return () => {
      cancelled = true;
    };
  }, [supabase, authUser, slackStatus, discordStatus]);

  useEffect(() => {
    if (!supabase) return;
    if (authUser !== null) return;

    try {
      const storedSession = sessionStorage.getItem('signalsloop_saved_session');
      if (!storedSession) {
        return;
      }

      const parsed = JSON.parse(storedSession) as {
        access_token?: string;
        refresh_token?: string;
      };

      sessionStorage.removeItem('signalsloop_saved_session');

      if (!parsed?.access_token || !parsed?.refresh_token) {
        return;
      }

      supabase.auth
        .setSession({
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token,
        })
        .then(({ data, error }) => {
          if (error) {
            console.error('Error restoring Supabase session:', error);
            return;
          }
          if (data.session?.user) {
            setAuthUser(data.session.user);
          }
        })
        .catch((error) => {
          console.error('Unexpected error restoring Supabase session:', error);
        });
    } catch (error) {
      console.error('Failed to restore saved Supabase session:', error);
    }
  }, [supabase, authUser]);

  useEffect(() => {
    if (!supabase || authUser === undefined || !projectSlug) {
      return;
    }

    if (authUser === null) {
      setProject(null);
      setLoading(false);
      return;
    }

    loadProject(authUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, authUser, projectSlug]);

  const loadProject = async (user: User) => {
    if (!supabase) return;

    try {
      setLoading(true);
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

      // Load first API key for webhooks
      const { data: apiKeys } = await supabase
        .from('api_keys')
        .select('key_hash')
        .eq('project_id', projectData.id)
        .limit(1);

      if (apiKeys && apiKeys.length > 0) {
        // Note: We can't retrieve the actual key from hash, but we store it temporarily
        // Users will need to use their API key. For now, show message to use API key
        setApiKey(''); // Will need API key from user
      }
    } catch (error) {
      console.error('Unexpected error loading project:', error);
      toast.error('Failed to load project');
      router.push('/app');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActiveTab(derivedTab);
  }, [derivedTab]);

  useEffect(() => {
    if (!slackStatus) return;

    if (slackStatus === 'connected') {
      toast.success('Slack workspace connected successfully!');
    } else if (slackStatus === 'error') {
      toast.error('Slack connection failed. Please try again.');
    }

    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('slack');
      if (!currentUrl.searchParams.has('tab')) {
        currentUrl.searchParams.set('tab', 'integrations');
      }
      router.replace(
        `${currentUrl.pathname}${
          currentUrl.searchParams.size > 0 ? `?${currentUrl.searchParams.toString()}` : ''
        }`,
        { scroll: false }
      );
    }
  }, [slackStatus, router]);

  useEffect(() => {
    if (!discordStatus || !project) return;

    if (discordStatus === 'connected') {
      toast.success('Discord channel connected successfully!');
    } else if (discordStatus === 'error') {
      toast.error('Discord connection failed. Please try again.');
    }

    if (typeof window !== 'undefined') {
      if (discordStatus === 'connected' || discordStatus === 'error') {
        window.localStorage.setItem(
          'signalsloop_discord_refresh',
          JSON.stringify({
            projectId: project.id,
            status: discordStatus,
            timestamp: Date.now(),
          })
        );
      }

      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('discord');
      if (!currentUrl.searchParams.has('tab')) {
        currentUrl.searchParams.set('tab', 'integrations');
      }
      router.replace(
        `${currentUrl.pathname}${
          currentUrl.searchParams.size > 0 ? `?${currentUrl.searchParams.toString()}` : ''
        }`,
        { scroll: false }
      );
    }
  }, [discordStatus, router, project?.id]);

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

  if (loading || authUser === undefined) {
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

  if (authUser === null) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Session Needed</h1>
            <p className="text-gray-600">
              Please sign in to manage settings for this project.
            </p>
            <Button onClick={() => router.push(`/login?redirect=/${projectSlug}/settings`)}>
              Sign In
            </Button>
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
              onClick={() => router.push(`/${projectSlug}/board`)}
              className="flex items-center gap-2"
            >
              Back to Board
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile: Ultra-compact tabs */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg mb-6 overflow-hidden">
            <div className="overflow-x-auto hide-scrollbar">
              <TabsList className="inline-flex min-w-full w-max bg-transparent p-1 gap-0.5">
                <TabsTrigger 
                  value="api-keys" 
                  className="flex items-center gap-0.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg whitespace-nowrap px-2 py-1.5 text-[10px] sm:text-xs min-touch-target tap-highlight-transparent"
                >
                  <Key className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">API</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="board" 
                  className="flex items-center gap-0.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg whitespace-nowrap px-2 py-1.5 text-[10px] sm:text-xs min-touch-target tap-highlight-transparent"
                >
                  <Settings className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Board</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="domain" 
                  className="flex items-center gap-0.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg whitespace-nowrap px-2 py-1.5 text-[10px] sm:text-xs min-touch-target tap-highlight-transparent"
                >
                  <Globe className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Domain</span>
                </TabsTrigger>
                <TabsTrigger
                  value="integrations"
                  className="flex items-center gap-0.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg whitespace-nowrap px-2 py-1.5 text-[10px] sm:text-xs min-touch-target tap-highlight-transparent"
                >
                  <Plug className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Integrations</span>
                </TabsTrigger>
                <TabsTrigger
                  value="votes"
                  className="flex items-center gap-0.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg whitespace-nowrap px-2 py-1.5 text-[10px] sm:text-xs min-touch-target tap-highlight-transparent"
                >
                  <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Votes</span>
                </TabsTrigger>
                <TabsTrigger
                  value="feedback"
                  className="flex items-center gap-0.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg whitespace-nowrap px-2 py-1.5 text-[10px] sm:text-xs min-touch-target tap-highlight-transparent"
                >
                  <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Feedback</span>
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="flex items-center gap-0.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg whitespace-nowrap px-2 py-1.5 text-[10px] sm:text-xs min-touch-target tap-highlight-transparent"
                >
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Emails</span>
                </TabsTrigger>
                <TabsTrigger
                  value="webhooks"
                  className="flex items-center gap-0.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg whitespace-nowrap px-2 py-1.5 text-[10px] sm:text-xs min-touch-target tap-highlight-transparent"
                >
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Webhooks</span>
                </TabsTrigger>
                <TabsTrigger
                  value="import" 
                  className="flex items-center gap-0.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg whitespace-nowrap px-2 py-1.5 text-[10px] sm:text-xs min-touch-target tap-highlight-transparent"
                >
                  <Upload className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Import</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="export" 
                  className="flex items-center gap-0.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg whitespace-nowrap px-2 py-1.5 text-[10px] sm:text-xs min-touch-target tap-highlight-transparent"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Export</span>
                </TabsTrigger>
                <TabsTrigger
                  value="changelog"
                  className="flex items-center gap-0.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg whitespace-nowrap px-2 py-1.5 text-[10px] sm:text-xs min-touch-target tap-highlight-transparent"
                >
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Changelog</span>
                </TabsTrigger>
                <TabsTrigger
                  value="teammates"
                  className="flex items-center gap-0.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg whitespace-nowrap px-2 py-1.5 text-[10px] sm:text-xs min-touch-target tap-highlight-transparent"
                >
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Team</span>
                </TabsTrigger>
              </TabsList>
            </div>
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

          <TabsContent value="integrations" className="mt-6 space-y-6">
            <SlackIntegrationSettings
              projectId={project.id}
              projectSlug={project.slug}
              userPlan={project.plan}
              onShowNotification={handleShowNotification}
            />
            <DiscordIntegrationSettings
              projectId={project.id}
              projectSlug={project.slug}
              userPlan={project.plan}
              onShowNotification={handleShowNotification}
            />
          </TabsContent>

          <TabsContent value="votes" className="mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Votes on Behalf</h3>
                  <p className="text-gray-600">
                    View and manage votes submitted on behalf of customers
                  </p>
                </div>
              </div>
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  View detailed vote information at:
                </p>
                <Button
                  onClick={() => router.push(`/${projectSlug}/settings/votes`)}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  Open Votes Dashboard
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Feedback on Behalf</h3>
                  <p className="text-gray-600">
                    View and manage feedback submitted on behalf of customers
                  </p>
                </div>
              </div>
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  View detailed feedback information at:
                </p>
                <Button
                  onClick={() => router.push(`/${projectSlug}/settings/feedback`)}
                  className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
                >
                  Open Feedback Dashboard
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <NotificationRecipientsManager
              projectSlug={project.slug}
              currentUserId={authUser?.id}
            />
          </TabsContent>

          <TabsContent value="webhooks" className="mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
              <WebhooksSettingsWrapper
                projectId={project.id}
                onShowNotification={handleShowNotification}
              />
            </div>
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
              <SimpleChangelogManager projectId={project.id} projectSlug={project.slug} />
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

          <TabsContent value="teammates" className="mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
              {project && authUser ? (
                <TeammatesSettings
                  projectId={project.id}
                  projectSlug={project.slug}
                  currentUserId={authUser.id}
                  onShowNotification={handleShowNotification}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Loading...
                  </h3>
                  <p className="text-gray-600">
                    Loading team settings...
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

// Wrapper component to fetch API key for webhooks
function WebhooksSettingsWrapper({
  projectId,
  onShowNotification
}: {
  projectId: string;
  onShowNotification: (message: string, type?: 'success' | 'error') => void;
}) {
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    if (client) {
      setSupabase(client);
    }
  }, []);

  useEffect(() => {
    if (supabase && projectId) {
      loadApiKey();
    }
  }, [supabase, projectId]);

  const loadApiKey = async () => {
    try {
      // Fetch the first API key (we'll need the actual key, not hash)
      // Since we can't retrieve the actual key from hash, we'll show a message
      const { data: apiKeys } = await supabase
        .from('api_keys')
        .select('*')
        .eq('project_id', projectId)
        .limit(1);

      if (apiKeys && apiKeys.length > 0) {
        // We need to inform the user to copy their API key from the API tab
        setApiKey(''); // Empty initially
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyInput = (key: string) => {
    setApiKey(key);
    localStorage.setItem(`webhook_api_key_${projectId}`, key);
  };

  const handleResetApiKey = () => {
    if (confirm('Are you sure you want to reset the API key? You will need to re-enter it.')) {
      localStorage.removeItem(`webhook_api_key_${projectId}`);
      setApiKey('');
    }
  };

  // Try to get API key from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`webhook_api_key_${projectId}`);
    if (stored) {
      setApiKey(stored);
      setLoading(false);
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="text-center py-12">
        <Zap className="w-12 h-12 text-purple-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">API Key Required</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          To manage webhooks, please enter your API key. You can find it in the API Keys tab above.
        </p>
        <div className="max-w-md mx-auto">
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="sk_••••••••••••••••••••••"
              onChange={(e) => handleApiKeyInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => {
              const input = document.querySelector('input[type="password"]') as HTMLInputElement;
              if (input?.value) {
                handleApiKeyInput(input.value);
              }
            }}>
              Continue
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Your API key is stored securely in your browser and never sent to our servers
          </p>
        </div>
      </div>
    );
  }

  return (
    <WebhooksSettings
      projectId={projectId}
      apiKey={apiKey}
      onShowNotification={onShowNotification}
      onResetApiKey={handleResetApiKey}
    />
  );
}
