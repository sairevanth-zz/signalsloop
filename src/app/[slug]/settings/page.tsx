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
import { SlackSettings } from '@/components/slack/SlackSettings';
import { SlackIntegrationSettings } from '@/components/SlackIntegrationSettings';
import { DiscordIntegrationSettings } from '@/components/DiscordIntegrationSettings';
import { JiraSettingsPanel } from '@/components/JiraSettingsPanel';
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
  Users,
  Activity,
  Briefcase,
  DollarSign,
  Bell,
  Search
} from 'lucide-react';
import { NotificationRecipientsManager } from '@/components/NotificationRecipientsManager';
import { TeammatesSettings } from '@/components/TeammatesSettings';
import { AgentDashboard } from '@/components/agents/AgentDashboard';
import { TriagerSettingsPanel } from '@/components/agents/TriagerSettingsPanel';
import { NotificationSettings, PushNotificationPrompt } from '@/components/notifications';

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
  const [settingsSearch, setSettingsSearch] = useState('');
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
        .single();

      if (projectError || !projectData) {
        console.error('Error loading project:', projectError);
        toast.error('Project not found');
        router.push('/app');
        return;
      }

      // Check if user is owner or admin member
      const isOwner = projectData.owner_id === user.id;
      let hasAccess = isOwner;

      if (!isOwner) {
        const { data: memberData } = await supabase
          .from('members')
          .select('role')
          .eq('project_id', projectData.id)
          .eq('user_id', user.id)
          .single();

        hasAccess = memberData?.role === 'admin';
      }

      if (!hasAccess) {
        toast.error('You do not have permission to access settings');
        router.push('/app');
        return;
      }

      let effectivePlan: 'free' | 'pro' = projectData.plan;

      if (projectData.plan !== 'pro') {
        try {
          const billingResponse = await fetch(`/api/billing/account?accountId=${user.id}`, {
            credentials: 'include',
          });

          if (billingResponse.ok) {
            const billingPayload = await billingResponse.json();
            const billingPlan = billingPayload?.billingInfo?.plan;
            const subscriptionType = billingPayload?.billingInfo?.subscription_type;

            if (billingPlan === 'pro' || subscriptionType === 'gifted') {
              effectivePlan = 'pro';
            }
          } else {
            console.warn('Billing lookup failed while reconciling plan state:', billingResponse.status);
          }
        } catch (planSyncError) {
          console.error('Failed to reconcile project plan from billing info:', planSyncError);
        }
      }

      setProject({
        ...projectData,
        plan: effectivePlan,
      });

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
        `${currentUrl.pathname}${currentUrl.searchParams.size > 0 ? `?${currentUrl.searchParams.toString()}` : ''
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
        `${currentUrl.pathname}${currentUrl.searchParams.size > 0 ? `?${currentUrl.searchParams.toString()}` : ''
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Settings</h1>
              <p className="text-gray-600">
                Manage settings for <span className="font-semibold">{project.name}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search settings..."
                  value={settingsSearch}
                  onChange={(e) => setSettingsSearch(e.target.value)}
                  className="pl-9 pr-4 w-48 sm:w-64 h-9 border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => router.push(`/${projectSlug}/board`)}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                Back to Board
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* 2-Column Layout: Sidebar + Content */}
          <div className="flex gap-8">
            {/* Left Sidebar - Grouped Navigation */}
            <div className="w-72 flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 shadow-lg sticky top-4 overflow-hidden">
                {/* Group 1: Board & Widget */}
                <div className="border-b border-gray-100">
                  <div className="px-4 py-3 bg-gray-50">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Board & Widget</h3>
                  </div>
                  <div className="p-2 space-y-1">
                    <button onClick={() => setActiveTab('api-keys')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === 'api-keys' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <Key className="w-4 h-4" />
                      API Keys
                    </button>
                    <button onClick={() => setActiveTab('board')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === 'board' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <Settings className="w-4 h-4" />
                      Board Settings
                    </button>
                    <button onClick={() => setActiveTab('domain')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === 'domain' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <Globe className="w-4 h-4" />
                      Custom Domain
                    </button>
                  </div>
                </div>

                {/* Group 2: Notifications */}
                <div className="border-b border-gray-100">
                  <div className="px-4 py-3 bg-gray-50">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notifications</h3>
                  </div>
                  <div className="p-2 space-y-1">
                    <button onClick={() => setActiveTab('notifications')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === 'notifications' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <Mail className="w-4 h-4" />
                      Email Alerts
                    </button>
                    <button onClick={() => setActiveTab('push')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === 'push' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <Bell className="w-4 h-4" />
                      Push Notifications
                    </button>
                    <button onClick={() => setActiveTab('webhooks')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === 'webhooks' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <Zap className="w-4 h-4" />
                      Webhooks
                    </button>
                  </div>
                </div>

                {/* Group 3: Integrations */}
                <div className="border-b border-gray-100">
                  <div className="px-4 py-3 bg-gray-50">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Integrations</h3>
                  </div>
                  <div className="p-2 space-y-1">
                    <button onClick={() => setActiveTab('integrations')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === 'integrations' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <Plug className="w-4 h-4" />
                      Connected Apps
                    </button>
                    <button onClick={() => setActiveTab('agents')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === 'agents' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <Activity className="w-4 h-4" />
                      AI Agents
                    </button>
                    <button onClick={() => setActiveTab('import')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === 'import' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <Upload className="w-4 h-4" />
                      Import Data
                    </button>
                    <button onClick={() => setActiveTab('export')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === 'export' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <Download className="w-4 h-4" />
                      Export Data
                    </button>
                  </div>
                </div>

                {/* Group 4: Access & Team */}
                <div>
                  <div className="px-4 py-3 bg-gray-50">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Access & Team</h3>
                  </div>
                  <div className="p-2 space-y-1">
                    <button onClick={() => setActiveTab('teammates')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === 'teammates' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <Users className="w-4 h-4" />
                      Team Members
                    </button>
                    <button onClick={() => setActiveTab('stakeholders')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === 'stakeholders' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <Briefcase className="w-4 h-4" />
                      Stakeholders
                    </button>
                    <button onClick={() => setActiveTab('votes')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === 'votes' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <UserPlus className="w-4 h-4" />
                      Votes Dashboard
                    </button>
                    <button onClick={() => setActiveTab('feedback')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === 'feedback' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <MessageSquare className="w-4 h-4" />
                      Feedback Dashboard
                    </button>
                    <button onClick={() => setActiveTab('changelog')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === 'changelog' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <FileText className="w-4 h-4" />
                      Changelog
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 min-w-0">

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
                {/* CRM Systems - Salesforce & HubSpot */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-500" />
                        CRM Systems
                      </h3>
                      <p className="text-gray-600 mt-1">
                        Connect Salesforce or HubSpot to prioritize feedback by customer revenue
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Revenue-Based Prioritization</div>
                        <div className="text-sm text-gray-600">Configure Salesforce & HubSpot integrations</div>
                      </div>
                    </div>
                    <Button
                      onClick={() => router.push(`/${projectSlug}/settings/integrations?section=crm`)}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      Configure
                    </Button>
                  </div>
                </div>

                {/* Experiment Platforms - LaunchDarkly & Optimizely */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        Experiment Platforms
                      </h3>
                      <p className="text-gray-600 mt-1">
                        Connect LaunchDarkly or Optimizely for live experiment tracking
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gradient-to-r from-teal-50 to-amber-50 border border-teal-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Live Experiment Tracking</div>
                        <div className="text-sm text-gray-600">Configure LaunchDarkly & Optimizely integrations</div>
                      </div>
                    </div>
                    <Button
                      onClick={() => router.push(`/${projectSlug}/settings/integrations?section=experiments`)}
                      className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                    >
                      Configure
                    </Button>
                  </div>
                </div>

                <JiraSettingsPanel
                  projectId={project.id}
                  onUpdate={() => {
                    toast.success('Jira integration updated');
                  }}
                />
                {/* Enhanced Slack Integration with OAuth 2.0 & Block Kit */}
                <SlackSettings projectId={project.id} />

                {/* Discord Integration */}
                <DiscordIntegrationSettings
                  projectId={project.id}
                  projectSlug={project.slug}
                  userPlan={project.plan}
                  onShowNotification={handleShowNotification}
                />

                {/* AI Prototyping - Lovable */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <span className="text-pink-500">✨</span>
                        AI Prototyping
                      </h3>
                      <p className="text-gray-600 mt-1">
                        Generate working prototypes from specs using Lovable AI (BYOK)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                        <span className="text-pink-600 text-lg">💎</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Lovable Prototype Generation</div>
                        <div className="text-sm text-gray-600">Add your own API key to enable prototype generation</div>
                      </div>
                    </div>
                    <Button
                      onClick={() => router.push(`/${projectSlug}/settings/integrations?section=ai`)}
                      className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                    >
                      Configure
                    </Button>
                  </div>
                </div>
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

              <TabsContent value="push" className="mt-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-purple-500" />
                        Push Notifications
                      </h3>
                      <p className="text-gray-600 mt-1">
                        Get real-time alerts for anomalies, competitive intel, and important updates
                      </p>
                    </div>
                  </div>

                  {/* Enable Push Notifications */}
                  <div className="mb-8">
                    <PushNotificationPrompt
                      projectId={project.id}
                      variant="card"
                    />
                  </div>

                  {/* Notification Preferences */}
                  <div className="border-t pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h4>
                    <NotificationSettings projectId={project.id} />
                  </div>
                </div>
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

              <TabsContent value="agents" className="mt-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
                  {project ? (
                    <Tabs defaultValue="status" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="status">Agent Status</TabsTrigger>
                        <TabsTrigger value="triager">Triager Settings</TabsTrigger>
                      </TabsList>
                      <TabsContent value="status">
                        <AgentDashboard projectId={project.id} />
                      </TabsContent>
                      <TabsContent value="triager">
                        <TriagerSettingsPanel projectId={project.id} />
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Activity className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Loading...
                      </h3>
                      <p className="text-gray-600">
                        Loading agent settings...
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

              <TabsContent value="stakeholders" className="mt-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Stakeholder Management</h3>
                      <p className="text-gray-600">
                        Manage stakeholders and automated status reports
                      </p>
                    </div>
                  </div>
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">
                      Configure stakeholders and automated reporting:
                    </p>
                    <Button
                      onClick={() => router.push(`/${projectSlug}/settings/stakeholders`)}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    >
                      <Briefcase className="h-4 w-4 mr-2" />
                      Open Stakeholder Dashboard
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </div>{/* End flex-1 content area */}
          </div>{/* End flex container */}
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
