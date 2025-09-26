import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PublicPostDetails from '@/components/PublicPostDetails';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

interface CustomDomainPostPageProps {
  searchParams: Promise<{
    domain?: string;
    id?: string;
  }>;
}

async function CustomDomainPostContent({ searchParams }: CustomDomainPostPageProps) {
  const { domain, id } = await searchParams;
  
  if (!domain || !id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Request</h1>
          <p className="text-gray-600 mb-6">
            Domain and post ID are required to view this post.
          </p>
        </div>
      </div>
    );
  }

  try {
    // Resolve domain to project slug
    const { data: domainMapping, error: domainError } = await supabase
      .from('custom_domains')
      .select('project_id, projects!inner(slug, name, description, is_private)')
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
              <a
                href={`/login?redirect=${encodeURIComponent(`/${project.slug}/post/${id}`)}`}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block"
              >
                Sign In
              </a>
              <a
                href="/"
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors inline-block"
              >
                Create Your Own Board
              </a>
            </div>
          </div>
        </div>
      );
    }

    // Get post details
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        category,
        vote_count,
        created_at,
        author_email,
        status,
        project_id
      `)
      .eq('id', id)
      .eq('project_id', project.id)
      .single();

    if (postError || !post) {
      notFound();
    }

    // Get related posts (same category, recent)
    const { data: relatedPosts } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        category,
        vote_count,
        created_at,
        author_email
      `)
      .eq('project_id', project.id)
      .eq('status', 'open')
      .eq('category', post.category)
      .neq('id', post.id)
      .order('created_at', { ascending: false })
      .limit(5);

    return (
      <PublicPostDetails 
        project={project}
        post={post}
        relatedPosts={relatedPosts || []}
      />
    );
  } catch (error) {
    console.error('Error loading custom domain post:', error);
    notFound();
  }
}

export default function CustomDomainPostPage({ searchParams }: CustomDomainPostPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading post...</p>
        </div>
      </div>
    }>
      <CustomDomainPostContent searchParams={searchParams} />
    </Suspense>
  );
}