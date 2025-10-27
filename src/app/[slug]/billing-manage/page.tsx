'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';

export default function ProjectBillingManagePage() {
  const router = useRouter();
  const params = useParams();
  const projectSlug = params?.slug as string;

  useEffect(() => {
    if (projectSlug) {
      redirectToStripePortal();
    }
  }, [projectSlug]);

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

      const [{ data: project }, { data: profile }] = await Promise.all([
        supabase
          .from('projects')
          .select('id, slug, stripe_customer_id, plan')
          .eq('slug', projectSlug)
          .eq('owner_id', user.id)
          .maybeSingle(),
        supabase
          .from('account_billing_profiles')
          .select('plan, stripe_customer_id')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (!project) {
        toast.error('Project not found.');
        router.push('/app');
        return;
      }

      if (!profile || profile.plan !== 'pro') {
        toast.info('No active Pro subscription to manage.');
        router.push(`/${projectSlug}/settings`);
        return;
      }

      const customerId = profile.stripe_customer_id ?? project.stripe_customer_id;

      if (!customerId) {
        toast.error('Unable to access billing portal. Please contact support.');
        router.push(`/${projectSlug}/settings`);
        return;
      }

      // Create Stripe Customer Portal session
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          accountId: user.id,
          projectId: project.id,
          returnUrl: `${window.location.origin}/${projectSlug}/settings`
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
      router.push(`/${projectSlug}/settings`);
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
