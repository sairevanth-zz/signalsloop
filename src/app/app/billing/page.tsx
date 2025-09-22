'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BillingDashboard } from '@/components/BillingDashboard';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-lg"
          >
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-700">Please log in to access your billing information.</p>
          <Button 
            onClick={() => router.push('/login')} 
            className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-lg"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/app')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Account Billing</h1>
                <p className="text-gray-600">Manage your SignalsLoop subscription and billing details</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <BillingDashboard 
            projectId={user.id} // Using user ID as account identifier
            projectSlug="account" // Account-level billing
            stripeSettings={stripeSettings}
          />
        </div>
      </div>
    </div>
  );
}
