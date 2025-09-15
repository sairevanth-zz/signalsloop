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

      // Load Stripe settings
      const { data: stripeData, error: stripeError } = await supabase
        .from('stripe_settings')
        .select('configured, payment_method, stripe_price_id')
        .eq('project_id', projectData.id)
        .single();

      if (stripeError && stripeError.code !== 'PGRST116') {
        console.error('Error loading Stripe settings:', stripeError);
      }

      setStripeSettings(stripeData || { configured: false, payment_method: 'checkout_link', stripe_price_id: '' });

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-gray-700">Loading billing information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h2>
          <p className="text-gray-700">The project you are looking for does not exist or you do not have access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <BillingDashboard 
        projectId={project.id} 
        projectSlug={project.slug}
        stripeSettings={stripeSettings}
      />
    </div>
  );
}
