'use client';

/**
 * Individual Spec View Page
 * View and edit a spec, with export functionality
 */

import React, { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSpec, useUpdateSpec } from '@/hooks/use-specs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Download,
  FileText,
  Calendar,
  MessageSquare,
  Clock,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { SpecStatus } from '@/types/specs';
import { getStatusColorScheme, SPEC_STATUS_LABELS } from '@/types/specs';
import { downloadMarkdown } from '@/lib/specs/export';

export default function SpecViewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, project } = useAuth();

  const specId = params.id as string;
  const { spec, loading, error, refetch } = useSpec(specId);
  const { updateSpec, updating } = useUpdateSpec();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');

  // Initialize edited values when spec loads
  React.useEffect(() => {
    if (spec) {
      setEditedTitle(spec.title);
      setEditedContent(spec.content);
    }
  }, [spec]);

  // Check if user wants to export
  React.useEffect(() => {
    if (searchParams.get('action') === 'export' && spec) {
      handleExport();
    }
  }, [searchParams, spec]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!spec) return;

    const result = await updateSpec(
      spec.id,
      {
        title: editedTitle,
        content: editedContent,
      },
      true, // Create version
      'Manual edit'
    );

    if (result) {
      toast.success('Spec updated successfully');
      setIsEditing(false);
      refetch();
    } else {
      toast.error('Failed to update spec');
    }
  };

  const handleCancel = () => {
    if (spec) {
      setEditedTitle(spec.title);
      setEditedContent(spec.content);
    }
    setIsEditing(false);
  };

  const handleExport = () => {
    if (!spec) return;

    downloadMarkdown(spec, {
      includeMetadata: true,
      includeLinkedFeedback: true,
      includeContextSources: true,
    });

    toast.success('Spec exported as Markdown');
  };

  const handleStatusChange = async (newStatus: SpecStatus) => {
    if (!spec) return;

    const result = await updateSpec(spec.id, { status: newStatus });

    if (result) {
      toast.success(`Status changed to ${SPEC_STATUS_LABELS[newStatus]}`);
      refetch();
    } else {
      toast.error('Failed to change status');
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading project...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading spec...</p>
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Spec not found'}</p>
          <Link href={`/${params.slug}/specs`}>
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Specs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link href={`/${params.slug}/specs`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Specs
              </Button>
            </Link>

            <div className="flex items-center space-x-3">
              {!isEditing ? (
                <>
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button onClick={handleEdit}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={updating}>
                    <Save className="h-4 w-4 mr-2" />
                    {updating ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Title and Metadata */}
          {isEditing ? (
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="text-2xl font-bold mb-4"
              placeholder="Spec title..."
            />
          ) : (
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {spec.title}
            </h1>
          )}

          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <Badge
              className={`${getStatusColorScheme(spec.status).bg} ${
                getStatusColorScheme(spec.status).text
              }`}
            >
              {SPEC_STATUS_LABELS[spec.status]}
            </Badge>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(spec.created_at).toLocaleDateString()}
            </div>
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-1" />
              {spec.linked_feedback_ids.length} feedback items
            </div>
            {spec.generation_time_ms && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Generated in {(spec.generation_time_ms / 1000).toFixed(1)}s
              </div>
            )}
          </div>

          {/* Status Change Actions */}
          {!isEditing && (
            <div className="flex items-center space-x-2 mt-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">Change status:</span>
              {(['draft', 'review', 'approved'] as SpecStatus[]).map((status) =>
                status !== spec.status ? (
                  <Button
                    key={status}
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(status)}
                  >
                    {SPEC_STATUS_LABELS[status]}
                  </Button>
                ) : null
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-8">
            {isEditing ? (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={30}
                className="font-mono text-sm"
                placeholder="Write your spec in Markdown..."
              />
            ) : (
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <ReactMarkdown>{spec.content}</ReactMarkdown>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata Footer */}
        {!isEditing && spec.context_sources.length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Context Sources Used</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {spec.context_sources.map((source, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{source.title}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {source.preview.substring(0, 100)}...
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {Math.round(source.relevanceScore * 100)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
