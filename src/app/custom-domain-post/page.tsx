'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PostPage from '@/app/[slug]/post/[id]/page';

function CustomDomainPostContent() {
  const searchParams = useSearchParams();
  const domain = searchParams.get('domain');
  const postId = searchParams.get('postId');
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!domain || !postId) {
      setError('Domain and post ID are required');
      setLoading(false);
      return;
    }

    // Resolve custom domain to project slug
    const resolveDomain = async () => {
      try {
        const response = await fetch('/api/custom-domain/resolve', {
          headers: {
            'host': domain
          }
        });

        if (!response.ok) {
          throw new Error('Failed to resolve domain');
        }

        const data = await response.json();

        if (data.isCustomDomain && data.project) {
          setProjectSlug(data.project.slug);
        } else {
          setError('Domain not found or not verified');
        }
      } catch (err) {
        console.error('Error resolving domain:', err);
        setError('Failed to resolve domain');
      } finally {
        setLoading(false);
      }
    };

    resolveDomain();
  }, [domain, postId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !projectSlug) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Domain Not Found</h1>
          <p className="text-gray-600 mb-4">
            The domain <code className="bg-gray-100 px-2 py-1 rounded">{domain}</code> is not configured or verified.
          </p>
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

  // Render the actual post page with the resolved project slug
  return <PostPage params={{ slug: projectSlug, id: postId }} />;
}

export default function CustomDomainPostPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading post...</p>
        </div>
      </div>
    }>
      <CustomDomainPostContent />
    </Suspense>
  );
}
