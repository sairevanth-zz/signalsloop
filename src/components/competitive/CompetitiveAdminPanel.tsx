'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Loader2,
  CheckCircle,
  AlertCircle,
  Zap,
  Target,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';

interface CompetitiveAdminPanelProps {
  projectId: string;
  onDataExtracted?: () => void;
}

export function CompetitiveAdminPanel({ projectId, onDataExtracted }: CompetitiveAdminPanelProps) {
  const [extracting, setExtracting] = useState(false);
  const [detectingGaps, setDetectingGaps] = useState(false);
  const [generatingRecs, setGeneratingRecs] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending count on mount
  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const res = await fetch(`/api/competitive/extract?projectId=${projectId}`);
        const data = await res.json();
        if (data.success && data.pendingCount !== undefined) {
          setPendingCount(data.pendingCount);
        }
      } catch (error) {
        console.error('Error fetching pending count:', error);
      }
    }
    if (projectId) {
      fetchPendingCount();
    }
  }, [projectId]);

  const handleExtractCompetitors = async () => {
    try {
      setExtracting(true);
      toast.info('Scanning feedback for competitor mentions...');

      const res = await fetch('/api/competitive/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, limit: 50 }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(
          `✓ Extracted ${result.mentionsFound} competitor mentions from ${result.processed} feedback items`
        );
        setPendingCount(Math.max(0, pendingCount - (result.processed || 0)));
        if (onDataExtracted) onDataExtracted();
      } else {
        toast.error(result.error || 'Failed to extract competitors');
      }
    } catch (error) {
      console.error('Error extracting competitors:', error);
      toast.error('Failed to extract competitors');
    } finally {
      setExtracting(false);
    }
  };

  const handleDetectFeatureGaps = async () => {
    try {
      setDetectingGaps(true);
      toast.info('Analyzing competitive mentions for feature gaps...');

      const res = await fetch('/api/competitive/feature-gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(`✓ Detected ${result.gapsDetected} feature gaps`);
        if (onDataExtracted) onDataExtracted();
      } else {
        toast.error(result.error || 'Failed to detect feature gaps');
      }
    } catch (error) {
      console.error('Error detecting feature gaps:', error);
      toast.error('Failed to detect feature gaps');
    } finally {
      setDetectingGaps(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    try {
      setGeneratingRecs(true);
      toast.info('Generating strategic recommendations...');

      const res = await fetch('/api/competitive/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(`✓ Generated ${result.recommendationsGenerated} strategic recommendations`);
        if (onDataExtracted) onDataExtracted();
      } else {
        toast.error(result.error || 'Failed to generate recommendations');
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error('Failed to generate recommendations');
    } finally {
      setGeneratingRecs(false);
    }
  };

  return (
    <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800 p-6">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Tools</h3>
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-400">
              Manual Trigger
            </Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manually trigger AI analysis on your existing feedback. These actions normally run automatically in the background.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Extract Competitors */}
          <Card className="p-4 bg-white dark:bg-slate-800">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">Extract Competitors</h4>
                  {pendingCount > 0 && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] h-4 px-1.5">
                      {pendingCount} pending
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Scan feedback for competitor mentions using GPT-4o-mini
                </p>
              </div>
            </div>
            <Button
              onClick={handleExtractCompetitors}
              disabled={extracting || pendingCount === 0}
              size="sm"
              className="w-full"
              variant="outline"
            >
              {extracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : pendingCount === 0 ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  All Processed
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Extraction
                </>
              )}
            </Button>
          </Card>

          {/* Detect Feature Gaps */}
          <Card className="p-4 bg-white">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 text-sm mb-1">Detect Feature Gaps</h4>
                <p className="text-xs text-gray-600">
                  Cluster mentions into feature gaps with priority scores
                </p>
              </div>
            </div>
            <Button
              onClick={handleDetectFeatureGaps}
              disabled={detectingGaps}
              size="sm"
              className="w-full"
              variant="outline"
            >
              {detectingGaps ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Detection
                </>
              )}
            </Button>
          </Card>

          {/* Generate Recommendations */}
          <Card className="p-4 bg-white">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 text-sm mb-1">Strategic Recommendations</h4>
                <p className="text-xs text-gray-600">
                  Generate ATTACK/DEFEND/REACT action items
                </p>
              </div>
            </div>
            <Button
              onClick={handleGenerateRecommendations}
              disabled={generatingRecs}
              size="sm"
              className="w-full"
              variant="outline"
            >
              {generatingRecs ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </Card>
        </div>

        <div className="bg-white border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-gray-600">
            <strong className="text-gray-900">How it works:</strong> These tools extract competitive intelligence from your existing feedback.
            Run "Extract Competitors" first, then "Detect Feature Gaps", and finally "Strategic Recommendations" for the full analysis.
          </p>
        </div>
      </div>
    </Card>
  );
}
