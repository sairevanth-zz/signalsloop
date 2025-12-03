'use client';

/**
 * Feature Success Predictions Page
 *
 * View and generate feature success predictions
 */

import { useState, useEffect } from 'react';
import { PredictionCard } from '@/components/predictions/PredictionCard';
import { PredictionDetails } from '@/components/predictions/PredictionDetails';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FeaturePrediction } from '@/types/prediction';
import { Sparkles, Plus, Loader2, TrendingUp, Brain } from 'lucide-react';
import { toast } from 'sonner';

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<FeaturePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrediction, setSelectedPrediction] = useState<FeaturePrediction | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [featureName, setFeatureName] = useState('');
  const [featureDescription, setFeatureDescription] = useState('');

  // Get project ID from localStorage or context
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    // Try to get project ID from localStorage
    const storedProjectId = localStorage.getItem('currentProjectId');
    if (storedProjectId) {
      setProjectId(storedProjectId);
      loadPredictions(storedProjectId);
    } else {
      setLoading(false);
    }
  }, []);

  async function loadPredictions(projectId: string) {
    try {
      setLoading(true);
      const response = await fetch(`/api/predictions?projectId=${projectId}`);

      if (!response.ok) {
        throw new Error('Failed to load predictions');
      }

      const data = await response.json();
      setPredictions(data.predictions || []);
    } catch (error) {
      console.error('Failed to load predictions:', error);
      toast.error('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePrediction() {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }

    if (!featureName.trim()) {
      toast.error('Please enter a feature name');
      return;
    }

    try {
      setGenerating(true);

      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          feature_name: featureName,
          feature_description: featureDescription || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate prediction');
      }

      const data = await response.json();

      if (data.success && data.prediction) {
        setPredictions([data.prediction, ...predictions]);
        setShowNewDialog(false);
        setFeatureName('');
        setFeatureDescription('');
        setSelectedPrediction(data.prediction);
        toast.success('Prediction generated successfully!');
      }
    } catch (error) {
      console.error('Failed to generate prediction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate prediction');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="size-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
            <p className="text-muted-foreground">
              Please select a project to view and generate predictions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="size-8 text-purple-500" />
            Feature Success Predictions
          </h1>
          <Button onClick={() => setShowNewDialog(true)} className="gap-2">
            <Plus className="size-4" />
            Generate Prediction
          </Button>
        </div>
        <p className="text-muted-foreground">
          Predict feature success before building using AI-powered analysis of your historical data
          and customer feedback.
        </p>
      </div>

      {/* Stats */}
      {predictions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Total Predictions</div>
              <div className="text-3xl font-bold">{predictions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Avg Predicted Adoption</div>
              <div className="text-3xl font-bold">
                {(
                  (predictions.reduce((sum, p) => sum + (p.predicted_adoption_rate || 0), 0) /
                    predictions.length) *
                  100
                ).toFixed(0)}
                %
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Avg Confidence</div>
              <div className="text-3xl font-bold">
                {(
                  (predictions.reduce((sum, p) => sum + (p.confidence_score || 0), 0) /
                    predictions.length) *
                  100
                ).toFixed(0)}
                %
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Predictions List */}
      {predictions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <TrendingUp className="size-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Predictions Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Generate your first feature success prediction to understand which features are likely
              to succeed before you build them.
            </p>
            <Button onClick={() => setShowNewDialog(true)} className="gap-2">
              <Sparkles className="size-4" />
              Generate First Prediction
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {predictions.map((prediction) => (
            <PredictionCard
              key={prediction.id}
              prediction={prediction}
              onViewDetails={() => setSelectedPrediction(prediction)}
            />
          ))}
        </div>
      )}

      {/* New Prediction Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-purple-500" />
              Generate Feature Prediction
            </DialogTitle>
            <DialogDescription>
              Enter feature details to predict its success. We'll analyze historical data and
              customer feedback to forecast adoption and impact.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="feature-name">Feature Name *</Label>
              <Input
                id="feature-name"
                placeholder="e.g., Dark Mode Toggle"
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="feature-description">Feature Description (Optional)</Label>
              <textarea
                id="feature-description"
                placeholder="Describe what this feature does and what problem it solves..."
                value={featureDescription}
                onChange={(e) => setFeatureDescription(e.target.value)}
                className="mt-1.5 w-full min-h-[100px] px-3 py-2 rounded-md border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleGeneratePrediction} disabled={generating} className="gap-2">
                {generating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate Prediction
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prediction Details Dialog */}
      <Dialog
        open={selectedPrediction !== null}
        onOpenChange={(open) => !open && setSelectedPrediction(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedPrediction && (
            <PredictionDetails
              prediction={selectedPrediction}
              onClose={() => setSelectedPrediction(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
