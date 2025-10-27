'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BillingDashboard } from '@/components/BillingDashboard';
import GlobalBanner from '@/components/GlobalBanner';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/lib/supabase-client';

interface User {
  id: string;
  email: string;
}

interface StripeSettings {
  configured: boolean;
  payment_method: string;
  stripe_price_id: string;
}

export default function BillingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [stripeSettings, setStripeSettings] = useState<StripeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const finalizeRef = useRef(false);

  const loadUserAndSettings = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Database connection not available or project slug missing. Please refresh the page.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      setUser(user);

      if (process.env.NODE_ENV === 'development') {
        console.debug('stripe_settings table not found, using default configuration');
      }
      setStripeSettings({ configured: true, payment_method: 'checkout_link', stripe_price_id: '' });

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user data.';
      console.error('Error loading user:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadUserAndSettings();
  }, [loadUserAndSettings]);

  useEffect(() => {
    const success = searchParams.get('success');
    const sessionId = searchParams.get('session_id');

    if (finalizeRef.current) return;
    if (success === 'true' && sessionId) {
      finalizeRef.current = true;

      const finalize = async () => {
        try {
          const response = await fetch('/api/stripe/checkout/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId }),
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to finalize checkout');
          }

          toast.success('Subscription activated!');
        } catch (checkoutError) {
          console.error('Finalize checkout error:', checkoutError);
          toast.error(
            checkoutError instanceof Error
              ? checkoutError.message
              : 'Failed to finalize checkout session.'
          );
        } finally {
          const params = new URLSearchParams(searchParams.toString());
          params.delete('success');
          params.delete('session_id');
          const queryString = params.toString();
          router.replace(`/app/billing${queryString ? `?${queryString}` : ''}`);
        }
      };

      finalize();
    }
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <GlobalBanner showBackButton={true} backUrl="/app" backLabel="Back to Dashboard" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading billing information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <GlobalBanner showBackButton={true} backUrl="/app" backLabel="Back to Dashboard" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-gray-700 mb-6">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-lg"
            >
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <GlobalBanner showBackButton={true} backUrl="/app" backLabel="Back to Dashboard" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-700 mb-6">Please log in to access your billing information.</p>
            <Button 
              onClick={() => router.push('/login')} 
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-lg"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <GlobalBanner showBackButton={true} backUrl="/app" backLabel="Back to Dashboard" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-8 mb-6 transform transition-all duration-300 hover:shadow-xl animate-bounce-in">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <h1 className="text-4xl font-bold animate-fade-in">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Account Billing
                  </span>
                </h1>
              </div>
              <p className="text-gray-600 text-lg animate-fade-in-delay max-w-2xl mx-auto">
                Manage your SignalsLoop subscription, billing details, and upgrade your plan to unlock powerful AI features
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-8 transform transition-all duration-300 hover:shadow-xl">
          <BillingDashboard 
            projectId={user.id}
            stripeSettings={stripeSettings}
          />
        </div>
      </main>
    </div>
  );
}
