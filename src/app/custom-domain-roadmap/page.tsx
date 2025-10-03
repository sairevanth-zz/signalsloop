import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PublicRoadmap from '@/components/PublicRoadmap';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

interface CustomDomainRoadmapPageProps {
  searchParams: Promise<{
    domain?: string;
  }>;
}

async function CustomDomainRoadmapContent({ searchParams }: CustomDomainRoadmapPageProps) {
  const { domain } = await searchParams;
  
  if (!domain) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Request</h1>
          <p className="text-gray-600 mb-6">
            Domain is required to view this roadmap.
          </p>
        </div>
      </div>
    );
  }

  try {
    // Resolve domain to project slug
    const { data: domainMapping, error: domainError } = await supabase
      .from('custom_domains')
      .select('project_id, projects!inner(id, name, description, slug, is_private, plan, created_at)')
      .eq('domain', domain)
      .single();

    if (domainError || !domainMapping) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Domain Not Found</h1>
            <p className="text-gray-600 mb-6">
              This custom domain is not configured or does not exist.
            </p>
          </div>
        </div>
      );
    }

    const project = domainMapping.projects;
    
    // Check if board is private
    if (project.is_private) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Private Board</h1>
            <p className="text-gray-600 mb-6">
              This feedback board is private and requires authentication to access.
            </p>
            <div className="space-y-3">
              <Link
                href={`/login?redirect=${encodeURIComponent(`/${project.slug}/roadmap`)}`}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block"
              >
                Sign In
              </Link>
              <Link
                href="/"
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors inline-block"
              >
                Create Your Own Board
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <PublicRoadmap 
        project={project}
      />
    );
  } catch (error) {
    console.error('Error loading custom domain roadmap:', error);
    notFound();
  }
}

export default function CustomDomainRoadmapPage({ searchParams }: CustomDomainRoadmapPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading roadmap...</p>
        </div>
      </div>
    }>
      <CustomDomainRoadmapContent searchParams={searchParams} />
    </Suspense>
  );
}