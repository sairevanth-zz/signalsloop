'use client';

/**
 * Feature Impact History Component
 *
 * Displays a comprehensive history of launched features and their actual impact metrics.
 * Allows users to:
 * - Track new feature launches
 * - View pre vs post launch metrics
 * - Record success ratings and lessons learned
 * - Collect 30-day post-launch metrics
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Rocket,
  Star,
  Calendar,
  BarChart3,
  Download,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';

interface FeatureImpact {
  id: string;
  feature_name: string;
  feature_category: string | null;
  launched_at: string | null;
  effort_estimate: string | null;
  actual_effort_days: number | null;

  // Pre-launch metrics
  pre_sentiment_avg: number | null;
  pre_feedback_volume_weekly: number | null;
  pre_churn_rate: number | null;
  pre_nps_score: number | null;

  // Post-launch metrics
  post_sentiment_avg: number | null;
  post_feedback_volume_weekly: number | null;
  post_churn_rate: number | null;
  post_nps_score: number | null;
  post_adoption_rate: number | null;

  // Impact calculations
  sentiment_impact: number | null;
  churn_impact: number | null;
  feedback_volume_impact: number | null;

  // Business impact
  revenue_impact_estimate: number | null;
  success_rating: number | null;
  lessons_learned: string | null;

  created_at: string;
  updated_at: string;
}

interface FeatureImpactHistoryProps {
  projectId: string;
}

export function FeatureImpactHistory({ projectId }: FeatureImpactHistoryProps) {
  const [features, setFeatures] = useState<FeatureImpact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTrackDialog, setShowTrackDialog] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureImpact | null>(null);
  const [showRetrospectiveDialog, setShowRetrospectiveDialog] = useState(false);

  // Track feature form
  const [featureName, setFeatureName] = useState('');
  const [featureCategory, setFeatureCategory] = useState('');
  const [effortEstimate, setEffortEstimate] = useState<string>('medium');
  const [actualEffortDays, setActualEffortDays] = useState<number>(0);

  // Retrospective form
  const [successRating, setSuccessRating] = useState<number>(3);
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [revenueImpact, setRevenueImpact] = useState<number>(0);

  useEffect(() => {
    fetchFeatures();
  }, [projectId]);

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('feature_impact_history')
        .select('*')
        .eq('project_id', projectId)
        .order('launched_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setFeatures(data || []);
    } catch (error: any) {
      console.error('Error fetching features:', error);
      toast.error('Failed to load feature history');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackFeature = async () => {
    if (!featureName.trim()) {
      toast.error('Feature name is required');
      return;
    }

    try {
      const response = await fetch('/api/roadmap/track-feature-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'launch',
          projectId,
          featureName,
          featureCategory: featureCategory || null,
          effortEstimate,
          actualEffortDays: actualEffortDays || null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('Feature launch tracked successfully!');
      setShowTrackDialog(false);
      resetTrackForm();
      fetchFeatures();
    } catch (error: any) {
      console.error('Error tracking feature:', error);
      toast.error(error.message || 'Failed to track feature launch');
    }
  };

  const handleCollectMetrics = async (featureId: string) => {
    try {
      const response = await fetch('/api/roadmap/track-feature-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'collect-metrics',
          featureHistoryId: featureId,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('Post-launch metrics collected!');
      fetchFeatures();
    } catch (error: any) {
      console.error('Error collecting metrics:', error);
      toast.error(error.message || 'Failed to collect metrics');
    }
  };

  const handleSaveRetrospective = async () => {
    if (!selectedFeature) return;

    try {
      const response = await fetch('/api/roadmap/track-feature-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'retrospective',
          featureHistoryId: selectedFeature.id,
          successRating,
          lessonsLearned,
          revenueImpactEstimate: revenueImpact || null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('Retrospective saved successfully!');
      setShowRetrospectiveDialog(false);
      setSelectedFeature(null);
      resetRetrospectiveForm();
      fetchFeatures();
    } catch (error: any) {
      console.error('Error saving retrospective:', error);
      toast.error(error.message || 'Failed to save retrospective');
    }
  };

  const resetTrackForm = () => {
    setFeatureName('');
    setFeatureCategory('');
    setEffortEstimate('medium');
    setActualEffortDays(0);
  };

  const resetRetrospectiveForm = () => {
    setSuccessRating(3);
    setLessonsLearned('');
    setRevenueImpact(0);
  };

  const renderMetricChange = (current: number | null, baseline: number | null, format: 'percent' | 'number' | 'sentiment' = 'number') => {
    if (current === null || baseline === null) {
      return <span className="text-muted-foreground text-sm">No data</span>;
    }

    const change = current - baseline;
    const isPositive = change > 0;
    const isNegative = change < 0;

    let displayValue = '';
    if (format === 'percent') {
      displayValue = `${(change * 100).toFixed(2)}%`;
    } else if (format === 'sentiment') {
      displayValue = change.toFixed(2);
    } else {
      displayValue = change.toFixed(0);
    }

    return (
      <div className="flex items-center gap-1">
        {isPositive && <TrendingUp className="h-4 w-4 text-green-600" />}
        {isNegative && <TrendingDown className="h-4 w-4 text-red-600" />}
        {!isPositive && !isNegative && <Minus className="h-4 w-4 text-gray-400" />}
        <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'}`}>
          {isPositive && '+'}{displayValue}
        </span>
      </div>
    );
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  const getDaysSinceLaunch = (launchDate: string | null) => {
    if (!launchDate) return null;
    const days = Math.floor((new Date().getTime() - new Date(launchDate).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feature Impact History</h2>
          <p className="text-muted-foreground">
            Track launched features and measure their real-world impact
          </p>
        </div>
        <Dialog open={showTrackDialog} onOpenChange={setShowTrackDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Track New Launch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Track Feature Launch</DialogTitle>
              <DialogDescription>
                Record a new feature launch to track its impact over time
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="feature-name">Feature Name *</Label>
                <Input
                  id="feature-name"
                  placeholder="e.g., Dark Mode"
                  value={featureName}
                  onChange={(e) => setFeatureName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feature-category">Category</Label>
                <Input
                  id="feature-category"
                  placeholder="e.g., UI Enhancement"
                  value={featureCategory}
                  onChange={(e) => setFeatureCategory(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effort-estimate">Effort Estimate</Label>
                <Select value={effortEstimate} onValueChange={setEffortEstimate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (1-2 days)</SelectItem>
                    <SelectItem value="medium">Medium (3-5 days)</SelectItem>
                    <SelectItem value="high">High (1-2 weeks)</SelectItem>
                    <SelectItem value="very_high">Very High (2+ weeks)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="actual-effort">Actual Effort (days)</Label>
                <Input
                  id="actual-effort"
                  type="number"
                  placeholder="0"
                  value={actualEffortDays}
                  onChange={(e) => setActualEffortDays(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTrackDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleTrackFeature}>Track Launch</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {features.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Feature Launches Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking your feature launches to measure their impact and improve future decisions
            </p>
            <Button onClick={() => setShowTrackDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Track Your First Launch
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {features.map((feature) => {
            const daysSinceLaunch = getDaysSinceLaunch(feature.launched_at);
            const hasPostMetrics = feature.post_sentiment_avg !== null;
            const needsMetricsCollection = daysSinceLaunch !== null && daysSinceLaunch >= 30 && !hasPostMetrics;
            const needsRetrospective = hasPostMetrics && !feature.success_rating;

            return (
              <Card key={feature.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{feature.feature_name}</CardTitle>
                      <CardDescription>
                        {feature.feature_category && (
                          <span className="mr-3">{feature.feature_category}</span>
                        )}
                        {feature.launched_at && (
                          <span className="flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            Launched {new Date(feature.launched_at).toLocaleDateString()}
                            {daysSinceLaunch !== null && ` (${daysSinceLaunch} days ago)`}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {feature.success_rating && renderStars(feature.success_rating)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Action Buttons */}
                  {(needsMetricsCollection || needsRetrospective) && (
                    <div className="flex gap-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      {needsMetricsCollection && (
                        <Button
                          size="sm"
                          onClick={() => handleCollectMetrics(feature.id)}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Collect 30-Day Metrics
                        </Button>
                      )}
                      {needsRetrospective && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedFeature(feature);
                            setShowRetrospectiveDialog(true);
                          }}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Add Retrospective
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Metrics Grid */}
                  {hasPostMetrics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Sentiment Impact</p>
                        {renderMetricChange(
                          feature.post_sentiment_avg,
                          feature.pre_sentiment_avg,
                          'sentiment'
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Churn Impact</p>
                        {renderMetricChange(
                          feature.pre_churn_rate, // Reversed because lower is better
                          feature.post_churn_rate,
                          'percent'
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Feedback Volume</p>
                        {renderMetricChange(
                          feature.post_feedback_volume_weekly,
                          feature.pre_feedback_volume_weekly,
                          'number'
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Adoption Rate</p>
                        {feature.post_adoption_rate ? (
                          <p className="text-sm font-medium">
                            {(feature.post_adoption_rate * 100).toFixed(1)}%
                          </p>
                        ) : (
                          <span className="text-muted-foreground text-sm">No data</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Effort Tracking */}
                  {feature.effort_estimate && (
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-muted-foreground">Estimated: </span>
                        <span className="font-medium capitalize">{feature.effort_estimate.replace('_', ' ')}</span>
                      </div>
                      {feature.actual_effort_days && (
                        <div>
                          <span className="text-muted-foreground">Actual: </span>
                          <span className="font-medium">{feature.actual_effort_days} days</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lessons Learned */}
                  {feature.lessons_learned && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Lessons Learned</p>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        {feature.lessons_learned}
                      </p>
                    </div>
                  )}

                  {/* Revenue Impact */}
                  {feature.revenue_impact_estimate && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Revenue Impact</p>
                      <p className="text-lg font-semibold text-green-600">
                        ${feature.revenue_impact_estimate.toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Retrospective Dialog */}
      <Dialog open={showRetrospectiveDialog} onOpenChange={setShowRetrospectiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feature Retrospective</DialogTitle>
            <DialogDescription>
              Record your learnings from {selectedFeature?.feature_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Success Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setSuccessRating(rating)}
                    className="p-2 hover:bg-muted rounded"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        rating <= successRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lessons">Lessons Learned *</Label>
              <Textarea
                id="lessons"
                placeholder="What went well? What could be improved?"
                value={lessonsLearned}
                onChange={(e) => setLessonsLearned(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenue">Revenue Impact ($)</Label>
              <Input
                id="revenue"
                type="number"
                placeholder="0"
                value={revenueImpact}
                onChange={(e) => setRevenueImpact(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRetrospectiveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRetrospective}>Save Retrospective</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
