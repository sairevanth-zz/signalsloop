'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MessageSquare,
  Plug,
  PlugZap,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Input } from '@/components/ui/input';

interface DiscordIntegrationSettingsProps {
  projectId: string;
  projectSlug: string;
  userPlan: 'free' | 'pro';
  onShowNotification?: (message: string, type?: 'success' | 'error') => void;
}

type IntegrationStatus = 'active' | 'invalid' | 'disconnected';

interface DiscordIntegrationResponse {
  connected: boolean;
  integrationStatus: IntegrationStatus;
  integration: {
    guildName?: string | null;
    guildId?: string | null;
    channelName?: string | null;
    channelId?: string | null;
    webhookUrl?: string | null;
    connectedAt?: string | null;
    updatedAt?: string | null;
    scope?: string | null;
  } | null;
}

function formatDate(value?: string | null) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function DiscordIntegrationSettings({
  projectId,
  projectSlug,
  userPlan,
  onShowNotification,
}: DiscordIntegrationSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integration, setIntegration] = useState<DiscordIntegrationResponse | null>(null);
  const [manualWebhookUrl, setManualWebhookUrl] = useState('');
  const [manualChannelName, setManualChannelName] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSaving, setManualSaving] = useState(false);

  const redirectPath = useMemo(
    () => `/${projectSlug}/settings?tab=integrations`,
    [projectSlug]
  );

  const fetchIntegrationStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabaseClient();
      if (!supabase) {
        setError('Unable to connect to Supabase client. Please refresh the page.');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Please sign in to configure Discord integration.');
        return;
      }

      const response = await fetch(
        `/api/integrations/discord?projectId=${encodeURIComponent(projectId)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: 'no-store',
        }
      );

      const data: DiscordIntegrationResponse = await response.json();

      if (!response.ok) {
        setError((data as unknown as { error?: string })?.error || 'Failed to load integration');
        setIntegration(null);
        return;
      }

      setIntegration(data);
    } catch (fetchError) {
      console.error('Discord integration fetch error:', fetchError);
      setError('Failed to load Discord integration status.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const handleConnect = useCallback(async () => {
    try {
      setAuthorizing(true);
      const supabase = getSupabaseClient();
      if (!supabase) {
        onShowNotification?.('Unable to connect to Supabase client.', 'error');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        onShowNotification?.('Please sign in to connect Discord.', 'error');
        return;
      }

      try {
        const storedSession = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          stored_at: Date.now(),
        };
        sessionStorage.setItem('signalsloop_saved_session', JSON.stringify(storedSession));
      } catch (storageError) {
        console.warn('Unable to persist Supabase session for Discord reconnect:', storageError);
      }

      const origin =
        typeof window !== 'undefined' ? window.location.origin : undefined;

      const response = await fetch('/api/integrations/discord/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId,
          redirectTo: origin ? `${origin}${redirectPath}` : redirectPath,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        onShowNotification?.(data?.error || 'Failed to start Discord authorization', 'error');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (connectError) {
      console.error('Discord connect error:', connectError);
      onShowNotification?.('Failed to initiate Discord authorization.', 'error');
    } finally {
      setAuthorizing(false);
    }
  }, [projectId, redirectPath, onShowNotification]);

  const handleDisconnect = useCallback(async () => {
    try {
      setDisconnecting(true);
      const supabase = getSupabaseClient();
      if (!supabase) {
        onShowNotification?.('Unable to connect to Supabase client.', 'error');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        onShowNotification?.('Please sign in to disconnect Discord.', 'error');
        return;
      }

      const response = await fetch(
        `/api/integrations/discord?projectId=${encodeURIComponent(projectId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        onShowNotification?.(data?.error || 'Failed to disconnect Discord.', 'error');
        return;
      }

      onShowNotification?.('Discord integration disconnected.', 'success');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'signalsloop_discord_refresh',
          JSON.stringify({
            projectId,
            status: 'disconnected',
            timestamp: Date.now(),
          })
        );
      }
      await fetchIntegrationStatus();
    } catch (disconnectError) {
      console.error('Discord disconnect error:', disconnectError);
      onShowNotification?.('Failed to disconnect Discord.', 'error');
    } finally {
      setDisconnecting(false);
    }
  }, [projectId, fetchIntegrationStatus, onShowNotification]);

  const handleManualConnect = useCallback(async () => {
    try {
      setManualError(null);
      const trimmedUrl = manualWebhookUrl.trim();
      const trimmedChannel = manualChannelName.trim();

      if (!trimmedUrl) {
        setManualError('Please paste a Discord webhook URL.');
        return;
      }

      setManualSaving(true);

      const supabase = getSupabaseClient();
      if (!supabase) {
        const message = 'Unable to connect to Supabase client.';
        setManualError(message);
        onShowNotification?.(message, 'error');
        setManualSaving(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        const message = 'Please sign in to save a Discord webhook.';
        setManualError(message);
        onShowNotification?.(message, 'error');
        setManualSaving(false);
        return;
      }

      const response = await fetch('/api/integrations/discord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId,
          webhookUrl: trimmedUrl,
          channelName: trimmedChannel || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = data?.error || 'Failed to save webhook.';
        setManualError(message);
        onShowNotification?.(message, 'error');
        setManualSaving(false);
        return;
      }

      onShowNotification?.('Discord webhook saved successfully.', 'success');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'signalsloop_discord_refresh',
          JSON.stringify({
            projectId,
            status: 'connected',
            timestamp: Date.now(),
          })
        );
      }
      setManualWebhookUrl('');
      setManualChannelName('');
      await fetchIntegrationStatus();
    } catch (manualConnectError) {
      console.error('Manual Discord connect error:', manualConnectError);
      const message = 'Failed to save manual Discord webhook.';
      setManualError(message);
      onShowNotification?.(message, 'error');
    } finally {
      setManualSaving(false);
    }
  }, [
    manualWebhookUrl,
    manualChannelName,
    projectId,
    fetchIntegrationStatus,
    onShowNotification,
  ]);

  useEffect(() => {
    fetchIntegrationStatus();
  }, [fetchIntegrationStatus]);
  useEffect(() => {
    const handleFocus = () => {
      fetchIntegrationStatus();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, [fetchIntegrationStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'signalsloop_discord_refresh' || !event.newValue) {
        return;
      }

      try {
        const payload = JSON.parse(event.newValue) as {
          projectId?: string;
          status?: string;
        };

        if (payload.projectId === projectId) {
          fetchIntegrationStatus();
        }
      } catch (storageError) {
        console.error('Failed to parse Discord refresh event:', storageError);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [projectId, fetchIntegrationStatus]);

  if (userPlan !== 'pro') {
    return (
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <MessageSquare className="w-5 h-5 text-indigo-500" />
            Discord Integration
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Connect Discord to share feedback updates directly in your community channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/30">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-300">
              Discord integration is available on the Pro plan. Upgrade to unlock instant Discord
              notifications for new feedback, comments, and status updates.
            </AlertDescription>
          </Alert>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => (window.location.href = '/app/billing')}>
              Upgrade to Pro
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = '/demo')}>
              Explore Demo
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <MessageSquare className="w-5 h-5 text-indigo-500" />
          Discord Integration
          {integration?.connected && (
            <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 ml-2">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Send real-time notifications to a Discord channel when feedback is created, updated, or
          receives activity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Discord integration…
          </div>
        ) : error ? (
          <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        ) : integration?.integrationStatus === 'invalid' ? (
          <div className="space-y-4">
            <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500" />
              <AlertDescription className="space-y-2">
                <div className="font-semibold text-red-900 dark:text-red-300">
                  Discord webhook expired
                </div>
                <p className="text-red-800/80 dark:text-red-400 text-sm">
                  Discord rejected the last vote notification because the stored webhook token is
                  no longer valid. Reconnect to generate a fresh webhook so vote alerts resume.
                </p>
              </AlertDescription>
            </Alert>
            <Button onClick={handleConnect} disabled={authorizing}>
              {authorizing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Reconnecting…
                </>
              ) : (
                <>
                  <Plug className="h-4 w-4 mr-2" />
                  Reconnect Discord
                </>
              )}
            </Button>
          </div>
        ) : integration?.connected && integration.integration ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/40 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-sm text-indigo-700 dark:text-indigo-400 font-medium">Connected Guild</div>
                  <div className="text-base font-semibold text-indigo-900 dark:text-indigo-200">
                    {integration.integration.guildName || 'Discord Server'}
                  </div>
                  <div className="text-sm text-indigo-700 dark:text-indigo-400">
                    Channel: {integration.integration.channelName || 'Selected channel'}
                  </div>
                </div>
                <Badge variant="outline" className="bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                  <PlugZap className="w-4 h-4 mr-1" />
                  Active
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-indigo-900/80 dark:text-indigo-300 sm:grid-cols-2">
                <div>
                  <span className="font-medium">Connected on: </span>
                  {formatDate(integration.integration.connectedAt)}
                </div>
                <div>
                  <span className="font-medium">Last updated: </span>
                  {formatDate(integration.integration.updatedAt)}
                </div>
                {integration.integration.webhookUrl && (
                  <div className="sm:col-span-2 flex items-center gap-2 break-all">
                    <ExternalLink className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    <span>{integration.integration.webhookUrl}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleConnect} variant="outline" disabled={authorizing}>
                {authorizing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Reconnect…
                  </>
                ) : (
                  <>
                    <Plug className="h-4 w-4 mr-2" />
                    Reconnect Discord
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Disconnecting…
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Disconnect
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40">
              <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <AlertDescription className="space-y-2">
                <div className="font-semibold text-indigo-900 dark:text-indigo-200">
                  Ready to connect Discord?
                </div>
                <p className="text-indigo-800/80 dark:text-indigo-400 text-sm">
                  Authorize SignalsLoop to post updates into a Discord channel of your choice. Your
                  community will receive instant notifications for new feedback, comments, votes, and
                  status changes.
                </p>
                <ul className="text-sm text-indigo-800/80 dark:text-indigo-400 list-disc list-inside space-y-1">
                  <li>No bots to configure manually—Discord handles the webhook.</li>
                  <li>Choose the channel during authorization and change it anytime.</li>
                  <li>Disable or reconnect in one click whenever you need.</li>
                </ul>
              </AlertDescription>
            </Alert>
            <Button onClick={handleConnect} disabled={authorizing}>
              {authorizing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Connecting…
                </>
              ) : (
                <>
                  <Plug className="h-4 w-4 mr-2" />
                  Connect Discord
                </>
              )}
            </Button>
          </div>
        )}
        {!loading && (
          <div className="border-t border-indigo-100 dark:border-slate-700 pt-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                  Already have a Discord webhook?
                </div>
                <p className="text-sm text-indigo-800/80 dark:text-indigo-400">
                  Paste an existing webhook URL to connect without using the Discord authorization
                  flow. You need the <span className="font-medium">Manage Webhooks</span> permission
                  in the target server to create one from Discord.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                <Input
                  placeholder="https://discord.com/api/webhooks/…"
                  value={manualWebhookUrl}
                  onChange={(event) => {
                    setManualWebhookUrl(event.target.value);
                    if (manualError) setManualError(null);
                  }}
                  className="dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
                />
                <Input
                  placeholder="Channel name (optional)"
                  value={manualChannelName}
                  onChange={(event) => {
                    setManualChannelName(event.target.value);
                    if (manualError) setManualError(null);
                  }}
                  className="dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleManualConnect} disabled={manualSaving}>
                  {manualSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Plug className="h-4 w-4 mr-2" />
                      Save Webhook
                    </>
                  )}
                </Button>
                <p className="text-xs text-indigo-700/80 dark:text-indigo-400">
                  We store the webhook URL securely and use it only to send product notifications.
                </p>
              </div>
              {manualError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
                  {manualError}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
