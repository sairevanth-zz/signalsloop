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
  ExternalLink,
  Star,
  BarChart3,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BillingInfo {
  plan: 'free' | 'pro' | 'premium';
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
  const returnPath = projectSlug ? `/${projectSlug}/billing` : '/app/billing';
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
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const upgradeButtonLabel =
    selectedBillingCycle === 'yearly'
      ? 'Upgrade to Yearly – $180/yr'
      : 'Upgrade to Monthly – $19/mo';

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
        const response = await fetch(`/api/billing/account?accountId=${user.id}`);
        if (!response.ok) {
          throw new Error('Failed to load account billing info');
        }

        const data = await response.json();
        setBillingInfo(data.billingInfo);
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
      setSelectedBillingCycle('yearly');
    } else {
      setSelectedBillingCycle('monthly');
    }
  }, [billingInfo.plan, billingInfo.is_yearly]);

  const handleUpgrade = async () => {
    console.log('🚀 Upgrade button clicked', selectedBillingCycle);

    setUpgrading(true);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billingCycle: selectedBillingCycle,
          projectId: projectId,
          successUrl: `${window.location.origin}${returnPath}?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}${returnPath}?cancelled=true`,
        })
      });

      console.log('📡 Upgrade response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to create checkout session');
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

    // Allow billing access for pro OR premium plans
    if (billingInfo.plan !== 'pro' && billingInfo.plan !== 'premium') {
      console.log('⚠️ User is not on a paid plan');
      toast.info('You need to upgrade to Pro first to access billing management.');
      return;
    }

    // Handle subscriptions without Stripe customer ID (e.g., gifted)
    if (!billingInfo.stripe_customer_id || billingInfo.subscription_type === 'gifted' || billingInfo.is_trial) {
      console.log('ℹ️ Subscription not managed through Stripe (gifted or trial)');
      toast.info('Your Pro access is ' + (billingInfo.is_trial ? 'a free trial' : 'a gifted subscription') + ' and is not managed through Stripe.');
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
    console.log('📋 Billing info:', billingInfo);

    setLoading(true);

    try {
      // If user has an active subscription, update it to yearly
      if (billingInfo.subscription_status === 'active' && !billingInfo.cancel_at_period_end) {
        console.log('🔄 Updating existing subscription to yearly...');

        const response = await fetch('/api/stripe/upgrade-to-yearly', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId: projectId,
          })
        });

        console.log('📡 Upgrade response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || errorData.error || 'Failed to upgrade to yearly');
        }

        const result = await response.json();
        console.log('✅ Successfully upgraded to yearly:', result);

        toast.success('Successfully upgraded to yearly billing! 🎉');

        // Reload billing info
        await loadBillingInfo();
        return;
      }

      // If no active subscription, create a new yearly checkout
      console.log('🚀 Creating yearly checkout session...');
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billingCycle: 'yearly',
          projectId: projectId,
          successUrl: `${window.location.origin}${returnPath}?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}${returnPath}?cancelled=true`,
        })
      });

      console.log('📡 Yearly checkout response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to create yearly checkout session');
      }

      const { url } = await response.json();
      console.log('✅ Yearly checkout URL received:', url);

      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No yearly checkout URL received');
      }
    } catch (error) {
      console.error('❌ Error upgrading to yearly:', error);
      toast.error('Failed to upgrade to yearly: ' + (error as Error).message);
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
      { name: '5 feedback boards', included: true },
      { name: '1,000 posts', included: true },
      { name: '2 team members', included: true },
      { name: 'Hunter Agent (Reddit + HN)', included: true },
      { name: '10 AI Specs/month', included: true },
      { name: '5 Devil\'s Advocate/month', included: true },
      { name: '50 Ask SignalsLoop queries', included: true },
      { name: 'Jira & Slack integration', included: true },
      { name: '1,000 API calls/month', included: true },
      { name: 'Custom domain', included: true },
      { name: 'Email support (48hr)', included: true }
    ],
    premium: [
      { name: 'Unlimited boards & posts', included: true },
      { name: '10 team members', included: true },
      { name: 'Hunter Agent (4hr scans)', included: true },
      { name: '30 AI Specs/month', included: true },
      { name: '15 Devil\'s Advocate/month', included: true },
      { name: '100 Ask SignalsLoop queries', included: true },
      { name: '4 Executive Briefs/month', included: true },
      { name: '20 Call transcripts/month', included: true },
      { name: 'Full Competitive War Room', included: true },
      { name: 'Linear & Webhooks', included: true },
      { name: '5,000 API calls/month', included: true },
      { name: 'Priority support (24hr)', included: true }
    ]
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // isPaidPlan: Check for pro OR premium
  const isPaidPlan = billingInfo.plan === 'pro' || billingInfo.plan === 'premium';
  const isProPlan = isPaidPlan; // Alias for backward compatibility
  const humanizeStatus = (value: string) =>
    value
      .split('_')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');

  const statusRaw = billingInfo.subscription_status ?? (isProPlan ? (billingInfo.is_trial ? 'trialing' : 'active') : 'free');
  const statusLabel = billingInfo.cancel_at_period_end && isProPlan && statusRaw === 'active'
    ? 'Canceling'
    : humanizeStatus(statusRaw);
  const isCancelling = Boolean(billingInfo.cancel_at_period_end);

  const statusBadgeClassName = isProPlan
    ? isCancelling
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : statusRaw === 'active'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : statusRaw === 'past_due'
          ? 'border-orange-200 bg-orange-50 text-orange-700'
          : statusRaw === 'incomplete'
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-slate-100 text-slate-700'
    : 'border-slate-200 bg-slate-100 text-slate-700';

  const statusSubtitle = (() => {
    if (!isProPlan) {
      return 'Upgrade to Pro to unlock advanced features and analytics.';
    }
    if (billingInfo.is_trial) {
      if (billingInfo.trial_end_date) {
        return `Trial ends ${formatDate(billingInfo.trial_end_date)}.`;
      }
      return 'Enjoy full Pro access during your free trial.';
    }
    if (isCancelling && billingInfo.current_period_end) {
      return `Access continues until ${formatDate(billingInfo.current_period_end)}. You can resume the plan before that date.`;
    }
    if (statusRaw === 'past_due') {
      return 'Payment past due — update your payment method to avoid interruption.';
    }
    if (statusRaw === 'incomplete') {
      return 'Payment incomplete — finish checkout or update your payment method.';
    }
    if (statusRaw === 'canceled') {
      return 'Subscription cancelled — you now have Free plan access.';
    }
    return 'Renews automatically each billing period.';
  })();

  const planSummaryLabel = (() => {
    if (!isPaidPlan) return 'SignalsLoop Free';
    if (billingInfo.plan === 'premium') {
      if (billingInfo.subscription_type === 'gifted') return 'Premium • Gifted';
      if (billingInfo.subscription_type === 'yearly') return 'Premium • Yearly';
      if (billingInfo.subscription_type === 'monthly') return 'Premium • Monthly';
      return 'SignalsLoop Premium';
    }
    if (billingInfo.is_trial) return 'Pro Trial';
    if (billingInfo.subscription_type === 'gifted') return billingInfo.is_yearly ? 'Pro • Gifted Yearly' : 'Pro • Gifted';
    if (billingInfo.subscription_type === 'yearly') return 'Pro • Yearly';
    if (billingInfo.subscription_type === 'monthly') return 'Pro • Monthly';
    return 'SignalsLoop Pro';
  })();

  const nextBillingDescription = (() => {
    if (!isProPlan) {
      return 'Upgrade to Pro to unlock billing and usage insights.';
    }
    if (billingInfo.subscription_type === 'gifted') {
      if (billingInfo.current_period_end) {
        return `Gift access ends ${formatDate(billingInfo.current_period_end)}.`;
      }
      return 'Gifted subscription is currently active.';
    }
    if (isCancelling) {
      if (billingInfo.current_period_end) {
        return `Scheduled to cancel on ${formatDate(billingInfo.current_period_end)}.`;
      }
      return 'Subscription will cancel at the end of the current period.';
    }
    if (billingInfo.current_period_end) {
      return `Renews on ${formatDate(billingInfo.current_period_end)}.`;
    }
    return 'Next billing date is not yet available.';
  })();

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
          variant={isPaidPlan ? 'default' : 'outline'}
          className={cn('text-sm', billingInfo.plan === 'premium' && 'bg-purple-600')}
        >
          {billingInfo.plan === 'premium' ? (
            <>
              <Crown className="h-3 w-3 mr-1" />
              Premium Plan
            </>
          ) : billingInfo.plan === 'pro' ? (
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{planSummaryLabel}</p>
              {billingInfo.plan === 'free' ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Upgrade to Pro to unlock AI features, advanced analytics, and collaboration tools.
                </p>
              ) : null}
              {billingInfo.is_trial && billingInfo.trial_end_date && (
                <p className="mt-2 text-xs text-orange-600">
                  Trial ends {formatDate(billingInfo.trial_end_date)}.
                </p>
              )}
              {billingInfo.subscription_type === 'gifted' && billingInfo.current_period_end && (
                <p className="mt-2 text-xs text-purple-600">
                  Gift access ends {formatDate(billingInfo.current_period_end)}.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
              <Badge variant="outline" className={cn('mt-2 w-fit text-xs font-semibold', statusBadgeClassName)}>
                {statusLabel}
              </Badge>
              {statusSubtitle && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {statusSubtitle}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next billing</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {nextBillingDescription}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">
                {billingInfo.plan === 'premium' ? 'SignalsLoop Premium' : billingInfo.plan === 'pro' ? 'SignalsLoop Pro' : 'SignalsLoop Free'}
              </h3>
              {isPaidPlan ? (
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
                <div className="flex w-full max-w-md gap-1 overflow-hidden rounded-2xl border border-border/60 bg-muted/70 p-1">
                  <button
                    type="button"
                    onClick={() => setSelectedBillingCycle('monthly')}
                    className={cn(
                      'flex-1 rounded-xl border border-transparent px-4 py-3 text-left transition-colors',
                      'flex flex-col gap-1 text-sm',
                      selectedBillingCycle === 'monthly'
                        ? 'border-border bg-background text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span className="font-semibold">Monthly</span>
                    <span className="text-xs text-muted-foreground">$19 billed monthly</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBillingCycle('yearly')}
                    className={cn(
                      'flex-1 rounded-xl border border-transparent px-4 py-3 text-left transition-colors',
                      'flex flex-col gap-1 text-sm',
                      selectedBillingCycle === 'yearly'
                        ? 'border-border bg-background text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      Yearly
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        Save 20%
                      </Badge>
                    </span>
                    <span className="text-xs text-muted-foreground">$180 billed yearly</span>
                  </button>
                </div>
                <Button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  size="lg"
                  className="min-w-[180px]"
                >
                  {upgrading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Starting checkout...
                    </div>
                  ) : (
                    <>
                      <Crown className="h-4 w-4 mr-2" />
                      {upgradeButtonLabel}
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
                  ) : billingInfo.subscription_type === 'gifted' ? (
                    <div className="text-sm text-muted-foreground">
                      🎁 Your {billingInfo.plan === 'premium' ? 'Premium' : 'Pro'} access is a gift! No payment required.
                    </div>
                  ) : (
                    <>
                      {!billingInfo.is_yearly && (
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                {upgrading ? 'Starting upgrade...' : upgradeButtonLabel}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : billingInfo.subscription_type === 'gifted' || billingInfo.is_trial ? (
              <div className="text-center text-sm text-muted-foreground mt-4">
                {billingInfo.is_trial ? '🎉 Enjoying your free trial' : '🎁 Enjoying your gifted Pro access'}
              </div>
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

        {/* Premium Plan Card */}
        <Card className="relative border-purple-300 bg-gradient-to-br from-purple-50/50 to-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-500" />
              Premium Plan
              {billingInfo.plan === 'premium' && (
                <Badge className="bg-purple-100 text-purple-800">Current</Badge>
              )}
            </CardTitle>
            <Badge className="absolute top-4 right-4 bg-purple-600">Team</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold text-purple-600 mb-4">$79<span className="text-sm font-normal text-gray-500">/month</span></div>
            <p className="text-sm text-muted-foreground mb-2">For PM teams (3-10 people)</p>

            <ul className="space-y-2">
              {planFeatures.premium.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-purple-600" />
                  <span>{feature.name}</span>
                </li>
              ))}
            </ul>

            {billingInfo.plan !== 'premium' ? (
              <Button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/stripe/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        billingCycle: 'monthly',
                        plan: 'premium',
                        projectId: projectId,
                        successUrl: `${window.location.origin}${returnPath}?success=true&session_id={CHECKOUT_SESSION_ID}`,
                        cancelUrl: `${window.location.origin}${returnPath}?cancelled=true`,
                      })
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      toast.error(data.error || data.details || 'Failed to create checkout');
                      return;
                    }
                    if (data.url) {
                      window.location.href = data.url;
                    } else {
                      toast.error('No checkout URL received');
                    }
                  } catch (err) {
                    toast.error('Failed to start upgrade: ' + (err as Error).message);
                  }
                }}
                className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
              >
                Upgrade to Premium
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

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {billingInfo.subscription_type === 'gifted' || billingInfo.is_trial
              ? 'Have questions about your Pro access? Contact our support team for assistance.'
              : 'Need to change or review your billing details? The Stripe portal lets you update payment methods, cancel or resume subscriptions, and download invoices.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {billingInfo.subscription_type !== 'gifted' && !billingInfo.is_trial && isPaidPlan && (
              <Button onClick={handleManageBilling} size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Billing Portal
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <a href="mailto:hello@signalsloop.com?subject=Billing%20support" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Contact Support
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="https://signalsloop.com/help/billing" target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Billing FAQ
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div >
  );
}
