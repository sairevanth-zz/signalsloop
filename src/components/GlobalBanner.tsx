"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSupabaseClient } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';

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

  const handleManageBilling = () => {
    // Redirect to our custom billing management page
    const billingUrl = projectSlug === 'account' || !projectSlug
      ? '/app/billing-manage'
      : `/${projectSlug}/billing-manage`;
    
    router.push(billingUrl);
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
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs sm:text-sm">S</span>
              </div>
              <span className="text-sm sm:text-lg font-bold text-gray-900 hidden sm:block">SignalsLoop</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-[10px] sm:text-xs">...</span>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 safe-top">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="flex items-center justify-between gap-1">
          {/* Left side - Logo and branding */}
          <div className="flex items-center gap-1.5 min-w-0 flex-shrink overflow-hidden">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(backUrl)}
                className="hidden sm:flex min-touch-target tap-highlight-transparent text-xs px-2"
              >
                ← {backLabel}
              </Button>
            )}
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs sm:text-sm">S</span>
              </div>
              <span className="text-sm sm:text-lg font-bold text-gray-900 truncate hidden sm:block">SignalsLoop</span>
              {projectSlug && (
                <Badge variant="outline" className="hidden lg:inline-flex text-[10px] px-1.5 py-0">
                  {projectSlug}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Right side - Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {user ? (
              <>
                {showBilling && billingInfo && (
                  <>
                    {/* Plan Badge - Very compact */}
                    <Badge 
                      variant={billingInfo.plan === 'pro' ? 'default' : 'secondary'}
                      className={`text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 ${billingInfo.plan === 'pro' ? 'bg-blue-600' : ''}`}
                    >
                      {billingInfo.plan === 'pro' ? 'Pro' : 'Free'}
                    </Badge>
                    
                    {/* Billing Button - Icon on smallest screens */}
                    {!billingInfo.is_trial && (
                      <Button 
                        onClick={handleManageBilling}
                        variant="outline" 
                        size="sm"
                        className="tap-highlight-transparent text-[10px] sm:text-xs whitespace-nowrap px-1.5 sm:px-2 h-7 sm:h-8"
                      >
                        <span className="hidden sm:inline">Bill</span>
                        <span className="sm:hidden">💳</span>
                      </Button>
                    )}
                  </>
                )}
                
                {/* Sign Out Button - Very compact */}
                <Button 
                  onClick={handleSignOut} 
                  variant="ghost" 
                  size="sm"
                  className="tap-highlight-transparent text-[10px] sm:text-xs whitespace-nowrap px-1.5 sm:px-2 h-7 sm:h-8"
                >
                  <span className="hidden sm:inline">Out</span>
                  <span className="sm:hidden">👋</span>
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => router.push('/login')} 
                variant="ghost" 
                size="sm"
                className="tap-highlight-transparent text-xs px-2"
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