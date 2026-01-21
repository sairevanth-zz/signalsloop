'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  Users,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { ResultsChart } from '@/components/experiments/ResultsChart';
import { LearningsPanel } from '@/components/experiments/LearningsPanel';
import { AIExperimentWatchdog } from '@/components/experiments/AIExperimentWatchdog';
import { ExperimentResultsDashboard } from '@/components/experiments/ExperimentResultsDashboard';
import { ExperimentSetup } from '@/components/experiments/ExperimentSetup';
import { VisualEditor } from '@/components/experiments/VisualEditor';

interface Experiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  expected_outcome: string;
  status: 'draft' | 'ready' | 'running' | 'paused' | 'completed' | 'cancelled';
  experiment_type: string;
  primary_metric: string;
  secondary_metrics: string[];
  success_criteria: string;
  control_description: string;
  treatment_description: string;
  sample_size_target: number;
  minimum_detectable_effect: number;
  statistical_power: number;
  confidence_level: number;
  feature_flag_key?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

interface ExperimentResult {
  metric_name: string;
  variant: string;
  sample_size: number;
  mean_value: number;
  std_dev: number;
  conversion_rate?: number;
  p_value?: number;
  confidence_interval?: { lower: number; upper: number };
  statistical_significance: boolean;
  relative_improvement?: number;
}

interface Learning {
  id: string;
  learning_type: 'insight' | 'recommendation' | 'mistake' | 'success';
  title: string;
  description: string;
  impact_score?: number;
  tags: string[];
}

