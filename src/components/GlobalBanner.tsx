"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { Menu, CreditCard, LogOut, X, Crown, User as UserIcon, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from './theme-toggle';
import { Avatar, AvatarFallback } from './ui/avatar';

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
    plan: 'free' | 'pro' | 'premium';
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
      const baseUrl = `/api/billing/account?accountId=${user.id}`;
      const accountUrl = projectSlug ? `${baseUrl}&projectSlug=${projectSlug}` : baseUrl;

      const response = await fetch(accountUrl);
      if (!response.ok) {
        throw new Error('Failed to load billing info');
      }

      const data = await response.json();
      if (data.primaryProject) {
        setPrimaryProject(data.primaryProject);
      }

      setBillingInfo(data.billingInfo);
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
    if (!billingInfo) {
      toast.error('Billing information not available. Please refresh the page.');
      return;
    }

    // Allow billing access for pro OR premium plans
    if (billingInfo.plan !== 'pro' && billingInfo.plan !== 'premium') {
      toast.info('You need to upgrade to Pro first to access billing management.');
      return;
    }

    // Route to internal billing dashboard first; customers can access the Stripe portal from there.
    router.push('/app/billing');
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
      <header style={{ backgroundColor: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.1)' }} className="sticky top-0 z-50 safe-top">
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <Link href="/app" className="flex items-center gap-2">
              <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-8 h-8 rounded-lg shadow-sm" />
              <span className="text-base sm:text-xl font-bold text-white hidden sm:block">SignalsLoop</span>
            </Link>
            <div className="flex items-center">
              <div className="h-9 w-9 flex items-center justify-center">
                <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-teal-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header style={{ backgroundColor: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.1)' }} className="sticky top-0 z-50 safe-top">
      <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          {/* Left side - Logo and branding */}
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(backUrl)}
                className="min-touch-target tap-highlight-transparent px-2 sm:px-3 flex-shrink-0 text-white hover:text-white hover:bg-white/10"
              >
                <span aria-hidden="true" className="mr-1 text-base">←</span>
                <span className="text-sm font-medium sm:hidden">Back</span>
                <span className="hidden sm:inline">{backLabel}</span>
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Link href="/app" className="flex items-center gap-2">
                <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-8 h-8 rounded-lg shadow-sm flex-shrink-0" />
                <span className="text-base sm:text-xl font-bold text-white hidden sm:block">SignalsLoop</span>
              </Link>
              {projectSlug && (
                <Badge variant="outline" className="hidden lg:inline-flex text-xs text-white/80 border-white/30">
                  {projectSlug}
                </Badge>
              )}
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 h-9 px-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-medium">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {showBilling && billingInfo && (
                      <Badge
                        variant={(billingInfo.plan === 'pro' || billingInfo.plan === 'premium') ? 'default' : 'secondary'}
                        className={`text-xs ${billingInfo.plan === 'premium' ? 'bg-purple-600' : billingInfo.plan === 'pro' ? 'bg-teal-600' : ''}`}
                      >
                        {billingInfo.is_trial ? 'Trial' : billingInfo.plan.charAt(0).toUpperCase() + billingInfo.plan.slice(1)}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">
                    {user.email}
                  </div>
                  <DropdownMenuSeparator />
                  {showBilling && billingInfo && (
                    <>
                      {billingInfo.is_trial ? (
                        <DropdownMenuItem onClick={handleCancelTrial}>
                          <X className="mr-2 h-4 w-4" />
                          Cancel Trial
                        </DropdownMenuItem>
                      ) : (billingInfo.plan === 'pro' || billingInfo.plan === 'premium') && billingInfo.stripe_customer_id ? (
                        <DropdownMenuItem onClick={handleManageBilling}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Manage Billing
                        </DropdownMenuItem>
                      ) : (billingInfo.plan === 'pro' || billingInfo.plan === 'premium') && !billingInfo.stripe_customer_id ? (
                        <DropdownMenuItem onClick={() => router.push('/app/billing')}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          View Billing
                        </DropdownMenuItem>
                      ) : billingInfo.plan === 'free' ? (
                        <DropdownMenuItem onClick={() => router.push('/app/billing')} className="text-teal-600 dark:text-teal-400">
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
              >
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Menu Dropdown */}
          <div className="sm:hidden flex items-center gap-1">
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-medium">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {showBilling && billingInfo && (
                    <>
                      <div className="px-2 py-1.5">
                        <Badge
                          variant={(billingInfo.plan === 'pro' || billingInfo.plan === 'premium') ? 'default' : 'secondary'}
                          className={`text-xs w-full justify-center ${billingInfo.plan === 'premium' ? 'bg-purple-600' : billingInfo.plan === 'pro' ? 'bg-teal-600' : ''}`}
                        >
                          {billingInfo.plan === 'premium' ? 'Premium Plan' : billingInfo.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
                        </Badge>
                      </div>
                      <DropdownMenuSeparator />
                      {billingInfo.is_trial ? (
                        <DropdownMenuItem onClick={handleCancelTrial}>
                          <X className="mr-2 h-4 w-4" />
                          Cancel Trial
                        </DropdownMenuItem>
                      ) : (billingInfo.plan === 'pro' || billingInfo.plan === 'premium') && billingInfo.stripe_customer_id ? (
                        <DropdownMenuItem onClick={handleManageBilling}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Manage Billing
                        </DropdownMenuItem>
                      ) : (billingInfo.plan === 'pro' || billingInfo.plan === 'premium') && !billingInfo.stripe_customer_id ? (
                        <DropdownMenuItem onClick={() => router.push('/app/billing')}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          View Billing
                        </DropdownMenuItem>
                      ) : billingInfo.plan === 'free' ? (
                        <DropdownMenuItem onClick={() => router.push('/app/billing')} className="text-teal-600 dark:text-teal-400">
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
