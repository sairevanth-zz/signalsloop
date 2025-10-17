'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase-client';
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
  is_yearly?: boolean;
  subscription_type?: 'monthly' | 'yearly' | 'gifted';
  payment_method: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
  // Trial fields
  trial_start_date?: string | null;
  trial_end_date?: string | null;
  trial_status?: 'none' | 'active' | 'cancelled' | 'expired' | 'converted' | null;
  is_trial?: boolean;
  trial_cancelled_at?: string | null;
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
    boards_count: 0,
    posts_count: 0,
    votes_count: 0,
    widget_loads: 0,
    team_members: 0
  });

  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabase, setSupabase] = useState<any>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Initialize Supabase client safely
  useEffect(() => {
    const client = getSupabaseClient();
    if (client) {
      setSupabase(client);
    }
  }, []);

  const loadBillingInfo = useCallback(async () => {
    if (!supabase) return;

    try {
      console.log('🔍 Loading billing info for project:', projectId);
      
      // Check if this is account-level billing (using user ID as project ID)
      if (projectId && projectId.length > 20) {
        // This looks like a user ID, so we'll treat it as account-level billing
        console.log('🔍 Detected account-level billing, using user-based approach');
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('❌ Error getting user for account billing:', userError);
          throw new Error('User not authenticated');
        }

        // Get REAL user data from the users table
        const { data: userData, error: userDataError } = await supabase
          .from('users')
          .select('plan')
          .eq('id', user.id)
          .single();

        if (userDataError) {
          console.error('❌ Error getting user data:', userDataError);
          throw new Error('Failed to load user data');
        }

        // Get the user's primary project to get subscription details
        const { data: primaryProject, error: projectError } = await supabase
          .from('projects')
          .select('plan, subscription_status, current_period_end, cancel_at_period_end, stripe_customer_id, subscription_id, trial_start_date, trial_end_date, trial_status, is_trial, trial_cancelled_at')
          .eq('owner_id', user.id)
          .eq('plan', 'pro')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (projectError) {
          console.error('❌ Error getting primary project:', projectError);
          // Fallback to user data only
          const accountBillingInfo = {
            plan: userData.plan || 'free',
            stripe_customer_id: null,
            subscription_status: null,
            current_period_end: null,
            cancel_at_period_end: false,
            // Trial fields
            trial_start_date: null,
            trial_end_date: null,
            trial_status: 'none' as const,
            is_trial: false,
            trial_cancelled_at: null
          };
          console.log('✅ Account billing info set (fallback):', accountBillingInfo);
          setBillingInfo(accountBillingInfo);
          return;
        }

        if (!primaryProject) {
          const accountBillingInfo = {
            plan: userData.plan || 'free',
            stripe_customer_id: null,
            subscription_status: null,
            current_period_end: null,
            cancel_at_period_end: false,
            // Trial fields
            trial_start_date: null,
            trial_end_date: null,
            trial_status: 'none' as const,
            is_trial: false,
            trial_cancelled_at: null
          };
          console.log('✅ Account billing info set (no pro project):', accountBillingInfo);
          setBillingInfo(accountBillingInfo);
          return;
        }

        // Determine subscription type based on current_period_end
        let subscriptionType: 'monthly' | 'yearly' | 'gifted' = 'monthly';
        let isYearly = false;

        if (primaryProject.current_period_end) {
          const currentDate = new Date();
          const periodEnd = new Date(primaryProject.current_period_end);
          const daysDiff = Math.ceil((periodEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          console.log('📅 Subscription analysis:', {
            currentDate: currentDate.toISOString(),
            periodEnd: periodEnd.toISOString(),
            daysDiff: daysDiff
          });

          if (daysDiff > 300) { // More than ~10 months = yearly
            subscriptionType = 'yearly';
            isYearly = true;
          } else if (daysDiff > 25 && daysDiff < 35) { // ~30 days = monthly
            subscriptionType = 'monthly';
          } else if (!primaryProject.stripe_customer_id && !primaryProject.subscription_id) {
            // No Stripe data but has subscription = gifted
            subscriptionType = 'gifted';
            isYearly = daysDiff > 300;
          }
        }

        // Use REAL data from the database
        const accountBillingInfo = {
          plan: primaryProject.plan || userData.plan || 'free',
          stripe_customer_id: primaryProject.stripe_customer_id,
          subscription_status: primaryProject.subscription_status,
          current_period_end: primaryProject.current_period_end,
          cancel_at_period_end: primaryProject.cancel_at_period_end || false,
          is_yearly: isYearly,
          subscription_type: subscriptionType,
          payment_method: null,
          // Trial fields
          trial_start_date: primaryProject.trial_start_date,
          trial_end_date: primaryProject.trial_end_date,
          trial_status: primaryProject.trial_status || 'none',
          is_trial: primaryProject.is_trial || false,
          trial_cancelled_at: primaryProject.trial_cancelled_at
        };

        console.log('✅ Account billing info set (REAL DATA):', accountBillingInfo);
        console.log('📊 Subscription type detected:', subscriptionType, 'isYearly:', isYearly);
        setBillingInfo(accountBillingInfo);
        return;
      }

      // Project-level billing (existing logic)
      const { data, error } = await supabase
        .from('projects')
        .select('plan, stripe_customer_id, subscription_status, current_period_end, cancel_at_period_end, trial_start_date, trial_end_date, trial_status, is_trial, trial_cancelled_at')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('❌ Error loading project billing data:', error);
        throw error;
      }

      console.log('✅ Project billing data loaded:', data);

      setBillingInfo(prev => ({
        ...prev,
        plan: data.plan || 'free',
        stripe_customer_id: data.stripe_customer_id,
        subscription_status: data.subscription_status,
        current_period_end: data.current_period_end,
        cancel_at_period_end: data.cancel_at_period_end || false,
        // Trial fields
        trial_start_date: data.trial_start_date,
        trial_end_date: data.trial_end_date,
        trial_status: data.trial_status || 'none',
        is_trial: data.is_trial || false,
        trial_cancelled_at: data.trial_cancelled_at
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
    // This function is now handled in loadBillingInfo
    // Keeping it for backward compatibility but it's no longer needed
    console.log('loadStripeSubscription called but data is already loaded in loadBillingInfo');
  }, []);

  const loadUsage = useCallback(async () => {
    if (!supabase) return;

    try {
      // Calculate date range for "this month"
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Check if this is account-level billing
      if (projectId && projectId.length > 20) {
        console.log('🔍 Loading account-level usage stats');
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('❌ Error getting user for account usage:', userError);
          return;
        }

        // Get all projects for this user
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id')
          .eq('owner_id', user.id);

        if (projectsError) {
          console.error('Error loading user projects:', projectsError);
          return;
        }

        const projectIds = projects?.map(p => p.id) || [];

        // Get total posts count across all user projects (this month)
        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select('id')
          .in('project_id', projectIds)
          .gte('created_at', startOfMonth.toISOString());

        // Get total votes count across all user projects (this month)
        const { data: votes, error: votesError } = await supabase
          .from('votes')
          .select('id')
          .gte('created_at', startOfMonth.toISOString())
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .in('post_id', posts?.map((p: any) => p.id) || []);

        // Get widget loads from analytics_events (this month)
        const { data: widgetEvents, error: widgetError } = await supabase
          .from('analytics_events')
          .select('id')
          .in('project_id', projectIds)
          .eq('event_name', 'widget_loaded')
          .gte('created_at', startOfMonth.toISOString());

        if (!postsError && !votesError && !widgetError) {
          console.log('✅ Account usage stats loaded:', {
            projects: projectIds.length,
            posts: posts?.length || 0,
            votes: votes?.length || 0,
            widget_loads: widgetEvents?.length || 0
          });

          setUsage({
            boards_count: projectIds.length,
            posts_count: posts?.length || 0,
            votes_count: votes?.length || 0,
            widget_loads: widgetEvents?.length || 0,
            team_members: 1 // TODO: Implement team member counting
          });
        }
        return;
      }

      // Project-level usage (existing logic)
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id')
        .eq('project_id', projectId)
        .gte('created_at', startOfMonth.toISOString());

      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('id')
        .gte('created_at', startOfMonth.toISOString())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .in('post_id', posts?.map((p: any) => p.id) || []);

      // Get widget loads for this project (this month)
      const { data: widgetEvents, error: widgetError } = await supabase
        .from('analytics_events')
        .select('id')
        .eq('project_id', projectId)
        .eq('event_name', 'widget_loaded')
        .gte('created_at', startOfMonth.toISOString());

      if (!postsError && !votesError && !widgetError) {
        setUsage({
          boards_count: 1, // Single project
          posts_count: posts?.length || 0,
          votes_count: votes?.length || 0,
          widget_loads: widgetEvents?.length || 0,
          team_members: 1 // TODO: Implement team member counting
        });
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

  useEffect(() => {
    if (billingInfo.plan === 'pro' && billingInfo.is_yearly) {
      setSelectedBillingCycle('annual');
    } else {
      setSelectedBillingCycle('monthly');
    }
  }, [billingInfo.plan, billingInfo.is_yearly]);

  const handleUpgrade = async () => {
    console.log('🚀 Upgrade button clicked', selectedBillingCycle);
    
    setUpgrading(true);
    
    try {
      // Use homepage checkout for upgrade
      const response = await fetch('/api/stripe/homepage-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billingType: selectedBillingCycle,
          projectId: projectId,
          returnUrl: `${window.location.origin}/${projectSlug}/billing/success`
        })
      });

      console.log('📡 Upgrade response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      console.log('✅ Upgrade URL received:', url);
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('❌ Error creating upgrade checkout:', error);
      toast.error('Failed to start upgrade process: ' + (error as Error).message);
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageBilling = async () => {
    console.log('🔧 Manage billing clicked');
    console.log('📋 Billing info:', billingInfo);

    if (billingInfo.plan !== 'pro') {
      console.log('⚠️ User is not on Pro plan');
      toast.info('You need to upgrade to Pro first to access billing management. Click "Upgrade Now" to get started!');
      return;
    }

    // Handle subscriptions without Stripe customer ID (e.g., gifted)
    if (!billingInfo.stripe_customer_id) {
      console.log('ℹ️ Subscription not managed through Stripe');
      toast.info('Your Pro subscription is not managed through Stripe. Contact support for assistance.');
      return;
    }

    try {
      setLoading(true);
      console.log('🚀 Creating Stripe Customer Portal session...');

      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: billingInfo.stripe_customer_id,
          returnUrl: window.location.href
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      console.log('✅ Redirecting to Stripe Customer Portal');
      window.location.href = url;
    } catch (error) {
      console.error('❌ Error opening billing portal:', error);
      toast.error('Failed to open billing portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToYearly = async () => {
    console.log('📅 Yearly upgrade clicked');
    console.log('📋 Project ID:', projectId);
    
    setLoading(true);
    
    try {
      console.log('🚀 Creating yearly checkout session...');
      // Create yearly checkout session
      const response = await fetch('/api/stripe/yearly-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: projectId
        })
      });

      console.log('📡 Yearly checkout response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create yearly checkout session');
      }

      const { url } = await response.json();
      console.log('✅ Yearly checkout URL received:', url);
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No yearly checkout URL received');
      }
    } catch (error) {
      console.error('❌ Error creating yearly checkout:', error);
      toast.error('Failed to start yearly upgrade: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };


  const handleCancelTrial = async () => {
    console.log('❌ Cancel trial clicked');
    console.log('📋 Project ID:', projectId);
    
    if (!confirm('Are you sure you want to cancel your trial? You will lose access to Pro features immediately.')) {
      return;
    }

    setLoading(true);
    
    try {
      console.log('🚀 Cancelling trial...');
      const response = await fetch('/api/trial/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: projectId
        })
      });

      console.log('📡 Cancel trial response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel trial');
      }

      const result = await response.json();
      console.log('✅ Trial cancelled:', result);
      toast.success(result.message || 'Trial cancelled successfully');
      
      // Reload billing info
      loadBillingInfo();
    } catch (error) {
      console.error('❌ Error cancelling trial:', error);
      toast.error('Failed to cancel trial: ' + (error as Error).message);
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
      { name: 'SignalsLoop branding', included: true },
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
            Manage your SignalsLoop subscription and billing details
          </p>
        </div>
        <Badge 
          variant={billingInfo.plan === 'pro' ? 'default' : 'outline'}
          className="text-sm"
        >
          {billingInfo.plan === 'pro' ? (
            <>
              <Crown className="h-3 w-3 mr-1" />
              {billingInfo.is_trial ? 'Pro Plan (Trial)' : 'Pro Plan'}
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
                {billingInfo.plan === 'pro' ? 'SignalsLoop Pro' : 'SignalsLoop Free'}
              </h3>
              {billingInfo.plan === 'pro' ? (
                <div>
                  {billingInfo.is_trial ? (
                    <div>
                      <p className="text-muted-foreground">🆓 7-Day Free Trial - All features included</p>
                      {billingInfo.trial_end_date && (
                        <p className="text-sm text-orange-600">
                          ⏰ Trial ends {new Date(billingInfo.trial_end_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : billingInfo.subscription_type === 'gifted' ? (
                    <div>
                      <p className="text-muted-foreground">🎁 Gifted Subscription - All features included</p>
                      {billingInfo.is_yearly && (
                        <p className="text-sm text-purple-600">✨ 1-Year Gifted Subscription</p>
                      )}
                    </div>
                  ) : billingInfo.is_yearly ? (
                    <div>
                      <p className="text-muted-foreground">$15/month billed yearly - All features included</p>
                      <p className="text-sm text-blue-600">💰 Annual billing - 20% savings</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-muted-foreground">$19/month - All features included</p>
                      <p className="text-sm text-blue-600">💰 Save 20% with annual billing - $15/month billed yearly</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Free forever - Limited features</p>
              )}
            </div>
            {billingInfo.plan === 'free' ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant={selectedBillingCycle === 'monthly' ? 'default' : 'outline'}
                    className="flex-1 justify-start"
                    onClick={() => setSelectedBillingCycle('monthly')}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">Monthly</span>
                      <span className="text-sm text-muted-foreground">$19 billed monthly</span>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={selectedBillingCycle === 'annual' ? 'default' : 'outline'}
                    className="flex-1 justify-start"
                    onClick={() => setSelectedBillingCycle('annual')}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">Yearly</span>
                      <span className="text-sm text-muted-foreground">$180 billed yearly (save 20%)</span>
                    </div>
                  </Button>
                </div>
                <Button 
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  size="lg"
                  className="min-w-[160px]"
                >
                  {upgrading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Starting checkout...
                    </div>
                  ) : (
                    <>
                      <Crown className="h-4 w-4 mr-2" />
                      {selectedBillingCycle === 'annual' ? 'Upgrade to Yearly' : 'Upgrade to Monthly'}
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 mb-2">
                  {billingInfo.is_trial && (
                    <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                      🆓 Trial
                    </Badge>
                  )}
                  {billingInfo.subscription_type === 'gifted' && (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                      🎁 Gifted
                    </Badge>
                  )}
                  {billingInfo.is_yearly && billingInfo.subscription_type !== 'gifted' && !billingInfo.is_trial && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      📅 Annual
                    </Badge>
                  )}
                  {billingInfo.subscription_type === 'monthly' && !billingInfo.is_trial && (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      📆 Monthly
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {billingInfo.is_trial ? (
                    <Button 
                      onClick={handleCancelTrial}
                      disabled={loading}
                      variant="destructive"
                      size="sm"
                    >
                      Cancel Trial
                    </Button>
                  ) : (
                    <>
                      {!billingInfo.is_yearly && billingInfo.subscription_type !== 'gifted' && (
                        <Button 
                          onClick={handleUpgradeToYearly}
                          disabled={loading}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Upgrade to Yearly
                        </Button>
                      )}
                      <Button 
                        onClick={handleManageBilling}
                        disabled={loading}
                        variant="outline"
                        size="sm"
                      >
                        {loading ? 'Loading...' : 'Manage Billing'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {billingInfo.plan === 'pro' && billingInfo.current_period_end && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>
                  {billingInfo.subscription_type === 'gifted' ? 'Expires:' : 'Next billing date:'}
                </strong> {formatDate(billingInfo.current_period_end)}
                {billingInfo.subscription_type === 'gifted' && billingInfo.is_yearly && (
                  <span className="text-purple-600 ml-2">
                    (1-Year Gifted Subscription)
                  </span>
                )}
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
                  <div className="font-medium">SignalsLoop Pro - Monthly</div>
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
                  <div className="font-medium">SignalsLoop Pro - Monthly</div>
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