export default function ExperimentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const experimentId = (params?.id as string) || '';
  const projectSlug = (params?.slug as string) || '';
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const [visualEditorUrl, setVisualEditorUrl] = useState('');

  // Fetch experiment data
  useEffect(() => {
    const fetchExperiment = async () => {
      try {
        // Fetch experiment details
        const response = await fetch(`/api/experiments/${experimentId}`);
        if (response.ok) {
          const data = await response.json();
          setExperiment(data.experiment);
          setResults(data.results || []);
          setLearnings(data.learnings || []);
        }
      } catch (error) {
        console.error('Error fetching experiment:', error);
        toast.error('Failed to load experiment');
      } finally {
        setLoading(false);
      }
    };

    fetchExperiment();
  }, [experimentId]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!experiment) return;

    try {
      const response = await fetch(`/api/experiments/${experimentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        setExperiment(data.experiment || { ...experiment, status: newStatus as any });
        toast.success(`Experiment ${newStatus}`);
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleGenerateFeatureFlagKey = async (): Promise<string> => {
    // Generate a slug-friendly key from experiment name
    const baseKey = (experiment?.name || 'experiment')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 40);

    const key = `${baseKey}-${Date.now().toString(36)}`;

    // Save the feature flag key to the experiment
    try {
      const response = await fetch(`/api/experiments/${experimentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_flag_key: key }),
      });

      if (response.ok && experiment) {
        setExperiment({ ...experiment, feature_flag_key: key });
      }
    } catch (error) {
      console.error('Error saving feature flag key:', error);
    }

    return key;
  };

  const handleExtractLearnings = async () => {
    try {
      const response = await fetch(`/api/experiments/${experimentId}/learnings`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setLearnings(data.learnings);
        toast.success('Learnings extracted!');
      } else {
        toast.error('Failed to extract learnings');
      }
    } catch (error) {
      console.error('Error extracting learnings:', error);
      toast.error('Failed to extract learnings');
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    ready: 'bg-blue-100 text-blue-800',
    running: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading experiment...</div>
      </div>
    );
  }

  if (!experiment) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Experiment Not Found</h2>
          <Button onClick={() => router.push(`/${projectSlug}/experiments`)}>
            Back to Experiments
          </Button>
        </Card>
      </div>
    );
  }

  // Calculate progress
  const totalSampleSize = results.reduce((sum, r) => sum + r.sample_size, 0);
  const progress = Math.min(100, (totalSampleSize / (experiment.sample_size_target * 2)) * 100);
  const primaryResults = results.filter((r) => r.metric_name === experiment.primary_metric);
  const significantResult = primaryResults.find((r) => r.statistical_significance && r.variant === 'treatment');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${projectSlug}/experiments`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Experiments
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{experiment.name}</h1>
              <Badge className={statusColors[experiment.status]}>
                {experiment.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{experiment.description}</p>
          </div>

          {/* Action Buttons - Only show for non-draft experiments */}
          <div className="flex gap-2">
            {experiment.status === 'running' && (
              <>
                <Button variant="outline" onClick={() => handleUpdateStatus('paused')}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                <Button onClick={() => handleUpdateStatus('completed')}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete
                </Button>
              </>
            )}
            {experiment.status === 'paused' && (
              <Button onClick={() => handleUpdateStatus('running')}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Setup Flow - Shows for draft experiments */}
      {experiment.status === 'draft' && !showVisualEditor && (
        <ExperimentSetup
          experiment={{
            id: experiment.id,
            name: experiment.name,
            feature_flag_key: experiment.feature_flag_key,
            primary_metric: experiment.primary_metric || 'Conversion',
          }}
          projectSlug={projectSlug}
          onStart={() => handleUpdateStatus('running')}
          onStartVisualEditor={(url) => {
            setVisualEditorUrl(url);
            setShowVisualEditor(true);
          }}
          onGenerateKey={handleGenerateFeatureFlagKey}
        />
      )}

      {/* Visual Editor - Shows when user chooses no-code option */}
      {experiment.status === 'draft' && showVisualEditor && (
        <VisualEditor
          experimentId={experiment.id}
          variantKey="treatment"
          targetUrl={visualEditorUrl}
          onSave={async (changes) => {
            // Save visual changes to the experiment variant
            try {
              const response = await fetch(`/api/experiments/${experimentId}/variants`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  variant_key: 'treatment',
                  visual_changes: changes,
                  page_url: visualEditorUrl,
                }),
              });

              if (!response.ok) {
                throw new Error('Failed to save');
              }

              toast.success(`Saved ${changes.length} visual changes!`);
              setShowVisualEditor(false);
              // Optionally start the experiment
              // handleUpdateStatus('running');
            } catch {
              toast.error('Failed to save visual changes');
            }
          }}
          onCancel={() => setShowVisualEditor(false)}
        />
      )}

      {/* AI Watchdog - Shows for running/paused experiments */}
      <AIExperimentWatchdog experimentId={experiment.id} experimentStatus={experiment.status} />

      {/* Real-time Results Dashboard - Shows for running, paused, and completed experiments */}
      {(experiment.status === 'running' || experiment.status === 'paused' || experiment.status === 'completed') && (
        <ExperimentResultsDashboard experimentId={experiment.id} />
      )}

      {/* Progress & Significance Alert */}
      {experiment.status === 'running' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Progress Card */}
          <Card className="p-6">
            <Label className="text-sm text-muted-foreground">Sample Size Progress</Label>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-2">
                <span>{totalSampleSize.toLocaleString()} participants</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Target: {(experiment.sample_size_target * 2).toLocaleString()} participants
              </p>
            </div>
          </Card>

          {/* Significance Alert */}
          {significantResult ? (
            <Card className="p-6 bg-green-50 border-green-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Statistical Significance Reached!</p>
                  <p className="text-sm text-green-800 mt-1">
                    Treatment shows {significantResult.relative_improvement?.toFixed(1)}% improvement
                    (p = {significantResult.p_value?.toFixed(4)})
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-semibold">No Significant Results Yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Continue collecting data to reach statistical significance
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Hypothesis & Setup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Hypothesis</h2>
          <p className="text-lg font-medium mb-2">{experiment.hypothesis}</p>
          <p className="text-sm text-muted-foreground">{experiment.expected_outcome}</p>

          <div className="mt-4 pt-4 border-t">
            <Label className="text-sm font-semibold">Success Criteria</Label>
            <p className="text-sm mt-1">{experiment.success_criteria}</p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Experiment Design</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Primary Metric</Label>
              <p className="text-sm mt-1">{experiment.primary_metric}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Secondary Metrics</Label>
              <ul className="list-disc list-inside text-sm mt-1">
                {experiment.secondary_metrics.map((metric, i) => (
                  <li key={i}>{metric}</li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">MDE</Label>
                <p className="font-semibold">{(experiment.minimum_detectable_effect * 100).toFixed(1)}%</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Power</Label>
                <p className="font-semibold">{(experiment.statistical_power * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Variants */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Control (A)
          </h3>
          <p className="text-sm text-muted-foreground">{experiment.control_description}</p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Treatment (B)
          </h3>
          <p className="text-sm text-muted-foreground">{experiment.treatment_description}</p>
        </Card>
      </div>

      {/* Results Visualization */}
      {results.length > 0 && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Results</h2>
            <Badge variant="outline">{results.length} metrics tracked</Badge>
          </div>
          <ResultsChart results={results} primaryMetric={experiment.primary_metric} />
        </Card>
      )}

      {/* Learnings */}
      {experiment.status === 'completed' && (
        <LearningsPanel
          learnings={learnings}
          onExtractLearnings={handleExtractLearnings}
        />
      )}

      {/* Feature Flag Link */}
      {experiment.feature_flag_key && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Feature Flag: {experiment.feature_flag_key}</span>
            </div>
            <Button variant="outline" size="sm">
              View in LaunchDarkly
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
