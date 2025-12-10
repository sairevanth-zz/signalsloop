'use client';

/**
 * Individual Spec View Page
 * View and edit a spec, with export functionality
 * Now includes Pre-Mortem Analysis and Lovable Prototype buttons
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
  AlertTriangle,
  Sparkles,
  Loader2,
  Rocket,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { SpecStatus } from '@/types/specs';
import { getStatusColorScheme, SPEC_STATUS_LABELS } from '@/types/specs';
import { downloadMarkdown } from '@/lib/specs/export';
import { PreMortemCard } from '@/components/analysis/PreMortemCard';
import { MakeItRealModal } from '@/components/specs/MakeItRealModal';
import type { PreMortemAnalysis } from '@/types/pre-mortem';

export default function SpecViewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [project, setProject] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);

  const specId = params.id as string;
  const { spec, loading, error, refetch } = useSpec(specId);
  const { updateSpec, updating } = useUpdateSpec();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');

  // AI Feature States
  const [preMortemAnalysis, setPreMortemAnalysis] = useState<PreMortemAnalysis | null>(null);
  const [runningPreMortem, setRunningPreMortem] = useState(false);
  const [generatingPrototype, setGeneratingPrototype] = useState(false);
  const [showPreMortem, setShowPreMortem] = useState(false);
  const [showMakeItReal, setShowMakeItReal] = useState(false);

  // Load project data
  React.useEffect(() => {
    async function loadProject() {
      if (!params.slug) return;

      try {
        const { getSupabaseClient } = await import('@/lib/supabase-client');
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
          .from('projects')
          .select('id, name, slug')
          .eq('slug', params.slug as string)
          .single();

        if (error) {
          console.error('Error loading project:', error);
          router.push('/app');
          return;
        }

        setProject(data);
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setProjectLoading(false);
      }
    }

    loadProject();
  }, [params.slug, router]);

  // Initialize edited values when spec loads
  React.useEffect(() => {
    if (spec) {
      setEditedTitle(spec.title);
      setEditedContent(spec.content);
    }
  }, [spec]);

  // Check if user wants to perform a quick action
  React.useEffect(() => {
    const action = searchParams?.get('action');
    if (!action || !spec || !project) return;

    if (action === 'export') {
      handleExport();
    } else if (action === 'premortem' && !preMortemAnalysis && !runningPreMortem) {
      // Auto-trigger pre-mortem
      handleRunPreMortem();
    } else if (action === 'prototype' && !generatingPrototype) {
      // Auto-trigger prototype
      handleGeneratePrototype();
    }
  }, [searchParams, spec, project]);

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

  // Run Pre-Mortem Analysis
  const handleRunPreMortem = async () => {
    if (!spec || !project) return;

    setRunningPreMortem(true);
    try {
      const response = await fetch('/api/analysis/pre-mortem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          featureName: spec.title,
          featureDescription: spec.content.slice(0, 500),
          specContent: spec.content
        })
      });

      if (!response.ok) throw new Error('Pre-mortem analysis failed');

      const data = await response.json();
      setPreMortemAnalysis(data.analysis);
      setShowPreMortem(true);
      toast.success('Pre-Mortem analysis complete!');
    } catch (error) {
      console.error('Pre-mortem error:', error);
      toast.error('Failed to run pre-mortem analysis');
    } finally {
      setRunningPreMortem(false);
    }
  };

  // Generate Lovable Prototype
  const handleGeneratePrototype = async () => {
    if (!spec || !project) return;

    setGeneratingPrototype(true);
    try {
      const response = await fetch('/api/integrations/lovable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          specId: spec.id,
          title: spec.title,
          prompt: spec.content
        })
      });

      const data = await response.json();

      if (data.success && data.lovableUrl) {
        toast.success('Prototype generated! Opening Lovable...');
        window.open(data.lovableUrl, '_blank');
      } else {
        toast.error(data.error || 'Failed to generate prototype');
      }
    } catch (error) {
      console.error('Lovable error:', error);
      toast.error('Failed to generate prototype');
    } finally {
      setGeneratingPrototype(false);
    }
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Project not found</p>
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
                  {/* AI Action Buttons */}
                  <Button
                    variant="outline"
                    onClick={handleRunPreMortem}
                    disabled={runningPreMortem}
                    className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                  >
                    {runningPreMortem ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mr-2" />
                    )}
                    Pre-Mortem
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGeneratePrototype}
                    disabled={generatingPrototype}
                    className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                  >
                    {generatingPrototype ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Prototype
                  </Button>

                  {/* Make It Real Button */}
                  <Button
                    variant="outline"
                    onClick={() => setShowMakeItReal(true)}
                    className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Make It Real
                  </Button>

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
              className={`${getStatusColorScheme(spec.status).bg} ${getStatusColorScheme(spec.status).text
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

        {/* Pre-Mortem Analysis Results */}
        {showPreMortem && preMortemAnalysis && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold dark:text-white">Pre-Mortem Analysis</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreMortem(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <PreMortemCard analysis={preMortemAnalysis} />
          </div>
        )}
      </div>

      {/* Make It Real Modal */}
      {spec && project && (
        <MakeItRealModal
          open={showMakeItReal}
          onOpenChange={setShowMakeItReal}
          specId={spec.id}
          specTitle={spec.title}
          projectId={project.id}
        />
      )}
    </div>
  );
}

