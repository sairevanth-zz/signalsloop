'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BillingDashboard } from '@/components/BillingDashboard';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro';
}

interface StripeSettings {
  configured: boolean;
  payment_method: string;
  stripe_price_id: string;
}

export default function BillingPage() {
  const params = useParams();
  const projectSlug = params.slug as string;

  const [project, setProject] = useState<Project | null>(null);
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

  const loadProjectAndSettings = useCallback(async () => {
    if (!supabase || !projectSlug) {
      setError('Database connection not available or project slug missing. Please refresh the page.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load project data
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, slug, plan')
        .eq('slug', projectSlug)
        .single();

      if (projectError || !projectData) {
        throw new Error(projectError?.message || 'Project not found');
      }

      setProject(projectData);

      // Stripe settings - using default configuration since stripe_settings table doesn't exist
      console.log('⚠️ stripe_settings table not found, using default configuration');
      setStripeSettings({ configured: true, payment_method: 'checkout_link', stripe_price_id: '' });

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load project data.';
      console.error('Error loading project:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [supabase, projectSlug]);

  useEffect(() => {
    if (supabase && projectSlug) {
      loadProjectAndSettings();
    }
  }, [supabase, projectSlug, loadProjectAndSettings]);

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
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-lg"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h2>
          <p className="text-gray-700">The project you are looking for does not exist or you do not have access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="py-8 px-4">
        <BillingDashboard 
          projectId={project.id} 
          projectSlug={project.slug}
          stripeSettings={stripeSettings}
        />
      </div>
    </div>
  );
}
