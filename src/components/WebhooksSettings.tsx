'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Zap,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface Webhook {
  id: string;
  webhook_url: string;
  webhook_secret: string;
  events: string[];
  description?: string;
  is_active: boolean;
  last_triggered_at?: string;
  last_status_code?: number;
  failure_count?: number;
  created_at: string;
}

interface WebhookDelivery {
  id: string;
  event_type: string;
  status_code?: number;
  success: boolean;
  error_message?: string;
  delivery_duration_ms?: number;
  delivered_at: string;
}

interface WebhooksSettingsProps {
  projectId: string;
  apiKey: string;
  onShowNotification: (message: string, type?: 'success' | 'error') => void;
}

const availableEvents = [
  { value: 'post.created', label: 'Post Created', description: 'New post is created' },
  { value: 'post.status_changed', label: 'Status Changed', description: 'Post status is updated' },
  { value: 'post.deleted', label: 'Post Deleted', description: 'Post is deleted' },
  { value: 'comment.created', label: 'Comment Created', description: 'New comment is added' },
  { value: 'vote.created', label: 'Vote Created', description: 'New vote is cast' },
];

export function WebhooksSettings({ projectId, apiKey, onShowNotification }: WebhooksSettingsProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // Form state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(availableEvents.map(e => e.value));

  useEffect(() => {
    loadWebhooks();
  }, [projectId, apiKey]);

  const loadWebhooks = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load webhooks');
      }

      const data = await response.json();
      setWebhooks(data.data || []);
    } catch (error) {
      console.error('Error loading webhooks:', error);
      onShowNotification('Failed to load webhooks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = async () => {
    if (!webhookUrl.trim() || !webhookUrl.startsWith('http')) {
      onShowNotification('Please enter a valid HTTPS URL', 'error');
      return;
    }

    if (selectedEvents.length === 0) {
      onShowNotification('Please select at least one event', 'error');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          webhook_url: webhookUrl.trim(),
          events: selectedEvents,
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create webhook');
      }

      const data = await response.json();
      setWebhooks([data.data, ...webhooks]);
      setShowCreateForm(false);
      setWebhookUrl('');
      setDescription('');
      setSelectedEvents(availableEvents.map(e => e.value));
      onShowNotification('Webhook created successfully');
    } catch (error) {
      console.error('Error creating webhook:', error);
      onShowNotification('Failed to create webhook', 'error');
    } finally {
      setCreating(false);
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete webhook');
      }

      setWebhooks(webhooks.filter(w => w.id !== webhookId));
      onShowNotification('Webhook deleted successfully');
    } catch (error) {
      console.error('Error deleting webhook:', error);
      onShowNotification('Failed to delete webhook', 'error');
    }
  };

  const toggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks/${webhookId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update webhook');
      }

      const data = await response.json();
      setWebhooks(webhooks.map(w => w.id === webhookId ? data.data : w));
      onShowNotification(`Webhook ${isActive ? 'disabled' : 'enabled'}`);
    } catch (error) {
      console.error('Error updating webhook:', error);
      onShowNotification('Failed to update webhook', 'error');
    }
  };

  const testWebhook = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks/${webhookId}/test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        onShowNotification(`Test successful! Response: ${data.status_code}`);
      } else {
        onShowNotification(`Test failed: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      onShowNotification('Failed to test webhook', 'error');
    }
  };

  const loadDeliveries = async (webhookId: string) => {
    setSelectedWebhook(webhookId);
    setLoadingDeliveries(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks/${webhookId}/deliveries?limit=20`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load deliveries');
      }

      const data = await response.json();
      setDeliveries(data.data || []);
    } catch (error) {
      console.error('Error loading deliveries:', error);
      onShowNotification('Failed to load delivery logs', 'error');
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const copySecret = (secret: string, webhookId: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(webhookId);
    setTimeout(() => setCopiedSecret(null), 2000);
    onShowNotification('Secret copied to clipboard');
  };

  const toggleShowSecret = (webhookId: string) => {
    setShowSecret(prev => ({ ...prev, [webhookId]: !prev[webhookId] }));
  };

  const toggleEvent = (eventValue: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventValue)
        ? prev.filter(e => e !== eventValue)
        : [...prev, eventValue]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Webhooks
          </h3>
          <p className="text-gray-600 mt-1">
            Receive real-time notifications when events occur in your project
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Webhook
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Webhook</CardTitle>
            <CardDescription>
              Configure a webhook endpoint to receive real-time event notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="webhook-url">Webhook URL *</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-app.com/webhooks/signalsloop"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Must be an HTTPS URL</p>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="e.g., Production webhook for Slack notifications"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="mb-3 block">Events to Subscribe *</Label>
              <div className="space-y-2">
                {availableEvents.map(event => (
                  <div key={event.value} className="flex items-start space-x-2">
                    <Checkbox
                      id={event.value}
                      checked={selectedEvents.includes(event.value)}
                      onCheckedChange={() => toggleEvent(event.value)}
                    />
                    <div className="space-y-0.5">
                      <label
                        htmlFor={event.value}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {event.label}
                      </label>
                      <p className="text-xs text-gray-500">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={createWebhook} disabled={creating}>
                {creating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Webhook'
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 mb-1">Need help setting up webhooks?</h4>
            <p className="text-sm text-blue-700 mb-2">
              Check out our comprehensive documentation with examples and code samples.
            </p>
            <Button
              variant="link"
              className="text-blue-600 p-0 h-auto"
              onClick={() => window.open('/docs/api', '_blank')}
            >
              View API Documentation
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No webhooks configured</h3>
          <p className="text-gray-600 mb-4">
            Create your first webhook to start receiving real-time notifications
          </p>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Webhook
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map(webhook => (
            <Card key={webhook.id}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {webhook.webhook_url}
                        </code>
                        {webhook.is_active ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      {webhook.description && (
                        <p className="text-sm text-gray-600">{webhook.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteWebhook(webhook.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Events */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">SUBSCRIBED EVENTS</p>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map(event => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Secret */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">WEBHOOK SECRET</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded flex-1">
                        {showSecret[webhook.id]
                          ? webhook.webhook_secret
                          : '•'.repeat(40)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleShowSecret(webhook.id)}
                      >
                        {showSecret[webhook.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copySecret(webhook.webhook_secret, webhook.id)}
                      >
                        {copiedSecret === webhook.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  {webhook.last_triggered_at && (
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-gray-500 mb-1">Last Triggered</p>
                        <p className="font-medium">
                          {new Date(webhook.last_triggered_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Last Status</p>
                        <p className="font-medium">
                          {webhook.last_status_code ? (
                            <Badge
                              className={
                                webhook.last_status_code >= 200 && webhook.last_status_code < 300
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {webhook.last_status_code}
                            </Badge>
                          ) : (
                            'N/A'
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Failures</p>
                        <p className="font-medium">{webhook.failure_count || 0}</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleWebhook(webhook.id, webhook.is_active)}
                    >
                      {webhook.is_active ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testWebhook(webhook.id)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadDeliveries(webhook.id)}
                    >
                      <Activity className="w-3 h-3 mr-1" />
                      View Logs
                    </Button>
                  </div>

                  {/* Delivery Logs */}
                  {selectedWebhook === webhook.id && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Recent Deliveries
                      </h4>
                      {loadingDeliveries ? (
                        <div className="flex items-center justify-center py-4">
                          <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                        </div>
                      ) : deliveries.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4 text-center">
                          No delivery attempts yet
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {deliveries.map(delivery => (
                            <div
                              key={delivery.id}
                              className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                            >
                              <div className="flex items-center gap-2">
                                {delivery.success ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-600" />
                                )}
                                <div>
                                  <p className="font-medium">{delivery.event_type}</p>
                                  <p className="text-gray-500">
                                    {new Date(delivery.delivered_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {delivery.status_code && (
                                  <Badge
                                    className={
                                      delivery.success
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }
                                  >
                                    {delivery.status_code}
                                  </Badge>
                                )}
                                {delivery.delivery_duration_ms && (
                                  <p className="text-gray-500 mt-1">
                                    {delivery.delivery_duration_ms}ms
                                  </p>
                                )}
                                {delivery.error_message && (
                                  <p className="text-red-600 text-xs mt-1">
                                    {delivery.error_message}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
