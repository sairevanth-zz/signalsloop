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
import { Menu, CreditCard, LogOut, X } from 'lucide-react';
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
  const [billingInfo, setBillingInfo] = useState<any>(null);
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
      
      // Get user's projects
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id);

      if (error) {
        console.error('Error fetching projects:', error);
        return;
      }

      if (projects && projects.length > 0) {
        const project = projectSlug 
          ? projects.find(p => p.slug === projectSlug) || projects[0]
          : projects[0];

        setBillingInfo({
          plan: project.plan,
          subscription_status: project.subscription_status,
          subscription_id: project.subscription_id,
          customer_id: project.customer_id,
          trial_start_date: project.trial_start_date,
          trial_end_date: project.trial_end_date,
          trial_status: project.trial_status,
          is_trial: project.is_trial,
          trial_cancelled_at: project.trial_cancelled_at
        });
      }
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
      const supabase = getSupabaseClient();

      // Get the project to find stripe_customer_id
      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('id, slug, stripe_customer_id, plan')
        .eq('owner_id', user?.id);

      if (projectError) {
        console.error('Project query error:', projectError);
        toast.error('Failed to load project information');
        return;
      }

      if (!projects || projects.length === 0) {
        toast.error('No project found');
        return;
      }

      const project = projectSlug
        ? projects.find(p => p.slug === projectSlug) || projects[0]
        : projects[0];

      console.log('Selected project:', project);

      if (project.plan !== 'pro') {
        toast.info('You need to upgrade to Pro first to access billing management.');
        return;
      }

      // Handle subscriptions without Stripe customer ID (e.g., gifted)
      if (!project.stripe_customer_id) {
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
          customerId: project.stripe_customer_id,
          returnUrl: window.location.href
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
    try {
      const supabase = getSupabaseClient();
      
      // Get the project
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user?.id);

      if (projects && projects.length > 0) {
        const project = projectSlug 
          ? projects.find(p => p.slug === projectSlug) || projects[0]
          : projects[0];

        // Update project to cancel trial
        const { error } = await supabase
          .from('projects')
          .update({
            trial_status: 'cancelled',
            trial_cancelled_at: new Date().toISOString(),
            plan: 'free'
          })
          .eq('id', project.id);

        if (error) {
          console.error('Error cancelling trial:', error);
          alert('Failed to cancel trial. Please try again.');
        } else {
          alert('Trial cancelled successfully. You have been switched to the Free plan.');
          // Reload billing info
          loadBillingInfo();
        }
      }
    } catch (error) {
      console.error('Error cancelling trial:', error);
      alert('Failed to cancel trial. Please try again.');
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
                    ) : (
                      <Button 
                        onClick={handleManageBilling}
                        variant="outline" 
                        size="sm"
                      >
                        Manage Billing
                      </Button>
                    )}
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
                      ) : (
                        <DropdownMenuItem onClick={handleManageBilling}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Manage Billing
                        </DropdownMenuItem>
                      )}
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
