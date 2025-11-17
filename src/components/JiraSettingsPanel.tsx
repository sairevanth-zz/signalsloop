'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Trash2,
  Settings,
  Activity
} from 'lucide-react';
import { ConnectJiraButton } from './ConnectJiraButton';
import { useJiraConnection, useDisconnectJira, useJiraSyncStats } from '@/hooks/useJira';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

interface JiraSettingsPanelProps {
  projectId: string;
  onUpdate?: () => void;
}

export function JiraSettingsPanel({ projectId, onUpdate }: JiraSettingsPanelProps) {
  const { connection, loading, isConnected, refetch } = useJiraConnection(projectId);
  const { stats, loading: statsLoading } = useJiraSyncStats(projectId);
  const { disconnect, disconnecting } = useDisconnectJira();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleDisconnect = async () => {
    if (!connection) return;

    const success = await disconnect(connection.id);
    if (success) {
      refetch();
      onUpdate?.();
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Jira Connection</CardTitle>
          <CardDescription>
            Connect your Jira Cloud workspace to create issues from feedback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Connect your Jira account to start creating issues from customer feedback.
                  We use secure OAuth 2.0 authentication - no API keys required.
                </AlertDescription>
              </Alert>
              <ConnectJiraButton
                projectId={projectId}
                onSuccess={() => {
                  refetch();
                  onUpdate?.();
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connection Info */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                    <span className="text-sm font-medium">
                      {connection?.site_name || connection?.site_url}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connected on {formatDate(connection?.created_at)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://${connection?.site_url}`, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Jira
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Jira?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will disconnect your Jira integration. Existing issue links will
                          be preserved but you won't be able to create new issues or receive
                          status updates.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDisconnect}
                          disabled={disconnecting}
                          className="bg-destructive text-destructive-foreground"
                        >
                          {disconnecting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Disconnecting...
                            </>
                          ) : (
                            'Disconnect'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Default Settings */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Default Settings
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? 'Hide' : 'Show'} Advanced
                  </Button>
                </div>

                {showAdvanced && (
                  <div className="grid gap-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Default Project</Label>
                        <Input
                          value={connection?.default_project_key || ''}
                          placeholder="e.g., SLDEV"
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Default Issue Type</Label>
                        <Input
                          value={connection?.default_issue_type || 'Bug'}
                          disabled
                        />
                      </div>
                    </div>

                    <Alert>
                      <AlertDescription className="text-xs">
                        These defaults can be configured when creating an issue. Changes
                        here will require reconnecting your Jira account.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Card */}
      {isConnected && stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Integration Statistics
            </CardTitle>
            <CardDescription>
              Activity summary for your Jira integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stats.total_issues_created || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Issues Created</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stats.issues_created_this_week || 0}</p>
                  <p className="text-xs text-muted-foreground">Created This Week</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stats.successful_syncs || 0}</p>
                  <p className="text-xs text-muted-foreground">Successful Syncs</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-muted-foreground">
                    {formatDate(stats.last_sync_at)}
                  </p>
                  <p className="text-xs text-muted-foreground">Last Sync</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup Guide Card */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Guide</CardTitle>
            <CardDescription>
              How to connect Jira to SignalsLoop
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium">Click "Connect to Jira"</p>
                  <p className="text-xs text-muted-foreground">
                    You'll be redirected to Atlassian to authorize the connection
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium">Authorize SignalsLoop</p>
                  <p className="text-xs text-muted-foreground">
                    Grant permissions to read/write Jira issues
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium">Start creating issues</p>
                  <p className="text-xs text-muted-foreground">
                    Create Jira issues directly from customer feedback with AI assistance
                  </p>
                </div>
              </div>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Secure OAuth 2.0:</strong> We never store your Jira password.
                All tokens are encrypted using AES-256-GCM before storage.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
