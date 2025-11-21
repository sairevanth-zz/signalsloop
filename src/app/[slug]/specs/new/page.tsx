'use client';

/**
 * New Spec Wizard Page
 * Simplified wizard for creating specs with AI
 */

import React, { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSpecGeneration } from '@/hooks/use-spec-generation';
import { useContextRetrieval } from '@/hooks/use-context-retrieval';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { SpecTemplate, GenerateSpecRequest } from '@/types/specs';
import { GENERATION_STEP_MESSAGES } from '@/types/specs';

export default function NewSpecPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [project, setProject] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [step, setStep] = useState<'input' | 'generating' | 'complete'>('input');

  // Input state
  const [idea, setIdea] = useState('');
  const [template, setTemplate] = useState<SpecTemplate>('standard');
  const [feedbackIds, setFeedbackIds] = useState<string[]>([]);

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

  // Check if coming from feedback page
  React.useEffect(() => {
    const fromFeedback = searchParams.get('from') === 'feedback';
    if (fromFeedback) {
      const storedFeedback = sessionStorage.getItem('spec_wizard_feedback');
      if (storedFeedback) {
        try {
          const ids = JSON.parse(storedFeedback);
          setFeedbackIds(ids);
          sessionStorage.removeItem('spec_wizard_feedback');
        } catch (error) {
          console.error('Error parsing feedback IDs:', error);
        }
      }
    }
  }, [searchParams]);

  // Generation hook
  const { generateSpec, cancelGeneration, isGenerating, progress, result, error } =
    useSpecGeneration();

  const handleGenerate = async () => {
    if (!project || !idea.trim()) {
      toast.error('Please enter an idea');
      return;
    }

    setStep('generating');

    const request: GenerateSpecRequest = {
      projectId: project.id,
      input: {
        type: feedbackIds.length > 0 ? 'feedback' : 'idea',
        idea: feedbackIds.length > 0 ? undefined : idea.trim(),
        feedbackIds: feedbackIds.length > 0 ? feedbackIds : undefined,
      },
      template,
      context: {
        includePatterns: [],
        includePersonas: [],
        includeCompetitors: [],
      },
    };

    await generateSpec(request);
  };

  // When generation completes, redirect to the spec
  React.useEffect(() => {
    if (result && result.specId) {
      setStep('complete');
      toast.success('Spec generated successfully!');

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/${params.slug}/specs/${result.specId}`);
      }, 1500);
    }
  }, [result]);

  // Handle errors
  React.useEffect(() => {
    if (error) {
      toast.error(error);
      setStep('input');
    }
  }, [error]);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <Link href={`/${params.slug}/specs`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Specs
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <Sparkles className="h-8 w-8 text-purple-500" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create New Spec
              </h1>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center space-x-4 mt-6">
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'input'
                    ? 'bg-purple-600 text-white'
                    : 'bg-green-500 text-white'
                }`}
              >
                {step !== 'input' ? <Check className="h-5 w-5" /> : '1'}
              </div>
              <span className="ml-2 text-sm font-medium">Input Idea</span>
            </div>

            <div className="w-12 h-0.5 bg-gray-300 dark:bg-gray-600" />

            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'generating'
                    ? 'bg-purple-600 text-white'
                    : step === 'complete'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                {step === 'complete' ? <Check className="h-5 w-5" /> : '2'}
              </div>
              <span className="ml-2 text-sm font-medium">Generate</span>
            </div>

            <div className="w-12 h-0.5 bg-gray-300 dark:bg-gray-600" />

            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'complete'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                {step === 'complete' ? <Check className="h-5 w-5" /> : '3'}
              </div>
              <span className="ml-2 text-sm font-medium">Complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'input' && (
          <Card>
            <CardHeader>
              <CardTitle>What do you want to build?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Feedback Mode Notice */}
              {feedbackIds.length > 0 && (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                        Generating from {feedbackIds.length} feedback items
                      </h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        AI will analyze the selected feedback and create a comprehensive spec
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Idea Input */}
              {feedbackIds.length === 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Describe your feature idea
                  </label>
                  <Textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="e.g., Add dark mode support with automatic system detection"
                    rows={4}
                    className="w-full"
                  />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    💡 Tip: Be specific! The more detail you provide, the better the AI can generate your spec.
                  </p>
                </div>
              )}

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select a template
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTemplate('standard')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      template === 'standard'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium mb-1">📄 Standard PRD</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Comprehensive product requirements document
                    </div>
                  </button>

                  <button
                    onClick={() => setTemplate('feature-launch')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      template === 'feature-launch'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium mb-1">🚀 Feature Launch</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Detailed spec for major feature launches
                    </div>
                  </button>

                  <button
                    onClick={() => setTemplate('bug-fix')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      template === 'bug-fix'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium mb-1">🐛 Bug Fix</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Specification for bug fixes
                    </div>
                  </button>

                  <button
                    onClick={() => setTemplate('api-spec')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      template === 'api-spec'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium mb-1">🔌 API Spec</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Technical API specification
                    </div>
                  </button>
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex justify-end space-x-3">
                <Link href={`/${params.slug}/specs`}>
                  <Button variant="outline">Cancel</Button>
                </Link>
                <Button
                  onClick={handleGenerate}
                  disabled={(feedbackIds.length === 0 && !idea.trim()) || isGenerating}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Spec
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'generating' && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <Sparkles className="h-16 w-16 text-purple-500 animate-pulse" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {GENERATION_STEP_MESSAGES[progress.step] || 'Generating your spec...'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{progress.message}</p>
                </div>

                <div className="max-w-md mx-auto">
                  <Progress value={progress.progress} className="h-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {progress.progress}% complete
                  </p>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  💡 Did you know? The average PM spends 4 hours writing a spec manually.
                  <br />
                  With Spec Writer, you're done in under 2 minutes!
                </div>

                <Button
                  variant="outline"
                  onClick={cancelGeneration}
                  disabled={!isGenerating}
                >
                  Cancel Generation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'complete' && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="h-10 w-10 text-white" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">Spec Generated Successfully!</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Redirecting to your new spec...
                  </p>
                </div>

                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="mt-4 border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="py-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900 dark:text-red-200">
                    Generation Failed
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
