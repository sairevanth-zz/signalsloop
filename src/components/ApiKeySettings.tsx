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
  AlertCircle,
  Eye,
  Monitor,
  Smartphone,
  Palette,
  MapPin,
  Shield,
  RotateCcw,
  AlertTriangle,
  Globe,
  Play,
  BookOpen,
  HelpCircle,
  ChevronRight,
  Download,
  Upload,
  Users,
  TrendingUp,
  Map
} from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  name: string;
  key_hash: string;
  created_at: string;
  last_used?: string;
  usage_count: number;
  allowed_domains?: string[];
  usage_limit?: number;
  is_active: boolean;
}

interface WidgetSettings {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  color: string;
  text: string;
  enabled: boolean;
  animationSpeed: 'slow' | 'medium' | 'fast';
  autoOpenRules?: string[];
  customCSS?: string;
}

interface WidgetAnalytics {
  totalLoads: number;
  totalSubmissions: number;
  conversionRate: number;
  topDomains: Array<{ domain: string; count: number }>;
  geographicData: Array<{ country: string; count: number }>;
  performanceOverTime: Array<{ date: string; loads: number; submissions: number }>;
}

interface ApiKeySettingsProps {
  projectId: string;
  projectSlug: string;
  userPlan?: 'free' | 'pro';
  onShowNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function ApiKeySettings({ projectId, projectSlug, userPlan = 'free', onShowNotification }: ApiKeySettingsProps) {
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
    enabled: true,
    animationSpeed: 'medium'
  });
  const [selectedApiKey, setSelectedApiKey] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [analytics, setAnalytics] = useState<WidgetAnalytics | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'html' | 'react' | 'wordpress' | 'squarespace'>('html');
  const [securitySettings, setSecuritySettings] = useState({
    allowedDomains: [] as string[],
    usageLimit: null as number | null,
    suspiciousActivityDetection: true
  });
  
  // Analytics data state
  const [analyticsData, setAnalyticsData] = useState({
    totalWidgetLoads: 0,
    submissionsThisWeek: 0,
    activeDomains: 0
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

  const loadAnalyticsData = useCallback(async () => {
    if (!supabase) return;

    try {
      // Calculate date range for "this week"
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

      // Total Widget Loads (sum of usage_count from all API keys)
      const totalWidgetLoads = apiKeys.reduce((sum, key) => sum + key.usage_count, 0);

      // Submissions This Week
      const { count: submissionsThisWeek } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('event_name', 'feedback_submitted')
        .gte('created_at', sevenDaysAgo.toISOString());

      // Active Domains (distinct referers for widget_loaded events)
      const { data: activeDomainsData } = await supabase
        .from('analytics_events')
        .select('referer', { distinct: true })
        .eq('project_id', projectId)
        .eq('event_name', 'widget_loaded')
        .not('referer', 'is', null);

      setAnalyticsData({
        totalWidgetLoads,
        submissionsThisWeek: submissionsThisWeek || 0,
        activeDomains: activeDomainsData?.length || 0
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
      // Don't show error toast for analytics, just log it
    }
  }, [supabase, projectId, apiKeys]);

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

  useEffect(() => {
    if (supabase && apiKeys.length > 0) {
      loadAnalyticsData();
    }
  }, [supabase, apiKeys, loadAnalyticsData]);

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

  const loadAnalytics = async (keyId: string) => {
    // Mock analytics data - in real implementation, fetch from API
    const mockAnalytics: WidgetAnalytics = {
      totalLoads: 1250,
      totalSubmissions: 89,
      conversionRate: 7.12,
      topDomains: [
        { domain: 'example.com', count: 450 },
        { domain: 'mysite.com', count: 320 },
        { domain: 'blog.example.com', count: 280 }
      ],
      geographicData: [
        { country: 'United States', count: 520 },
        { country: 'United Kingdom', count: 180 },
        { country: 'Canada', count: 150 }
      ],
      performanceOverTime: [
        { date: '2024-01-01', loads: 45, submissions: 3 },
        { date: '2024-01-02', loads: 52, submissions: 4 },
        { date: '2024-01-03', loads: 38, submissions: 2 }
      ]
    };
    setAnalytics(mockAnalytics);
  };

  const getEmbedCode = (apiKey: string, platform: string = 'html') => {
    const domain = typeof window !== 'undefined' ? window.location.origin : 'https://signalsloop.com';
    
    switch (platform) {
      case 'react':
        return `import { useEffect } from 'react';

useEffect(() => {
  const script = document.createElement('script');
  script.src = '${domain}/embed/${apiKey}.js';
  script.async = true;
  document.body.appendChild(script);
  
  return () => {
    document.body.removeChild(script);
  };
}, []);`;
      
      case 'wordpress':
        return `<!-- Add this to your theme's functions.php file -->
function add_signalsloop_widget() {
    wp_enqueue_script('signalsloop-widget', '${domain}/embed/${apiKey}.js', array(), '1.0', true);
}
add_action('wp_enqueue_scripts', 'add_signalsloop_widget');`;
      
      case 'squarespace':
        return `<!-- Add this to Settings > Advanced > Code Injection > Footer -->
<script src="${domain}/embed/${apiKey}.js" async></script>`;
      
      default:
        return `<script src="${domain}/embed/${apiKey}.js"></script>`;
    }
  };

  const getInstallationGuide = (platform: string) => {
    const guides = {
      html: [
        'Copy the embed code above',
        'Paste it before the closing </body> tag on your website',
        'The feedback widget will appear automatically',
        'Users can submit feedback and see your roadmap'
      ],
      react: [
        'Install the SignalsLoop React component',
        'Import and use the component in your app',
        'The widget will automatically load on your pages',
        'Customize appearance using the provided props'
      ],
      wordpress: [
        'Add the code to your theme\'s functions.php file',
        'Or use a plugin like "Insert Headers and Footers"',
        'The widget will appear on all pages',
        'Use WordPress hooks to customize placement'
      ],
      squarespace: [
        'Go to Settings > Advanced > Code Injection',
        'Paste the code in the Footer section',
        'Save your changes',
        'The widget will appear on all pages'
      ]
    };
    return guides[platform as keyof typeof guides] || guides.html;
  };

  const rotateApiKey = async (keyId: string) => {
    if (!supabase) return;
    
    try {
      const newKey = 'sk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const { error } = await supabase
        .from('api_keys')
        .update({ key_hash: btoa(newKey) })
        .eq('id', keyId);

      if (error) throw error;
      
      toast.success('API key rotated successfully!');
      loadApiKeys();
    } catch (error) {
      console.error('Error rotating API key:', error);
      toast.error('Failed to rotate API key');
    }
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="preview">Live Preview</TabsTrigger>
          <TabsTrigger value="install">Installation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="customize">Customize</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
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
          ) : (() => {
            console.log('Rendering API keys tab, apiKeys:', apiKeys, 'length:', apiKeys.length);
            return apiKeys.length === 0;
          })() ? (
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
                            onClick={() => {
                              setSelectedApiKey(apiKey.id);
                              loadAnalytics(apiKey.id);
                            }}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
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
                            onClick={() => rotateApiKey(apiKey.id)}
                            title="Rotate API Key"
                          >
                            <RotateCcw className="h-4 w-4" />
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

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Live Widget Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Create an API key first to preview your widget
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Label>Preview Mode:</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={previewMode === 'desktop' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPreviewMode('desktop')}
                        >
                          <Monitor className="h-4 w-4 mr-1" />
                          Desktop
                        </Button>
                        <Button
                          variant={previewMode === 'mobile' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPreviewMode('mobile')}
                        >
                          <Smartphone className="h-4 w-4 mr-1" />
                          Mobile
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Play className="h-4 w-4 mr-1" />
                        Test Widget
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download Preview
                      </Button>
                    </div>
                  </div>

                  <div className={`relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg overflow-hidden ${
                    previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
                  }`} style={{ height: previewMode === 'mobile' ? '600px' : '400px' }}>
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🌐</div>
                        <p className="text-sm">Your Website Preview</p>
                      </div>
                    </div>
                    <div style={{
                      ...getWidgetPreviewStyle(),
                      animation: widgetSettings.animationSpeed === 'slow' ? 'pulse 3s infinite' : 
                                widgetSettings.animationSpeed === 'fast' ? 'pulse 1s infinite' : 
                                'pulse 2s infinite'
                    }}>
                      💬 {widgetSettings.text}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Position</Label>
                      <select 
                        className="w-full mt-1 p-2 border border-input rounded-md bg-background"
                        value={widgetSettings.position}
                        onChange={(e) => setWidgetSettings({...widgetSettings, position: e.target.value as any})}
                      >
                        <option value="bottom-right">Bottom Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="top-left">Top Left</option>
                      </select>
                    </div>
                    <div>
                      <Label>Animation Speed</Label>
                      <select 
                        className="w-full mt-1 p-2 border border-input rounded-md bg-background"
                        value={widgetSettings.animationSpeed}
                        onChange={(e) => setWidgetSettings({...widgetSettings, animationSpeed: e.target.value as any})}
                      >
                        <option value="slow">Slow</option>
                        <option value="medium">Medium</option>
                        <option value="fast">Fast</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="install" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Installation Guides
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Create an API key first to get installation instructions
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <Label>Platform:</Label>
                    <div className="flex items-center gap-2">
                      {[
                        { value: 'html', label: 'HTML', icon: '🌐' },
                        { value: 'react', label: 'React', icon: '⚛️' },
                        { value: 'wordpress', label: 'WordPress', icon: '📝' },
                        { value: 'squarespace', label: 'Squarespace', icon: '⬜' }
                      ].map((platform) => (
                        <Button
                          key={platform.value}
                          variant={selectedPlatform === platform.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedPlatform(platform.value as any)}
                        >
                          <span className="mr-1">{platform.icon}</span>
                          {platform.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Installation Code</Label>
                      <div className="mt-2 relative">
                        <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                          <code>{getEmbedCode(apiKeys[0] ? atob(apiKeys[0].key_hash) : 'your-api-key', selectedPlatform)}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(getEmbedCode(apiKeys[0] ? atob(apiKeys[0].key_hash) : 'your-api-key', selectedPlatform), 'install')}
                        >
                          {copiedKey === 'install' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        Step-by-Step Guide
                      </h4>
                      <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                        {getInstallationGuide(selectedPlatform).map((step, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-600 font-medium">{index + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-md">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Troubleshooting
                      </h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Make sure the script loads before the closing &lt;/body&gt; tag</li>
                        <li>• Check browser console for any JavaScript errors</li>
                        <li>• Verify your API key is active and has the correct permissions</li>
                        <li>• Clear browser cache if widget doesn't appear immediately</li>
                      </ul>
                    </div>

                    <div className="flex items-center gap-4">
                      <Button variant="outline">
                        <Play className="h-4 w-4 mr-2" />
                        Watch Video Tutorial
                      </Button>
                      <Button variant="outline">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Full Documentation
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Widget Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedApiKey ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Select an API key to view analytics
                  </p>
                </div>
              ) : analytics ? (
                <>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {analytics.totalLoads.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Loads</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {analytics.totalSubmissions}
                      </div>
                      <div className="text-sm text-muted-foreground">Submissions</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {analytics.conversionRate}%
                      </div>
                      <div className="text-sm text-muted-foreground">Conversion Rate</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Top Referring Domains
                      </h4>
                      <div className="space-y-2">
                        {analytics.topDomains.map((domain, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="text-sm font-medium">{domain.domain}</span>
                            <Badge variant="secondary">{domain.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Map className="h-4 w-4" />
                        Geographic Distribution
                      </h4>
                      <div className="space-y-2">
                        {analytics.geographicData.map((geo, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="text-sm font-medium">{geo.country}</span>
                            <Badge variant="outline">{geo.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Performance Over Time</h4>
                    <div className="text-sm text-muted-foreground">
                      <p>📈 Chart visualization would go here (requires charting library)</p>
                      <p className="mt-2">Track widget loads and submissions over time to optimize performance.</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading analytics...</p>
                </div>
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
                <div className="space-y-6">
                  <div>
                    <Label>Position</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[
                        { value: 'top-left', label: 'Top Left', icon: '↖️' },
                        { value: 'top-right', label: 'Top Right', icon: '↗️' },
                        { value: 'bottom-left', label: 'Bottom Left', icon: '↙️' },
                        { value: 'bottom-right', label: 'Bottom Right', icon: '↘️' }
                      ].map((pos) => (
                        <Button
                          key={pos.value}
                          variant={widgetSettings.position === pos.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setWidgetSettings({...widgetSettings, position: pos.value as any})}
                          className="flex items-center gap-2"
                        >
                          <span>{pos.icon}</span>
                          {pos.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Brand Colors</Label>
                    <div className="grid grid-cols-6 gap-2 mt-2">
                      {[
                        '#667eea', '#764ba2', '#f093fb', '#f5576c',
                        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
                        '#fa709a', '#fee140', '#a8edea', '#d299c2'
                      ].map((color) => (
                        <button
                          key={color}
                          className="w-8 h-8 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => setWidgetSettings({...widgetSettings, color})}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
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
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Button Text</Label>
                    <Input
                      value={widgetSettings.text}
                      onChange={(e) => setWidgetSettings({...widgetSettings, text: e.target.value})}
                      placeholder="Feedback"
                      maxLength={20}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {widgetSettings.text.length}/20 characters
                    </p>
                  </div>

                  <div>
                    <Label>Animation Speed</Label>
                    <div className="flex gap-2 mt-2">
                      {[
                        { value: 'slow', label: 'Slow', icon: '🐌' },
                        { value: 'medium', label: 'Medium', icon: '⚡' },
                        { value: 'fast', label: 'Fast', icon: '🚀' }
                      ].map((speed) => (
                        <Button
                          key={speed.value}
                          variant={widgetSettings.animationSpeed === speed.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setWidgetSettings({...widgetSettings, animationSpeed: speed.value as any})}
                          className="flex items-center gap-1"
                        >
                          <span>{speed.icon}</span>
                          {speed.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {userPlan === 'pro' && (
                    <div>
                      <Label>Custom CSS</Label>
                      <textarea
                        className="w-full mt-1 p-2 border border-input rounded-md bg-background text-sm font-mono"
                        rows={4}
                        placeholder="/* Custom CSS for your widget */
.signalsloop-widget {
  border-radius: 20px !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
}"
                        value={widgetSettings.customCSS || ''}
                        onChange={(e) => setWidgetSettings({...widgetSettings, customCSS: e.target.value})}
                      />
                    </div>
                  )}

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
                    <div style={{
                      ...getWidgetPreviewStyle(),
                      animation: widgetSettings.animationSpeed === 'slow' ? 'pulse 3s infinite' : 
                                widgetSettings.animationSpeed === 'fast' ? 'pulse 1s infinite' : 
                                'pulse 2s infinite'
                    }}>
                      💬 {widgetSettings.text}
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <Button size="sm" variant="outline" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Export Settings
                    </Button>
                    <Button size="sm" variant="outline" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Import Settings
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-md">
                <h4 className="font-medium mb-2">Pro Features:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Custom CSS styling</li>
                  <li>• Remove &quot;Powered by SignalsLoop&quot;</li>
                  <li>• Custom domain embedding</li>
                  <li>• Advanced positioning options</li>
                </ul>
                {userPlan === 'free' && (
                  <Button size="sm" className="mt-3">
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security & Access Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Domain Allowlist</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Restrict widget access to specific domains
                    </p>
                    <div className="space-y-2">
                      {securitySettings.allowedDomains.map((domain, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={domain}
                            onChange={(e) => {
                              const newDomains = [...securitySettings.allowedDomains];
                              newDomains[index] = e.target.value;
                              setSecuritySettings({...securitySettings, allowedDomains: newDomains});
                            }}
                            placeholder="example.com"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newDomains = securitySettings.allowedDomains.filter((_, i) => i !== index);
                              setSecuritySettings({...securitySettings, allowedDomains: newDomains});
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSecuritySettings({
                          ...securitySettings,
                          allowedDomains: [...securitySettings.allowedDomains, '']
                        })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Domain
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Usage Limit</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Set monthly usage limit (leave empty for unlimited)
                    </p>
                    <Input
                      type="number"
                      value={securitySettings.usageLimit || ''}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        usageLimit: e.target.value ? parseInt(e.target.value) : null
                      })}
                      placeholder="e.g., 10000"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="suspicious-activity"
                      checked={securitySettings.suspiciousActivityDetection}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        suspiciousActivityDetection: e.target.checked
                      })}
                    />
                    <Label htmlFor="suspicious-activity">
                      Enable suspicious activity detection
                    </Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Security Alerts
                    </h4>
                    <div className="space-y-2">
                      <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            All systems secure
                          </span>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          No suspicious activity detected
                        </p>
                      </div>
                      
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            High usage detected
                          </span>
                        </div>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          95% of monthly limit reached
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Recent Activity</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span>API key rotated</span>
                        <span className="text-muted-foreground">2 hours ago</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span>New domain added</span>
                        <span className="text-muted-foreground">1 day ago</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span>Usage limit updated</span>
                        <span className="text-muted-foreground">3 days ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <Button>
                  <Shield className="h-4 w-4 mr-2" />
                  Save Security Settings
                </Button>
                <Button variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Rotate All Keys
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Security Logs
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
                {analyticsData.totalWidgetLoads}
              </div>
              <div className="text-sm text-muted-foreground">Total Widget Loads</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analyticsData.submissionsThisWeek}</div>
              <div className="text-sm text-muted-foreground">Submissions This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{analyticsData.activeDomains}</div>
              <div className="text-sm text-muted-foreground">Active Domains</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
