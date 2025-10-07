'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Slack,
  Plug,
  PlugZap,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';

interface SlackIntegrationSettingsProps {
  projectId: string;
  projectSlug: string;
  userPlan: 'free' | 'pro';
  onShowNotification?: (message: string, type?: 'success' | 'error') => void;
}

interface SlackIntegrationResponse {
  connected: boolean;
  integration: {
    teamName?: string | null;
    teamId?: string | null;
    channelName?: string | null;
    channelId?: string | null;
    configurationUrl?: string | null;
    connectedAt?: string | null;
    updatedAt?: string | null;
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

export function SlackIntegrationSettings({
  projectId,
  projectSlug,
  userPlan,
  onShowNotification,
}: SlackIntegrationSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integration, setIntegration] = useState<SlackIntegrationResponse | null>(null);

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
        setError('Please sign in to configure Slack integration.');
        return;
      }

      const response = await fetch(
        `/api/integrations/slack?projectId=${encodeURIComponent(projectId)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: 'no-store',
        }
      );

      const data: SlackIntegrationResponse = await response.json();

      if (!response.ok) {
        setError((data as unknown as { error?: string })?.error || 'Failed to load integration');
        return;
      }

      setIntegration(data);
    } catch (fetchError) {
      console.error('Slack integration fetch error:', fetchError);
      setError('Failed to load Slack integration status.');
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
        onShowNotification?.('Please sign in to connect Slack.', 'error');
        return;
      }

      const response = await fetch('/api/integrations/slack/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId,
          redirectTo: redirectPath,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        onShowNotification?.(data?.error || 'Failed to start Slack authorization', 'error');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (connectError) {
      console.error('Slack connect error:', connectError);
      onShowNotification?.('Failed to initiate Slack authorization.', 'error');
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
        onShowNotification?.('Please sign in to disconnect Slack.', 'error');
        return;
      }

      const response = await fetch(
        `/api/integrations/slack?projectId=${encodeURIComponent(projectId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        onShowNotification?.(data?.error || 'Failed to disconnect Slack.', 'error');
        return;
      }

      onShowNotification?.('Slack integration disconnected.', 'success');
      await fetchIntegrationStatus();
    } catch (disconnectError) {
      console.error('Slack disconnect error:', disconnectError);
      onShowNotification?.('Failed to disconnect Slack.', 'error');
    } finally {
      setDisconnecting(false);
    }
  }, [projectId, fetchIntegrationStatus, onShowNotification]);

  useEffect(() => {
    fetchIntegrationStatus();
  }, [fetchIntegrationStatus]);

  if (userPlan !== 'pro') {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Slack className="w-5 h-5 text-purple-600" />
            Slack Integration
          </CardTitle>
          <CardDescription>
            Connect Slack to receive real-time notifications in your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              Slack integration is available on the Pro plan. Upgrade to unlock instant Slack
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
    <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Slack className="w-5 h-5 text-purple-600" />
            Slack Integration
            {integration?.connected ? (
              <Badge variant="outline" className="border-green-500 text-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="border-gray-300 text-gray-500">
                Not Connected
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Automatically post new feedback, comments, and status updates to your team Slack
            channels.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {integration?.connected ? (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnecting || loading}
            >
              {disconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting…
                </>
              ) : (
                <>
                  <Plug className="h-4 w-4 mr-2" />
                  Disconnect
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={authorizing || loading}>
              {authorizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <PlugZap className="h-4 w-4 mr-2" />
                  Connect to Slack
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Slack integration details…
          </div>
        ) : integration?.connected && integration.integration ? (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Workspace
              </h4>
              <p className="mt-1 text-gray-900">
                {integration.integration.teamName || 'Unknown Workspace'}
              </p>
              <p className="text-sm text-gray-500">
                Channel:{' '}
                {integration.integration.channelName
                  ? `#${integration.integration.channelName.replace(/^#/, '')}`
                  : 'Selected during install'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-700">Connected</span>
                <div>{formatDate(integration.integration.connectedAt)}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Last updated</span>
                <div>{formatDate(integration.integration.updatedAt)}</div>
              </div>
            </div>

            {integration.integration.configurationUrl && (
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => window.open(integration.integration.configurationUrl!, '_blank')}
              >
                Manage in Slack
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              Connect Slack to instantly share feedback activity with your team:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Notify a channel when new feedback is submitted</li>
              <li>Alert the team when statuses change or comments are added</li>
              <li>Keep stakeholders aligned without leaving Slack</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
