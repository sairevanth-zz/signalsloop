'use client';

import { useState, useEffect } from 'react';

interface SimpleChangelogManagerProps {
  projectId: string;
  projectSlug: string;
}

interface Release {
  id: string;
  title: string;
  slug: string;
  content: string;
  release_type: 'major' | 'minor' | 'patch' | 'hotfix';
  published_at?: string;
  is_published: boolean;
  version?: string;
}

export default function SimpleChangelogManager({ projectId, projectSlug }: SimpleChangelogManagerProps) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReleases();
  }, [projectId]);

  const loadReleases = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/changelog`);
      if (response.ok) {
        const data = await response.json();
        setReleases(data);
      } else {
        setError('Failed to load changelog releases');
      }
    } catch (error) {
      console.error('Error loading releases:', error);
      setError('Error loading changelog releases');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading changelog...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-medium mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={loadReleases}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Changelog Releases</h2>
          <p className="text-gray-600">Manage your product changelog releases</p>
        </div>
        <button 
          onClick={() => window.open(`/${projectSlug}/changelog`, '_blank')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          View Public Changelog
        </button>
      </div>

      {releases.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No releases yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Create your first changelog release to start sharing updates with your users.
          </p>
          <button 
            onClick={() => {
              // For now, just show an alert. In a full implementation, this would open a create form
              alert('Changelog creation form would open here. This is a simplified version.');
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create First Release
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {releases.map((release) => (
            <div key={release.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{release.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      release.release_type === 'major' ? 'bg-red-100 text-red-800' :
                      release.release_type === 'minor' ? 'bg-blue-100 text-blue-800' :
                      release.release_type === 'patch' ? 'bg-green-100 text-green-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {release.release_type}
                    </span>
                    {release.version && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                        v{release.version}
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      release.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {release.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => window.open(`/${projectSlug}/changelog/${release.slug}`, '_blank')}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => {
                      alert('Edit form would open here. This is a simplified version.');
                    }}
                    className="text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Edit
                  </button>
                </div>
              </div>
              
              {release.content && (
                <div className="text-gray-700 text-sm">
                  {release.content.length > 200 
                    ? `${release.content.substring(0, 200)}...` 
                    : release.content
                  }
                </div>
              )}
              
              {release.published_at && (
                <div className="mt-4 text-xs text-gray-500">
                  Published: {new Date(release.published_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-blue-900 font-medium mb-2">Public Changelog URLs</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-blue-800 font-medium">Main Changelog:</span>
            <span className="text-blue-600 ml-2">/{projectSlug}/changelog</span>
          </div>
          <div>
            <span className="text-blue-800 font-medium">RSS Feed:</span>
            <span className="text-blue-600 ml-2">/{projectSlug}/changelog/rss</span>
          </div>
        </div>
      </div>
    </div>
  );
}
