'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BillingDashboard } from '@/components/BillingDashboard';
import GlobalBanner from '@/components/GlobalBanner';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  email: string;
}

interface StripeSettings {
  configured: boolean;
  payment_method: string;
  stripe_price_id: string;
}

export default function AccountBillingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stripeSettings, setStripeSettings] = useState<StripeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabase, setSupabase] = useState<any>(null);

  // Initialize Supabase client safely
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      setSupabase(client);
    }
  }, []);

  const loadUserAndSettings = useCallback(async () => {
    if (!supabase) {
      setError('Database connection not available or project slug missing. Please refresh the page.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      setUser(user);

      // For account-level billing, we'll use a default project or the user's primary project
      // For now, we'll create a mock project ID based on user ID
      const accountProjectId = user.id; // Using user ID as account identifier

      // Load Stripe settings for the account
      const { data: stripeData, error: stripeError } = await supabase
        .from('stripe_settings')
        .select('configured, payment_method, stripe_price_id')
        .eq('project_id', accountProjectId)
        .single();

      if (stripeError && stripeError.code !== 'PGRST116') {
        console.error('Error loading Stripe settings:', stripeError);
      }

      setStripeSettings(stripeData || { configured: false, payment_method: 'checkout_link', stripe_price_id: '' });

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user data.';
      console.error('Error loading user:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (supabase) {
      loadUserAndSettings();
    }
  }, [supabase, loadUserAndSettings]);

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
      {/* Global Banner */}
      <GlobalBanner showBackButton={true} backUrl="/app" backLabel="Back to Dashboard" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
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

        {/* Billing Dashboard */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-8 transform transition-all duration-300 hover:shadow-xl">
          <BillingDashboard 
            projectId={user.id} // Using user ID as account identifier
            projectSlug="account" // Account-level billing
            stripeSettings={stripeSettings}
          />
        </div>
      </main>
    </div>
  );
}
