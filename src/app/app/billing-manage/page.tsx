'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';

export default function BillingManagePage() {
  const router = useRouter();

  useEffect(() => {
    redirectToStripePortal();
  }, []);

  const redirectToStripePortal = async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/login');
        return;
      }

      // Get user's primary project with Pro plan
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('stripe_customer_id, plan')
        .eq('owner_id', user.id)
        .eq('plan', 'pro')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (projectError) {
        console.error('Error fetching project for billing portal:', projectError);
        toast.error('Failed to load billing information');
        router.push('/app/billing');
        return;
      }

      if (!project) {
        toast.info('No active Pro subscription to manage.');
        router.push('/app/billing');
        return;
      }

      if (!project.stripe_customer_id) {
        toast.error('Unable to access billing portal. Please contact support.');
        router.push('/app/billing');
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
          returnUrl: `${window.location.origin}/app/billing`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      // Redirect to Stripe Customer Portal
      window.location.href = url;
    } catch (error) {
      console.error('Error redirecting to billing portal:', error);
      toast.error('Failed to open billing portal. Please try again.');
      router.push('/app/billing');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to billing portal...</p>
      </div>
    </div>
  );
}
