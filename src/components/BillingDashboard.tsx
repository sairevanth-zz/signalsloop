'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Crown, 
  Check, 
  X,
  Calendar,
  Download,
  ExternalLink,
  Star,
  BarChart3,
  AlertCircle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface BillingInfo {
  plan: 'free' | 'pro';
  stripe_customer_id: string | null;
  subscription_status: 'active' | 'canceled' | 'past_due' | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  payment_method: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
}

interface ProjectUsage {
  boards_count: number;
  posts_count: number;
  votes_count: number;
  widget_loads: number;
  team_members: number;
}

interface BillingDashboardProps {
  projectId: string;
  projectSlug: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stripeSettings: any;
}

export function BillingDashboard({ 
  projectId, 
  projectSlug,
  stripeSettings 
}: BillingDashboardProps) {
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    plan: 'free',
    stripe_customer_id: null,
    subscription_status: null,
    current_period_end: null,
    cancel_at_period_end: false,
    payment_method: null
  });

  const [usage, setUsage] = useState<ProjectUsage>({
    boards_count: 1,
    posts_count: 12,
    votes_count: 45,
    widget_loads: 1234,
    team_members: 1
  });

  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
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

  const loadBillingInfo = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('plan, stripe_customer_id')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      setBillingInfo(prev => ({
        ...prev,
        plan: data.plan,
        stripe_customer_id: data.stripe_customer_id
      }));

      // If customer has Stripe ID, load subscription info
      if (data.stripe_customer_id) {
        loadStripeSubscription();
      }
    } catch (error) {
      console.error('Error loading billing info:', error);
    }
  }, [supabase, projectId]);

  const loadStripeSubscription = useCallback(async () => {
    if (!supabase) return;

    try {
      // In real implementation, this would call your backend API
      // which then calls Stripe to get subscription details
      const mockSubscription = {
        subscription_status: 'active' as const,
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        payment_method: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025
        }
      };

      setBillingInfo(prev => ({
        ...prev,
        ...mockSubscription
      }));
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  }, [supabase]);

  const loadUsage = useCallback(async () => {
    if (!supabase) return;

    try {
      // Load actual usage data from database
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id')
        .eq('project_id', projectId);

      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('id')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .in('post_id', posts?.map((p: any) => p.id) || []);

      if (!postsError && !votesError) {
        setUsage(prev => ({
          ...prev,
          posts_count: posts?.length || 0,
          votes_count: votes?.length || 0
        }));
      }
    } catch (error) {
      console.error('Error loading usage:', error);
    }
  }, [supabase, projectId]);

  useEffect(() => {
    if (supabase) {
      loadBillingInfo();
      loadUsage();
    }
  }, [supabase, loadBillingInfo, loadUsage]);

  const handleUpgrade = async () => {
    if (!stripeSettings?.configured) {
      toast.error('Stripe is not configured yet');
      return;
    }

    setUpgrading(true);
    
    try {
      if (stripeSettings.payment_method === 'checkout_link') {
        // Method A: Redirect to Stripe Checkout Link
        const checkoutUrl = `https://buy.stripe.com/test_...${projectId}`;
        window.open(checkoutUrl, '_blank');
      } else {
        // Method B: Create hosted checkout session
        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId,
            priceId: stripeSettings.stripe_price_id,
            successUrl: `${window.location.origin}/billing/success`,
            cancelUrl: `${window.location.origin}/billing`
          })
        });

        const { url } = await response.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!billingInfo.stripe_customer_id) {
      toast.error('No billing account found');
      return;
    }

    setLoading(true);
    
    try {
      // Create Stripe Customer Portal session
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: billingInfo.stripe_customer_id,
          returnUrl: `${window.location.origin}/billing`
        })
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast.error('Failed to open billing management');
    } finally {
      setLoading(false);
    }
  };

  const planFeatures = {
    free: [
      { name: '1 feedback board', included: true },
      { name: '50 posts maximum', included: true },
      { name: 'Public boards only', included: true },
      { name: 'Community support', included: true },
      { name: 'SignalLoop branding', included: true },
      { name: 'Basic widget', included: true },
      { name: 'Private boards', included: false },
      { name: 'Custom domain', included: false },
      { name: 'Remove branding', included: false },
      { name: 'Priority support', included: false },
      { name: 'API access', included: false },
      { name: 'Email notifications', included: false }
    ],
    pro: [
      { name: 'Unlimited boards', included: true },
      { name: 'Unlimited posts', included: true },
      { name: 'Private boards', included: true },
      { name: 'Custom domain', included: true },
      { name: 'Remove branding', included: true },
      { name: 'Priority email support', included: true },
      { name: 'API access', included: true },
      { name: 'Email notifications', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Team collaboration', included: true },
      { name: 'White-label widget', included: true },
      { name: 'SLA guarantee', included: true }
    ]
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Billing & Subscription
          </h2>
          <p className="text-muted-foreground">
            Manage your SignalLoop subscription and billing details
          </p>
        </div>
        <Badge 
          variant={billingInfo.plan === 'pro' ? 'default' : 'outline'}
          className="text-sm"
        >
          {billingInfo.plan === 'pro' ? (
            <>
              <Crown className="h-3 w-3 mr-1" />
              Pro Plan
            </>
          ) : (
            'Free Plan'
          )}
        </Badge>
      </div>

      {/* Current Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">
                {billingInfo.plan === 'pro' ? 'SignalLoop Pro' : 'SignalLoop Free'}
              </h3>
              <p className="text-muted-foreground">
                {billingInfo.plan === 'pro' 
                  ? '$19/month - All features included'
                  : 'Free forever - Limited features'
                }
              </p>
            </div>
            {billingInfo.plan === 'free' ? (
              <Button 
                onClick={handleUpgrade}
                disabled={upgrading}
                size="lg"
                className="min-w-[120px]"
              >
                {upgrading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Upgrading...
                  </div>
                ) : (
                  <>
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleManageBilling}
                disabled={loading}
                variant="outline"
              >
                {loading ? 'Loading...' : 'Manage Billing'}
              </Button>
            )}
          </div>

          {billingInfo.plan === 'pro' && billingInfo.current_period_end && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Next billing date:</strong> {formatDate(billingInfo.current_period_end)}
                {billingInfo.cancel_at_period_end && (
                  <span className="text-orange-600 ml-2">
                    (Subscription will cancel at the end of this period)
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {billingInfo.payment_method && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>
                {billingInfo.payment_method.brand.toUpperCase()} ****{billingInfo.payment_method.last4}
                {' '}expires {billingInfo.payment_method.exp_month}/{billingInfo.payment_method.exp_year}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Usage This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {usage.boards_count}
              </div>
              <div className="text-sm text-muted-foreground">Boards</div>
              <div className="text-xs text-muted-foreground mt-1">
                {billingInfo.plan === 'free' ? 'Limit: 1' : 'Unlimited'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {usage.posts_count}
              </div>
              <div className="text-sm text-muted-foreground">Posts</div>
              <div className="text-xs text-muted-foreground mt-1">
                {billingInfo.plan === 'free' ? `Limit: 50` : 'Unlimited'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {usage.votes_count}
              </div>
              <div className="text-sm text-muted-foreground">Votes</div>
              <div className="text-xs text-muted-foreground mt-1">Unlimited</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {usage.widget_loads.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Widget Loads</div>
              <div className="text-xs text-muted-foreground mt-1">Unlimited</div>
            </div>
          </div>

          {billingInfo.plan === 'free' && usage.posts_count >= 45 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You&apos;re approaching the 50 post limit on the Free plan. 
                <Button variant="link" className="h-auto p-0 ml-1" onClick={handleUpgrade}>
                  Upgrade to Pro for unlimited posts
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="relative">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Free Plan
              {billingInfo.plan === 'free' && (
                <Badge variant="outline">Current</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold mb-4">$0<span className="text-sm font-normal">/month</span></div>
            
            <ul className="space-y-2">
              {planFeatures.free.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  {feature.included ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={feature.included ? '' : 'text-muted-foreground'}>
                    {feature.name}
                  </span>
                </li>
              ))}
            </ul>

            {billingInfo.plan !== 'free' && (
              <Button variant="outline" className="w-full mt-4" disabled>
                Current Plan
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="relative border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              Pro Plan
              {billingInfo.plan === 'pro' && (
                <Badge>Current</Badge>
              )}
            </CardTitle>
            <Badge className="absolute top-4 right-4">Most Popular</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold mb-4">$19<span className="text-sm font-normal">/month</span></div>
            
            <ul className="space-y-2">
              {planFeatures.pro.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>{feature.name}</span>
                </li>
              ))}
            </ul>

            {billingInfo.plan === 'free' ? (
              <Button 
                onClick={handleUpgrade}
                disabled={upgrading}
                className="w-full mt-4"
              >
                {upgrading ? 'Starting Upgrade...' : 'Upgrade Now'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleManageBilling}
                disabled={loading}
                variant="outline" 
                className="w-full mt-4"
              >
                Manage Subscription
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      {billingInfo.plan === 'pro' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Billing History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Sample billing history */}
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">SignalLoop Pro - Monthly</div>
                  <div className="text-sm text-muted-foreground">
                    December 15, 2024
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">$19.00</div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">SignalLoop Pro - Monthly</div>
                  <div className="text-sm text-muted-foreground">
                    November 15, 2024
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">$19.00</div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-center mt-4">
              <Button variant="outline" onClick={handleManageBilling}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View All Invoices
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Have questions about billing or need to make changes to your account?
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Billing FAQ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
