'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';

interface ExperimentDesign {
  hypothesis: string;
  expectedOutcome: string;
  primaryMetric: string;
  secondaryMetrics: string[];
  successCriteria: string;
  controlDescription: string;
  treatmentDescription: string;
  sampleSizeTarget: number;
  minimumDetectableEffect: number;
  estimatedDuration: string;
  risks: string[];
  implementation: string;
}

interface Validation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export default function NewExperimentPage() {
  const params = useParams();
  const router = useRouter();
  const projectSlug = params.slug as string;
  const [featureIdea, setFeatureIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<ExperimentDesign | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Get project ID
  useEffect(() => {
    const fetchProject = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data } = await supabase
        .from('projects')
        .select('id')
        .eq('slug', projectSlug)
        .single();

      if (data) {
        setProjectId(data.id);
      }
    };

    fetchProject();
  }, [projectSlug]);

  const handleGenerateDesign = async () => {
    if (!featureIdea.trim() || !projectId) {
      toast.error('Please enter a feature idea');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/experiments/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureIdea,
          projectId,
          saveDesign: false, // Don't save yet, let user review first
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setDesign(data.design);
        setValidation(data.validation);
        toast.success('Experiment design generated!');
      } else {
        toast.error(data.error || 'Failed to generate design');
      }
    } catch (error) {
      console.error('Error generating design:', error);
      toast.error('Failed to generate design');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExperiment = async () => {
    if (!design || !projectId) return;

    try {
      const response = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: design.hypothesis.substring(0, 100),
          description: featureIdea,
          hypothesis: design.hypothesis,
          expectedOutcome: design.expectedOutcome,
          experimentType: 'ab_test',
          controlDescription: design.controlDescription,
          treatmentDescription: design.treatmentDescription,
          primaryMetric: design.primaryMetric,
          secondaryMetrics: design.secondaryMetrics,
          successCriteria: design.successCriteria,
          sampleSizeTarget: design.sampleSizeTarget,
          minimumDetectableEffect: design.minimumDetectableEffect / 100,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Experiment created!');
        router.push(`/${projectSlug}/experiments/${data.experiment.id}`);
      } else {
        toast.error(data.error || 'Failed to create experiment');
      }
    } catch (error) {
      console.error('Error saving experiment:', error);
      toast.error('Failed to create experiment');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
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

        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-purple-500" />
          AI Experiment Designer
        </h1>
        <p className="text-muted-foreground mt-2">
          Describe your feature idea and get a complete experiment design in seconds
        </p>
      </div>

      {!design ? (
        <Card className="p-8">
          <div className="space-y-4">
            <div>
              <Label htmlFor="featureIdea">Feature Idea or Hypothesis</Label>
              <Textarea
                id="featureIdea"
                value={featureIdea}
                onChange={(e) => setFeatureIdea(e.target.value)}
                placeholder="e.g., Adding a dark mode toggle will increase user engagement by 15%"
                rows={6}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Be as specific as possible. Include what you want to test and the expected impact.
              </p>
            </div>

            <Button
              onClick={handleGenerateDesign}
              disabled={loading || !featureIdea.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Design...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Experiment Design
                </>
              )}
            </Button>
          </div>

          {/* Example Ideas */}
          <div className="mt-8 pt-8 border-t">
            <h3 className="text-sm font-semibold mb-3">Example Ideas:</h3>
            <div className="space-y-2">
              {[
                'Adding social proof badges will increase conversion rate by 20%',
                'Simplifying the onboarding flow from 5 steps to 3 will reduce drop-off',
                'Adding a progress bar to forms will improve completion rate',
                'Implementing AI-powered recommendations will increase user engagement',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setFeatureIdea(example)}
                  className="text-sm text-left text-muted-foreground hover:text-foreground block w-full p-2 rounded hover:bg-muted transition-colors"
                >
                  → {example}
                </button>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Validation Alerts */}
          {validation && !validation.valid && (
            <Card className="p-4 border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Validation Errors</p>
                  <ul className="list-disc list-inside text-sm text-red-800 mt-2">
                    {validation.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {validation && validation.warnings.length > 0 && (
            <Card className="p-4 border-yellow-200 bg-yellow-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900">Warnings</p>
                  <ul className="list-disc list-inside text-sm text-yellow-800 mt-2">
                    {validation.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Hypothesis */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Hypothesis</h2>
            <p className="text-lg font-medium">{design.hypothesis}</p>
            <p className="text-muted-foreground mt-2">{design.expectedOutcome}</p>
          </Card>

          {/* Metrics */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Metrics</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Primary Metric</Label>
                <p className="mt-1">{design.primaryMetric}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Secondary Metrics</Label>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {design.secondaryMetrics.map((metric, i) => (
                    <li key={i}>{metric}</li>
                  ))}
                </ul>
              </div>
              <div>
                <Label className="text-sm font-semibold">Success Criteria</Label>
                <p className="mt-1">{design.successCriteria}</p>
              </div>
            </div>
          </Card>

          {/* Design */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Control (Current State)</h3>
              <p className="text-sm">{design.controlDescription}</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Treatment (New Version)</h3>
              <p className="text-sm">{design.treatmentDescription}</p>
            </Card>
          </div>

          {/* Parameters */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Experiment Parameters</h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <Label className="text-sm text-muted-foreground">Sample Size</Label>
                <p className="text-3xl font-bold">{design.sampleSizeTarget.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">users per variant</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Min Detectable Effect</Label>
                <p className="text-3xl font-bold">{design.minimumDetectableEffect}%</p>
                <p className="text-xs text-muted-foreground mt-1">smallest meaningful change</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Estimated Duration</Label>
                <p className="text-3xl font-bold">{design.estimatedDuration}</p>
                <p className="text-xs text-muted-foreground mt-1">to reach sample size</p>
              </div>
            </div>
          </Card>

          {/* Risks */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Potential Risks</h2>
            <ul className="space-y-2">
              {design.risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{risk}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Implementation */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Implementation Notes</h2>
            <p className="text-sm whitespace-pre-wrap">{design.implementation}</p>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setDesign(null);
                setValidation(null);
              }}
              className="flex-1"
            >
              Start Over
            </Button>
            <Button
              onClick={handleSaveExperiment}
              disabled={validation && !validation.valid}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Create Experiment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
