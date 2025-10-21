'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import PublicChangelog from '@/components/PublicChangelog';

function CustomDomainChangelogContent() {
  const searchParams = useSearchParams();
  const domain = searchParams.get('domain');
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!domain) {
      setError('No domain specified');
      setLoading(false);
      return;
    }

    const loadChangelog = async () => {
      try {
        // Resolve custom domain to project slug
        const domainResponse = await fetch('/api/custom-domain/resolve', {
          headers: {
            'host': domain
          }
        });

        if (!domainResponse.ok) {
          throw new Error('Failed to resolve domain');
        }

        const domainData = await domainResponse.json();

        if (!domainData.isCustomDomain || !domainData.project) {
          setError('Domain not found or not verified');
          setLoading(false);
          return;
        }

        const slug = domainData.project.slug;
        setProjectSlug(slug);

        // Fetch project and changelog data
        const supabase = getSupabaseClient();

        // Get project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name, description, slug')
          .eq('slug', slug)
          .single();

        if (projectError || !projectData) {
          setError('Project not found');
          setLoading(false);
          return;
        }

        setProject(projectData);

        // Get published changelog releases
        const { data: releasesData, error: releasesError } = await supabase
          .from('changelog_releases')
          .select(`
            *,
            changelog_entries (
              id,
              title,
              description,
              entry_type,
              priority,
              icon,
              color,
              order_index
            ),
            changelog_media (
              id,
              file_url,
              file_type,
              alt_text,
              caption,
              display_order,
              is_video,
              video_thumbnail_url
            )
          `)
          .eq('project_id', projectData.id)
          .eq('is_published', true)
          .order('published_at', { ascending: false });

        if (releasesError) {
          console.error('Error fetching releases:', releasesError);
          setError('Failed to load changelog');
        } else {
          setReleases(releasesData || []);
        }
      } catch (err) {
        console.error('Error loading changelog:', err);
        setError('Failed to load changelog');
      } finally {
        setLoading(false);
      }
    };

    loadChangelog();
  }, [domain]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading changelog...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Changelog Not Available</h1>
          <p className="text-gray-600 mb-4">{error || 'Unable to load changelog'}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h3 className="font-medium text-blue-900 mb-2">Need help?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Make sure you've added the correct DNS records</li>
              <li>• Verify your domain in your project settings</li>
              <li>• Contact support if you need assistance</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {project.name} Changelog
          </h1>
          <p className="text-lg text-gray-600">
            Stay updated with the latest changes and improvements.
          </p>
        </div>

        <PublicChangelog
          project={project}
          releases={releases}
        />
      </div>
    </div>
  );
}

export default function CustomDomainChangelogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading changelog...</p>
        </div>
      </div>
    }>
      <CustomDomainChangelogContent />
    </Suspense>
  );
}
