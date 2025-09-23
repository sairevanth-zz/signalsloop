"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSupabaseClient } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';

export default function GlobalBanner({ 
  projectSlug,
  showBilling = true 
}: { 
  projectSlug?: string;
  showBilling?: boolean;
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
    if (!billingInfo?.customer_id) return;

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: billingInfo.customer_id }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
    }
  };

  const handleCancelTrial = async () => {
    if (!projectSlug) return;

    try {
      const response = await fetch('/api/trial/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projectSlug }),
      });

      if (response.ok) {
        // Reload billing info
        loadBillingInfo();
      }
    } catch (error) {
      console.error('Error canceling trial:', error);
    }
  };

  if (loading) {
    return (
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">SignalsLoop</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-500">Loading...</span>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900">SignalsLoop</span>
            {projectSlug && (
              <Badge variant="outline" className="ml-2">
                {projectSlug}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {showBilling && billingInfo && (
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={billingInfo.plan === 'pro' ? 'default' : 'secondary'}
                      className={billingInfo.plan === 'pro' ? 'bg-blue-600' : ''}
                    >
                      {billingInfo.is_trial ? 'Pro Plan (Trial)' : `${billingInfo.plan.charAt(0).toUpperCase() + billingInfo.plan.slice(1)} Plan`}
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
                      <>
                        <Button 
                          onClick={handleManageBilling}
                          variant="outline" 
                          size="sm"
                        >
                          Manage Billing
                        </Button>
                        {billingInfo.plan === 'pro' && (
                          <Button 
                            onClick={handleCancelTrial}
                            variant="outline" 
                            size="sm"
                          >
                            Cancel Subscription
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
                <Button onClick={handleSignOut} variant="ghost" size="sm">
                  Sign Out
                </Button>
              </>
            ) : (
              <Button onClick={() => router.push('/login')} variant="ghost" size="sm">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}