'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase-client';
import { ThemeDetailPage } from '@/components/themes/ThemeDetailPage';
import GlobalBanner from '@/components/GlobalBanner';

export default function ThemePage() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const projectSlug = params?.slug as string;
  const themeId = params?.themeId as string;
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (user && supabase && projectSlug) {
      loadProject();
    }
  }, [user, supabase, projectSlug]);

  const loadProject = async () => {
    if (!supabase) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, slug, name')
        .eq('slug', projectSlug)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Project not found</p>
      </div>
    );
  }

  return (
    <>
      <GlobalBanner />
      <ThemeDetailPage themeId={themeId} projectId={project.id} projectSlug={projectSlug} />
    </>
  );
}
