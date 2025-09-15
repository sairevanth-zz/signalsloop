'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { WidgetTesting } from '@/components/WidgetTesting';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Project {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro';
}

interface ApiKey {
  id: string;
  name: string;
  key_hash: string;
  created_at: string;
  usage_count: number;
}

export default function WidgetTestingPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabase, setSupabase] = useState<any>(null);
  
  const params = useParams();
  const router = useRouter();
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

  useEffect(() => {
    if (supabase && projectSlug) {
      loadProjectAndApiKeys();
    }
  }, [supabase, projectSlug]);

  const loadProjectAndApiKeys = async () => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', projectSlug)
        .single();

      if (projectError || !projectData) {
        toast.error('Project not found');
        router.push('/');
        return;
      }

      setProject(projectData);

      // Get API keys
      const { data: apiKeysData, error: apiKeysError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('project_id', projectData.id)
        .order('created_at', { ascending: false });

      if (apiKeysError) {
        console.error('Error loading API keys:', apiKeysError);
        toast.error('Failed to load API keys');
      } else {
        setApiKeys(apiKeysData || []);
        if (apiKeysData && apiKeysData.length > 0) {
          // Use the first API key as default, but decode it for display
          setSelectedApiKey(atob(apiKeysData[0].key_hash));
        }
      }

    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Something went wrong');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSettings = () => {
    router.push(`/${projectSlug}/settings`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
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
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h2>
            <p className="text-gray-600">The project you&apos;re looking for doesn&apos;t exist.</p>
          </div>
        </div>
      </div>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Button variant="outline" onClick={handleBackToSettings} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
          </div>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No API Keys Found</h2>
            <p className="text-gray-600 mb-4">
              You need to create an API key before you can test your widget.
            </p>
            <Button onClick={handleBackToSettings}>
              Go to API Keys Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="outline" onClick={handleBackToSettings} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Widget Testing</h1>
            <p className="text-gray-600 mt-1">
              Test and preview your widget for {project.name}
            </p>
          </div>
        </div>

        {/* API Key Selection */}
        <div className="mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-medium mb-2">Select API Key for Testing</h3>
            <select 
              className="w-full p-2 border border-input rounded-md bg-background"
              value={selectedApiKey}
              onChange={(e) => setSelectedApiKey(e.target.value)}
            >
              {apiKeys.map((key) => (
                <option key={key.id} value={atob(key.key_hash)}>
                  {key.name} (sk_...{atob(key.key_hash).slice(-8)})
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-600 mt-2">
              Choose which API key to use for testing your widget integration.
            </p>
          </div>
        </div>

        {/* Widget Testing Component */}
        {selectedApiKey && (
          <WidgetTesting 
            projectSlug={project.slug} 
            apiKey={selectedApiKey} 
          />
        )}
      </div>
    </div>
  );
}
