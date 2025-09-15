'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChangelogSystem } from '@/components/ChangelogSystem';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro';
}

export default function ChangelogPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabase, setSupabase] = useState<any>(null);
  
  const params = useParams();
  const projectSlug = params.slug as string;

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

  const loadProject = useCallback(async () => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', projectSlug)
        .single();

      if (projectError || !projectData) {
        toast.error('Project not found');
        return;
      }

      setProject(projectData);

      // Check if user is admin (simplified check - in real app, use proper auth)
      // For now, we'll assume admin access if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      setIsAdmin(!!user);

    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [supabase, projectSlug]);

  useEffect(() => {
    if (supabase && projectSlug) {
      loadProject();
    }
  }, [supabase, projectSlug, loadProject]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-6">
              {[1,2,3].map(i => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h2>
            <p className="text-gray-600">The project you&apos;re looking for doesn&apos;t exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ChangelogSystem 
          projectId={project.id}
          projectSlug={project.slug}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
