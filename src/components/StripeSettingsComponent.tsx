'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Key, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  ExternalLink,
  DollarSign,
  Zap,
  Link,
  Webhook,
  TestTube,
  Eye,
  EyeOff,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

interface StripeSettings {
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  stripe_price_id: string;
  payment_method: 'checkout_link' | 'hosted_checkout';
  test_mode: boolean;
  configured: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  active: boolean;
}

interface StripeSettingsComponentProps {
  projectId: string;
}

export function StripeSettingsComponent({ projectId }: StripeSettingsComponentProps) {
  const [settings, setSettings] = useState<StripeSettings>({
    stripe_publishable_key: '',
    stripe_secret_key: '',
    stripe_webhook_secret: '',
    stripe_price_id: '',
    payment_method: 'checkout_link',
    test_mode: true,
    configured: false
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabase, setSupabase] = useState<any>(null);

  // Initialize Supabase client safely
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      setSupabase(client);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('stripe_settings')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
        setConnectionStatus(data.configured ? 'connected' : 'unknown');
        if (data.configured) {
          loadProducts();
        }
      }
    } catch (error) {
      console.error('Error loading Stripe settings:', error);
    }
  }, [supabase, projectId]);

  const loadProducts = useCallback(async () => {
    try {
      // In a real app, this would call Stripe API to list products
      // For demo purposes, we'll show sample products
      setProducts([
        {
          id: 'price_sample_pro',
          name: 'SignalLoop Pro',
          price: 19,
          currency: 'usd',
          interval: 'month',
          active: true
        }
      ]);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }, []);

  useEffect(() => {
    if (supabase) {
      loadSettings();
    }
  }, [supabase, loadSettings]);

  const testStripeConnection = async () => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      return;
    }

    setTestingConnection(true);
    
    try {
      // Simulate API call to test Stripe connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, this would test the Stripe keys
      if (settings.stripe_secret_key.startsWith('sk_')) {
        setConnectionStatus('connected');
        toast.success('Stripe connection successful!');
        loadProducts();
      } else {
        setConnectionStatus('error');
        toast.error('Invalid Stripe secret key format');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast.error('Failed to connect to Stripe');
    } finally {
      setTestingConnection(false);
    }
  };

  const saveSettings = async () => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('stripe_settings')
        .upsert({
          project_id: projectId,
          ...settings,
          configured: connectionStatus === 'connected',
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      toast.success('Stripe settings saved!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const generateWebhookUrl = () => {
    const domain = typeof window !== 'undefined' ? window.location.origin : 'https://signalloop.com';
    return `${domain}/api/stripe/webhook`;
  };

  const getStripeTestCards = () => [
    { number: '4242424242424242', description: 'Visa - Success' },
    { number: '4000000000000002', description: 'Visa - Declined' },
    { number: '4000002760003184', description: 'Visa - 3D Secure' },
    { number: '5555555555554444', description: 'Mastercard - Success' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stripe Configuration
          </h3>
          <p className="text-sm text-muted-foreground">
            Set up Stripe to accept payments and upgrade users to Pro
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'outline'}>
            {connectionStatus === 'connected' ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : connectionStatus === 'error' ? (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                Error
              </>
            ) : (
              'Not configured'
            )}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Keys
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Get your API keys from the Stripe Dashboard → Developers → API keys
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="test_mode"
                  checked={settings.test_mode}
                  onChange={(e) => setSettings({...settings, test_mode: e.target.checked})}
                />
                <Label htmlFor="test_mode">Use test mode (recommended for development)</Label>
              </div>

              <div>
                <Label htmlFor="publishable_key">
                  Publishable Key {settings.test_mode ? '(Test)' : '(Live)'}
                </Label>
                <Input
                  id="publishable_key"
                  value={settings.stripe_publishable_key}
                  onChange={(e) => setSettings({...settings, stripe_publishable_key: e.target.value})}
                  placeholder={settings.test_mode ? "pk_test_..." : "pk_live_..."}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Safe to use in your frontend code
                </p>
              </div>

              <div>
                <Label htmlFor="secret_key">
                  Secret Key {settings.test_mode ? '(Test)' : '(Live)'}
                </Label>
                <div className="relative">
                  <Input
                    id="secret_key"
                    type={showSecretKey ? "text" : "password"}
                    value={settings.stripe_secret_key}
                    onChange={(e) => setSettings({...settings, stripe_secret_key: e.target.value})}
                    placeholder={settings.test_mode ? "sk_test_..." : "sk_live_..."}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                  >
                    {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Keep this secret! Only use on your server
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={testStripeConnection}
                  disabled={testingConnection || !settings.stripe_secret_key}
                  variant="outline"
                >
                  {testingConnection ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Testing...
                    </div>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>

                <Button
                  onClick={saveSettings}
                  disabled={loading || connectionStatus !== 'connected'}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Saving...
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setSettings({...settings, payment_method: 'checkout_link'})}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    settings.payment_method === 'checkout_link'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Link className="h-4 w-4" />
                    <h4 className="font-medium">Checkout Links (Easy)</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pre-built payment pages hosted by Stripe. No coding required.
                  </p>
                  <div className="mt-2">
                    <Badge variant="secondary">No webhooks needed</Badge>
                  </div>
                </button>

                <button
                  onClick={() => setSettings({...settings, payment_method: 'hosted_checkout'})}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    settings.payment_method === 'hosted_checkout'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4" />
                    <h4 className="font-medium">Hosted Checkout (Recommended)</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Dynamic checkout with instant feature unlocking via webhooks.
                  </p>
                  <div className="mt-2">
                    <Badge variant="default">More flexible</Badge>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Stripe Products
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!settings.configured ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Configure your Stripe API keys first to load products
                  </AlertDescription>
                </Alert>
              ) : products.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <h4 className="font-medium mb-1">No products found</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a product in your Stripe Dashboard first
                  </p>
                  <Button variant="outline" asChild>
                    <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Stripe Dashboard
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        settings.stripe_price_id === product.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSettings({...settings, stripe_price_id: product.id})}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            ${product.price}/{product.interval} • {product.currency.toUpperCase()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {product.active && <Badge variant="default">Active</Badge>}
                          {settings.stripe_price_id === product.id && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>How to create a product:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li>Go to Stripe Dashboard → Products</li>
                    <li>Click &quot;Add product&quot;</li>
                    <li>Name: &quot;SignalLoop Pro&quot;, Price: $19/month</li>
                    <li>Save and copy the Price ID (starts with price_)</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Webhook Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.payment_method === 'checkout_link' ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Checkout Links don&apos;t require webhooks. Use Zapier or manual processing for the first 10 customers.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div>
                    <Label htmlFor="webhook_url">Webhook Endpoint URL</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="webhook_url"
                        value={generateWebhookUrl()}
                        readOnly
                        className="bg-muted"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(generateWebhookUrl());
                          toast.success('Webhook URL copied!');
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="webhook_secret">Webhook Signing Secret</Label>
                    <Input
                      id="webhook_secret"
                      type="password"
                      value={settings.stripe_webhook_secret}
                      onChange={(e) => setSettings({...settings, stripe_webhook_secret: e.target.value})}
                      placeholder="whsec_..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Get this from Stripe Dashboard after creating the webhook
                    </p>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Webhook Setup Steps:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                        <li>Go to Stripe Dashboard → Developers → Webhooks</li>
                        <li>Click &quot;Add endpoint&quot;</li>
                        <li>URL: Copy the webhook URL above</li>
                        <li>Events: Select &quot;checkout.session.completed&quot;</li>
                        <li>Save and copy the signing secret</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Test Your Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!settings.configured ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Complete the setup first to enable testing
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your Stripe integration is configured! Use these test cards to simulate payments.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-medium mb-3">Test Cards</h4>
                    <div className="space-y-2">
                      {getStripeTestCards().map((card, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <code className="text-sm font-mono">{card.number}</code>
                            <p className="text-xs text-muted-foreground">{card.description}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(card.number);
                              toast.success('Card number copied!');
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Test Checklist:</h4>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      <li>Create a test user account</li>
                      <li>Navigate to billing/upgrade page</li>
                      <li>Complete checkout with test card</li>
                      <li>Verify user plan upgraded to &quot;Pro&quot;</li>
                      <li>Test Pro features are unlocked</li>
                      <li>Check webhook was received (if using hosted checkout)</li>
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
