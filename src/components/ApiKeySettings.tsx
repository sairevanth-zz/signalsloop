'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Key, 
  Copy, 
  Trash2, 
  Plus,
  BarChart3,
  Settings,
  ExternalLink,
  Check,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  name: string;
  key_hash: string;
  created_at: string;
  last_used?: string;
  usage_count: number;
}

interface WidgetSettings {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  color: string;
  text: string;
  enabled: boolean;
}

interface ApiKeySettingsProps {
  projectId: string;
  projectSlug: string;
}

export function ApiKeySettings({ projectId, projectSlug }: ApiKeySettingsProps) {
  console.log('ApiKeySettings received:', { projectId, projectSlug });
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabase, setSupabase] = useState<any>(null);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>({
    position: 'bottom-right',
    color: '#667eea',
    text: 'Feedback',
    enabled: true
  });

  const loadApiKeys = useCallback(async () => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('API keys loaded:', data);
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, [supabase, projectId]);

  // Initialize Supabase client safely
  useEffect(() => {
    const client = getSupabaseClient();
    if (client) {
      setSupabase(client);
    }
  }, []);

  useEffect(() => {
    if (supabase) {
      loadApiKeys();
    }
  }, [projectId, supabase, loadApiKeys]);

  const generateApiKey = async () => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      return;
    }

    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setCreatingKey(true);
    try {
      // Generate a random API key
      const newKey = 'sk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          project_id: projectId,
          name: newKeyName,
          key_hash: btoa(newKey), // In real app, hash this properly
          usage_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      setApiKeys([data, ...apiKeys]);
      setNewKeyName('');
      toast.success('API key created successfully!');
      
      // Auto-copy the new key
      if (typeof window !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(newKey);
        setCopiedKey(data.id);
        setTimeout(() => setCopiedKey(null), 2000);
      }
      
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Failed to create API key');
    } finally {
      setCreatingKey(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      return;
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      setApiKeys(apiKeys.filter(key => key.id !== keyId));
      toast.success('API key deleted');
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string, keyId: string) => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
      toast.success('Copied to clipboard!');
    }
  };

  const getEmbedCode = (apiKey: string) => {
    const domain = typeof window !== 'undefined' ? window.location.origin : 'https://signalloop.com';
    return `<script src="${domain}/embed/${apiKey}.js"></script>`;
  };

  const getWidgetPreviewStyle = () => ({
    position: 'fixed' as const,
    [widgetSettings.position.includes('bottom') ? 'bottom' : 'top']: '20px',
    [widgetSettings.position.includes('right') ? 'right' : 'left']: '20px',
    backgroundColor: widgetSettings.color,
    color: 'white',
    padding: '12px 16px',
    borderRadius: '25px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    opacity: widgetSettings.enabled ? 1 : 0.5
  });

  return (
    <div className="space-y-6">

      <Tabs defaultValue="keys" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="embed">Embed Code</TabsTrigger>
          <TabsTrigger value="customize">Customize</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          {/* Create New API Key */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New API Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., Production Widget, Blog Widget"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && generateApiKey()}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={generateApiKey}
                    disabled={creatingKey || !newKeyName.trim()}
                    className="min-w-[100px]"
                  >
                    {creatingKey ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Key className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Keys List */}
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </CardContent>
            </Card>
          ) : apiKeys.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Key className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No API keys yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first API key to start embedding widgets
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((apiKey) => {
                const maskedKey = 'sk_' + '•'.repeat(20) + apiKey.key_hash.slice(-8);
                return (
                  <Card key={apiKey.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium">{apiKey.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {apiKey.usage_count} uses
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">
                            {maskedKey}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created {new Date(apiKey.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(atob(apiKey.key_hash), apiKey.id)}
                          >
                            {copiedKey === apiKey.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteApiKey(apiKey.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="embed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Embed Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Create an API key first to get your embed code
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <Label>Select API Key</Label>
                    <select className="w-full mt-1 p-2 border border-input rounded-md bg-background">
                      {apiKeys.map((key) => (
                        <option key={key.id} value={key.id}>
                          {key.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Installation Code</Label>
                    <div className="mt-2 relative">
                      <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                        <code>{getEmbedCode(apiKeys[0] ? atob(apiKeys[0].key_hash) : 'your-api-key')}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(getEmbedCode(apiKeys[0] ? atob(apiKeys[0].key_hash) : 'your-api-key'), 'embed')}
                      >
                        {copiedKey === 'embed' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-md">
                    <h4 className="font-medium mb-2">Quick Setup:</h4>
                    <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                      <li>Copy the code above</li>
                      <li>Paste it before the closing &lt;/body&gt; tag on your website</li>
                      <li>The feedback widget will appear automatically</li>
                      <li>Users can submit feedback and see your roadmap</li>
                    </ol>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customize" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Widget Customization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Position</Label>
                    <select 
                      className="w-full mt-1 p-2 border border-input rounded-md bg-background"
                      value={widgetSettings.position}
                      onChange={(e) => setWidgetSettings({...widgetSettings, position: e.target.value as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'})}
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                    </select>
                  </div>

                  <div>
                    <Label>Button Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        value={widgetSettings.color}
                        onChange={(e) => setWidgetSettings({...widgetSettings, color: e.target.value})}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={widgetSettings.color}
                        onChange={(e) => setWidgetSettings({...widgetSettings, color: e.target.value})}
                        placeholder="#667eea"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Button Text</Label>
                    <Input
                      value={widgetSettings.text}
                      onChange={(e) => setWidgetSettings({...widgetSettings, text: e.target.value})}
                      placeholder="Feedback"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enabled"
                      checked={widgetSettings.enabled}
                      onChange={(e) => setWidgetSettings({...widgetSettings, enabled: e.target.checked})}
                    />
                    <Label htmlFor="enabled">Enable Widget</Label>
                  </div>
                </div>

                <div>
                  <Label>Live Preview</Label>
                  <div className="mt-2 relative bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 rounded-lg h-64 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      Your Website Preview
                    </div>
                    <div style={getWidgetPreviewStyle()}>
                      💬 {widgetSettings.text}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-md">
                <h4 className="font-medium mb-2">Pro Features:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Custom CSS styling</li>
                  <li>• Remove &quot;Powered by SignalLoop&quot;</li>
                  <li>• Custom domain embedding</li>
                  <li>• Advanced positioning options</li>
                </ul>
                <Button size="sm" className="mt-3">
                  Upgrade to Pro
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Widget Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Widget Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {apiKeys.reduce((sum, key) => sum + key.usage_count, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Widget Loads</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">24</div>
              <div className="text-sm text-muted-foreground">Submissions This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">8</div>
              <div className="text-sm text-muted-foreground">Active Domains</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
