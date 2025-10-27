"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSupabaseClient } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, CreditCard, LogOut, X, Crown } from 'lucide-react';
import { toast } from 'sonner';

export default function GlobalBanner({ 
  projectSlug,
  showBilling = true,
  showBackButton = false,
  backUrl = "/app",
  backLabel = "Back"
}: { 
  projectSlug?: string;
  showBilling?: boolean;
  showBackButton?: boolean;
  backUrl?: string;
  backLabel?: string;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingInfo, setBillingInfo] = useState<{
    plan: 'free' | 'pro';
    subscription_status: string | null;
    subscription_id?: string | null;
    stripe_customer_id: string | null;
    trial_start_date: string | null;
    trial_end_date: string | null;
    trial_status: string | null;
    is_trial: boolean;
    trial_cancelled_at: string | null;
  } | null>(null);
  const [primaryProject, setPrimaryProject] = useState<{
    id: string;
    slug: string | null;
    plan: string;
    stripe_customer_id: string | null;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();
    
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && showBilling) {
      loadBillingInfo();
    }
  }, [user, showBilling]);

  const loadBillingInfo = async () => {
    if (!user) return;

    try {
      const supabase = getSupabaseClient();

      const [{ data: accountProfile }, { data: projects }] = await Promise.all([
        supabase
          .from('account_billing_profiles')
          .select(
            'plan, subscription_status, stripe_customer_id, trial_start_date, trial_end_date, trial_status, is_trial, trial_cancelled_at, subscription_id'
          )
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('projects')
          .select('id, slug, plan, stripe_customer_id, subscription_status, trial_start_date, trial_end_date, trial_status, is_trial, trial_cancelled_at, subscription_id')
          .eq('owner_id', user.id),
      ]);

      const selectedProject = projects?.length
        ? projectSlug
          ? projects.find((p) => p.slug === projectSlug) || projects[0]
          : projects[0]
        : null;

      if (selectedProject) {
        setPrimaryProject({
          id: selectedProject.id,
          slug: selectedProject.slug,
          plan: selectedProject.plan,
          stripe_customer_id: selectedProject.stripe_customer_id,
        });
      }

      const plan = (accountProfile?.plan as 'free' | 'pro') ?? (selectedProject?.plan === 'pro' ? 'pro' : 'free');
      const stripeCustomerId = accountProfile?.stripe_customer_id ?? selectedProject?.stripe_customer_id ?? null;

      setBillingInfo({
        plan,
        subscription_status: accountProfile?.subscription_status ?? selectedProject?.subscription_status ?? null,
        subscription_id: accountProfile?.subscription_id ?? selectedProject?.subscription_id ?? null,
        stripe_customer_id: stripeCustomerId,
        trial_start_date: accountProfile?.trial_start_date ?? selectedProject?.trial_start_date ?? null,
        trial_end_date: accountProfile?.trial_end_date ?? selectedProject?.trial_end_date ?? null,
        trial_status: accountProfile?.trial_status ?? selectedProject?.trial_status ?? null,
        is_trial: accountProfile?.is_trial ?? selectedProject?.is_trial ?? false,
        trial_cancelled_at: accountProfile?.trial_cancelled_at ?? selectedProject?.trial_cancelled_at ?? null,
      });
    } catch (error) {
      console.error('Error loading billing info:', error);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleManageBilling = async () => {
    try {
      if (!billingInfo) {
        toast.error('Billing information not available. Please refresh the page.');
        return;
      }

      if (billingInfo.plan !== 'pro') {
        toast.info('You need to upgrade to Pro first to access billing management.');
        return;
      }

      // Handle subscriptions without Stripe customer ID (e.g., gifted)
      if (!billingInfo.stripe_customer_id) {
        toast.info('Your Pro subscription is not managed through Stripe. Contact support for assistance.');
        return;
      }

      // Create Stripe Customer Portal session
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: billingInfo.stripe_customer_id,
          returnUrl: window.location.href,
          accountId: user?.id ?? undefined,
          projectId: primaryProject?.id ?? null,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast.error('Failed to open billing portal. Please try again.');
    }
  };

  const handleCancelTrial = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/trial/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: user.id,
          projectId: primaryProject?.id ?? null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to cancel trial');
      }

      toast.success('Trial cancelled successfully. You have been switched to the Free plan.');
      loadBillingInfo();
    } catch (error) {
      console.error('Error cancelling trial:', error);
      toast.error('Failed to cancel trial. Please try again.');
    }
  };


  if (loading) {
    return (
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 safe-top">
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-base sm:text-xl font-bold text-gray-900 hidden sm:block">SignalsLoop</span>
            </div>
            <div className="flex items-center">
              <div className="h-9 w-9 flex items-center justify-center">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 safe-top">
      <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          {/* Left side - Logo and branding */}
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(backUrl)}
                className="min-touch-target tap-highlight-transparent px-2 sm:px-3 flex-shrink-0"
              >
                <span aria-hidden="true" className="mr-1 text-base">←</span>
                <span className="text-sm font-medium sm:hidden">Back</span>
                <span className="hidden sm:inline">{backLabel}</span>
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-base sm:text-xl font-bold text-gray-900 hidden sm:block">SignalsLoop</span>
              {projectSlug && (
                <Badge variant="outline" className="hidden lg:inline-flex text-xs">
                  {projectSlug}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-2">
            {user ? (
              <>
                {showBilling && billingInfo && (
                  <>
                    <Badge 
                      variant={billingInfo.plan === 'pro' ? 'default' : 'secondary'}
                      className={`text-xs ${billingInfo.plan === 'pro' ? 'bg-blue-600' : ''}`}
                    >
                      {billingInfo.is_trial ? 'Pro (Trial)' : `${billingInfo.plan.charAt(0).toUpperCase() + billingInfo.plan.slice(1)}`}
                    </Badge>
                    
                    {billingInfo.is_trial ? (
                      <Button
                        onClick={handleCancelTrial}
                        variant="outline"
                        size="sm"
                      >
                        Cancel Trial
                      </Button>
                    ) : billingInfo.plan === 'pro' && billingInfo.stripe_customer_id ? (
                      <Button
                        onClick={handleManageBilling}
                        variant="outline"
                        size="sm"
                      >
                        Manage Billing
                      </Button>
                    ) : billingInfo.plan === 'pro' && !billingInfo.stripe_customer_id ? (
                      <Button
                        onClick={() => router.push('/app/billing')}
                        variant="outline"
                        size="sm"
                      >
                        View Billing
                      </Button>
                    ) : billingInfo.plan === 'free' ? (
                      <Button
                        onClick={() => router.push('/app/billing')}
                        variant="default"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Upgrade to Pro
                      </Button>
                    ) : null}
                  </>
                )}
                
                <Button 
                  onClick={handleSignOut} 
                  variant="ghost" 
                  size="sm"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => router.push('/login')} 
                variant="ghost" 
                size="sm"
              >
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Menu Dropdown */}
          <div className="sm:hidden">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-9 w-9 p-0"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {showBilling && billingInfo && (
                    <>
                      <div className="px-2 py-1.5">
                        <Badge 
                          variant={billingInfo.plan === 'pro' ? 'default' : 'secondary'}
                          className={`text-xs w-full justify-center ${billingInfo.plan === 'pro' ? 'bg-blue-600' : ''}`}
                        >
                          {billingInfo.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
                        </Badge>
                      </div>
                      <DropdownMenuSeparator />
                      {billingInfo.is_trial ? (
                        <DropdownMenuItem onClick={handleCancelTrial}>
                          <X className="mr-2 h-4 w-4" />
                          Cancel Trial
                        </DropdownMenuItem>
                      ) : billingInfo.plan === 'pro' && billingInfo.stripe_customer_id ? (
                        <DropdownMenuItem onClick={handleManageBilling}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Manage Billing
                        </DropdownMenuItem>
                      ) : billingInfo.plan === 'pro' && !billingInfo.stripe_customer_id ? (
                        <DropdownMenuItem onClick={() => router.push('/app/billing')}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          View Billing
                        </DropdownMenuItem>
                      ) : billingInfo.plan === 'free' ? (
                        <DropdownMenuItem onClick={() => router.push('/app/billing')}>
                          <Crown className="mr-2 h-4 w-4" />
                          Upgrade to Pro
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={() => router.push('/login')} 
                variant="ghost" 
                size="sm"
                className="text-sm"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
