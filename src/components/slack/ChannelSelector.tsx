/**
 * Slack Channel Selector Component
 *
 * Allows users to map different alert types to specific Slack channels
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
}

interface ChannelMapping {
  alert_type: string;
  channel_id: string;
  channel_name: string;
}

interface ChannelSelectorProps {
  projectId: string;
  connectionId: string;
  existingMappings?: ChannelMapping[];
  onSave?: () => void;
}

const ALERT_TYPES = [
  {
    value: 'critical_feedback',
    label: 'Critical Feedback',
    description: 'High-risk customer feedback requiring immediate attention',
    emoji: '🚨',
  },
  {
    value: 'sentiment_drop',
    label: 'Sentiment Drop',
    description: 'Significant decrease in customer sentiment detected',
    emoji: '📉',
  },
  {
    value: 'new_theme',
    label: 'New Theme Detected',
    description: 'Emerging patterns in customer feedback',
    emoji: '🆕',
  },
  {
    value: 'competitive_threat',
    label: 'Competitive Threat',
    description: 'Increased mentions of competitors',
    emoji: '⚔️',
  },
  {
    value: 'weekly_digest',
    label: 'Weekly Digest',
    description: 'Comprehensive weekly summary (Mondays at 9am)',
    emoji: '📊',
  },
  {
    value: 'jira_created',
    label: 'Jira Issue Created',
    description: 'Confirmation when Jira issues are created from feedback',
    emoji: '🎫',
  },
];

export function ChannelSelector({
  projectId,
  connectionId,
  existingMappings = [],
  onSave,
}: ChannelSelectorProps) {
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadChannels();
    loadExistingMappings();
  }, [projectId, connectionId]);

  const loadChannels = async () => {
    try {
      const response = await fetch(
        `/api/integrations/slack/channels?project_id=${projectId}`
      );

      if (!response.ok) throw new Error('Failed to load channels');

      const data = await response.json();
      setChannels(data.channels);
    } catch (error) {
      console.error('Error loading channels:', error);
      toast.error('Failed to load Slack channels');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingMappings = () => {
    const mappingsMap: Record<string, string> = {};
    existingMappings.forEach((mapping) => {
      mappingsMap[mapping.alert_type] = mapping.channel_id;
    });
    setMappings(mappingsMap);
  };

  const handleChannelChange = (alertType: string, channelId: string) => {
    setMappings((prev) => ({
      ...prev,
      [alertType]: channelId,
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Save each mapping
      const promises = Object.entries(mappings).map(
        async ([alertType, channelId]) => {
          if (!channelId) return; // Skip if no channel selected

          const channel = channels.find((c) => c.id === channelId);
          if (!channel) return;

          const response = await fetch(
            '/api/integrations/slack/channels/mappings',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                connection_id: connectionId,
                alert_type: alertType,
                channel_id: channelId,
                channel_name: channel.name,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to save mapping for ${alertType}`);
          }
        }
      );

      await Promise.all(promises);

      toast.success('Channel mappings saved successfully');
      onSave?.();
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast.error('Failed to save channel mappings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestMessage = async (alertType: string) => {
    const channelId = mappings[alertType];

    if (!channelId) {
      toast.error('Please select a channel first');
      return;
    }

    try {
      const response = await fetch('/api/integrations/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          channel_id: channelId,
        }),
      });

      if (!response.ok) throw new Error('Failed to send test message');

      toast.success('Test message sent! Check your Slack channel.');
    } catch (error) {
      console.error('Error sending test message:', error);
      toast.error('Failed to send test message');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Channel Routing</h3>
        <p className="text-sm text-gray-500">
          Choose which Slack channel receives each type of alert. Different alerts can go to different channels.
        </p>
      </div>

      <div className="space-y-4">
        {ALERT_TYPES.map((alertType) => (
          <div
            key={alertType.value}
            className="flex items-start gap-4 p-4 border rounded-lg"
          >
            <div className="text-3xl">{alertType.emoji}</div>
            <div className="flex-1 space-y-2">
              <div>
                <Label className="text-base font-medium">
                  {alertType.label}
                </Label>
                <p className="text-sm text-gray-500">
                  {alertType.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={mappings[alertType.value] || ''}
                  onValueChange={(value) =>
                    handleChannelChange(alertType.value, value)
                  }
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select channel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.is_private ? '🔒' : '#'} {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {mappings[alertType.value] && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestMessage(alertType.value)}
                  >
                    Test
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Channel Mappings'}
        </Button>
      </div>
    </div>
  );
}
