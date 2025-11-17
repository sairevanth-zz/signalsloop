/**
 * Slack Settings Dashboard
 *
 * Comprehensive settings interface for Slack integration
 * Manages connection, channel mappings, alert rules, and logs
 */

'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConnectSlackButton } from './ConnectSlackButton';
import { ChannelSelector } from './ChannelSelector';
import { AlertRulesConfig } from './AlertRulesConfig';
import { toast } from 'sonner';

interface SlackConnection {
  id: string;
  team_name: string;
  team_id: string;
  status: string;
  created_at: string;
}

interface SlackSettingsProps {
  projectId: string;
}

export function SlackSettings({ projectId }: SlackSettingsProps) {
  const [connection, setConnection] = useState<SlackConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadConnection();
  }, [projectId]);

  const loadConnection = async () => {
    try {
      const response = await fetch(
        `/api/integrations/slack/connection?project_id=${projectId}`
      );

      if (response.ok) {
        const data = await response.json();
        setConnection(data.connection);
        if (data.connection) {
          loadStats(data.connection.id);
        }
      }
    } catch (error) {
      console.error('Error loading connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (connectionId: string) => {
    try {
      const response = await fetch(
        `/api/integrations/slack/stats?connection_id=${connectionId}`
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;

    if (
      !confirm(
        'Are you sure you want to disconnect from Slack? All channel mappings will be removed.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        '/api/integrations/slack/disconnect',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connection_id: connection.id }),
        }
      );

      if (!response.ok) throw new Error('Failed to disconnect');

      toast.success('Disconnected from Slack');
      setConnection(null);
      setStats(null);
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect from Slack');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg
          className="animate-spin h-8 w-8 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );
  }

  // Not connected state
  if (!connection) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <svg
              className="w-24 h-24 text-gray-400"
              viewBox="0 0 54 54"
              fill="none"
            >
              <g clipPath="url(#clip0)">
                <path
                  d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386"
                  fill="#36C5F0"
                />
                <path
                  d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387"
                  fill="#2EB67D"
                />
                <path
                  d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386"
                  fill="#ECB22E"
                />
                <path
                  d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336 0v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.25a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387"
                  fill="#E01E5A"
                />
              </g>
            </svg>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">
              Connect to Slack
            </h3>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Transform your feedback workflow with intelligent Slack alerts. Get notified about critical feedback, sentiment drops, emerging themes, and competitive threats - all beautifully formatted with interactive actions.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl mb-2">🎨</div>
                <h4 className="font-medium mb-1">Rich Formatting</h4>
                <p className="text-sm text-gray-500">
                  Beautiful Block Kit messages with context and details
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl mb-2">🎯</div>
                <h4 className="font-medium mb-1">Smart Rules</h4>
                <p className="text-sm text-gray-500">
                  Configure thresholds to reduce noise, amplify signal
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl mb-2">⚡</div>
                <h4 className="font-medium mb-1">Interactive Actions</h4>
                <p className="text-sm text-gray-500">
                  Create Jira issues, acknowledge alerts with one click
                </p>
              </div>
            </div>

            <ConnectSlackButton
              projectId={projectId}
              onConnected={loadConnection}
            />

            <p className="text-xs text-gray-400">
              By connecting, you authorize SignalsLoop to send messages to your Slack workspace
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Connected state
  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#4A154B] rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8" fill="white" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">{connection.team_name}</h3>
              <p className="text-sm text-gray-500">
                Connected on {new Date(connection.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <Button variant="outline" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="mt-6 pt-6 border-t grid grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Messages</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {stats.successful}
              </div>
              <div className="text-sm text-gray-500">Successful</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {stats.failed}
              </div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {stats.success_rate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Success Rate</div>
            </div>
          </div>
        )}
      </Card>

      {/* Configuration Tabs */}
      <Tabs defaultValue="channels" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="channels">Channel Routing</TabsTrigger>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="mt-6">
          <Card className="p-6">
            <ChannelSelector
              projectId={projectId}
              connectionId={connection.id}
              onSave={loadConnection}
            />
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <Card className="p-6">
            <AlertRulesConfig projectId={projectId} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
