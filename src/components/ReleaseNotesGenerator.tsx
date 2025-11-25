'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface ReleaseNotesGeneratorProps {
  projectId: string;
  projectSlug: string;
  onGenerated?: () => void;
}

interface GenerationResult {
  success?: boolean;
  message?: string;
  release?: {
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    release_type?: string;
    metadata?: Record<string, any>;
  };
  entries?: Array<{
    id?: string;
    title: string;
    description?: string;
    entry_type?: string;
    priority?: string;
  }>;
  communications?: {
    email?: string;
    blog?: string;
  };
  detectedFeatures?: number;
}

export function ReleaseNotesGenerator({
  projectId,
  projectSlug,
  onGenerated,
}: ReleaseNotesGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/changelog/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        setError(data.error || data.message || 'Failed to generate release notes.');
        setResult(null);
        return;
      }

      setResult(data);
      onGenerated?.();
    } catch (err) {
      setError('Failed to generate release notes.');
      console.error('[ReleaseNotesGenerator] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (copyError) {
      console.error('Copy failed:', copyError);
    }
  };

  return (
    <Card className="border border-blue-100 bg-blue-50/60">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Release Planning Agent</CardTitle>
          <CardDescription>
            Auto-generate release notes, changelog entries, and customer comms from completed work.
          </CardDescription>
        </div>
        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generating…' : 'Auto-generate'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-sm text-gray-700">
          <Badge variant="outline">
            {result?.detectedFeatures ? `${result.detectedFeatures} completed items detected` : 'Find completed roadmap items'}
          </Badge>
          <Badge variant="outline">Drafts a changelog release (not published)</Badge>
          <Badge variant="outline">Creates email + blog drafts</Badge>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {result?.release && (
          <div className="rounded-lg border border-blue-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-600">Draft created</p>
                <p className="text-base font-semibold text-gray-900">{result.release.title}</p>
                {result.release.excerpt && (
                  <p className="text-sm text-gray-600">{result.release.excerpt}</p>
                )}
              </div>
              {result.release.slug && (
                <a
                  className="text-sm text-blue-600 hover:underline"
                  href={`/${projectSlug}/changelog/${result.release.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View
                </a>
              )}
            </div>

            {result.entries && result.entries.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-gray-800">Changelog entries</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {result.entries.map((entry) => (
                    <div
                      key={entry.id || entry.title}
                      className="rounded-md border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{entry.title}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {entry.entry_type || 'feature'}
                        </Badge>
                      </div>
                      {entry.description && (
                        <p className="mt-1 text-sm text-gray-700">{entry.description}</p>
                      )}
                      {entry.priority && (
                        <p className="mt-1 text-xs text-gray-500">Priority: {entry.priority}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(result.communications?.email || result.communications?.blog) && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {result.communications?.email && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800">Customer email draft</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(result.communications?.email)}
                      >
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      className="h-40 bg-white"
                      value={result.communications.email || ''}
                      readOnly
                    />
                  </div>
                )}
                {result.communications?.blog && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800">Blog / announcement draft</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(result.communications?.blog)}
                      >
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      className="h-40 bg-white"
                      value={result.communications.blog || ''}
                      readOnly
                    />
                  </div>
                )}
              </div>
            )}

            {result.message && (
              <p className="mt-3 text-xs text-gray-500">{result.message}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
