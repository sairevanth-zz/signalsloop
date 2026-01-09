'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, Download, Send, RefreshCw, Play, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { CallMetricsCards } from './CallMetricsCards';
import { CallRecordsTable } from './CallRecordsTable';
import { FeatureHeatmap } from './FeatureHeatmap';
import { IngestDialog } from './IngestDialog';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface CallSummary {
  total_calls: number;
  analyzed_calls: number;
  pending_processing: boolean;
  expansion_revenue: number;
  churn_risk_revenue: number;
  avg_sentiment: number;
  top_objections: Array<{ type: string; count: number; severity?: string }>;
  top_competitors: Array<{ name: string; mentions: number }>;
  feature_frequency: Array<{ title: string; count: number; total_arr?: number }>;
  top_insights: string[];
}

export function CallsDashboard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<CallSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIngestDialog, setShowIngestDialog] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ completed: 0, total: 0, remaining: 0 });

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    if (!supabase) return;

    try {
      setLoading(true);

      // Load project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, slug')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Load summary
      const response = await fetch(`/api/calls/summary?projectId=${projectId}`);
      if (!response.ok) throw new Error('Failed to load summary');

      const data = await response.json();
      setSummary(data.summary);

      // Update analysis progress from summary
      if (data.summary) {
        const pending = data.summary.total_calls - data.summary.analyzed_calls;
        setAnalysisProgress({
          completed: data.summary.analyzed_calls,
          total: data.summary.total_calls,
          remaining: pending,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Analyze calls function
  const analyzeNextBatch = useCallback(async () => {
    try {
      const response = await fetch('/api/calls/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, limit: 5 }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const data = await response.json();

      // Update progress
      setAnalysisProgress(prev => ({
        completed: prev.total - data.remaining,
        total: prev.total,
        remaining: data.remaining,
      }));

      return data;
    } catch (error) {
      console.error('Analysis error:', error);
      throw error;
    }
  }, [projectId]);

  async function handleAnalyze() {
    if (analyzing) return;

    setAnalyzing(true);
    toast.info('Starting call analysis...');

    try {
      let remaining = analysisProgress.remaining;

      while (remaining > 0) {
        const result = await analyzeNextBatch();
        remaining = result.remaining;

        if (result.analyzed > 0) {
          toast.success(`Analyzed ${result.analyzed} call(s). ${remaining} remaining.`);
        }

        // Small delay between batches
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      toast.success('All calls analyzed successfully!');
      loadData(); // Refresh data
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleExport(format: 'pdf' | 'md') {
    setExporting(true);
    try {
      const response = await fetch(`/api/calls/export?projectId=${projectId}&format=${format}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call-audit-${project?.slug}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  async function handleSlackShare() {
    try {
      const response = await fetch('/api/calls/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, channel: 'slack' }),
      });

      if (!response.ok) throw new Error('Failed to share');

      alert('Call audit summary shared to Slack!');
    } catch (error) {
      console.error('Share error:', error);
      alert('Failed to share. Please check your Slack integration.');
    }
  }

  // Calculate estimated time
  const estimatedSeconds = analysisProgress.remaining * 3; // ~3 seconds per call
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!project || !summary) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Data</CardTitle>
            <CardDescription>Failed to load call intelligence data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/app/calls')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasPendingCalls = analysisProgress.remaining > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href={`/${project.slug}/dashboard`}>
              <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">Call Intelligence Dashboard</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => loadData()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowIngestDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Ingest Calls
            </Button>
          </div>
        </div>

        {/* Analysis Progress Banner */}
        {hasPendingCalls && (
          <div className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {analyzing ? (
                  <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">!</span>
                  </div>
                )}
                <div>
                  <p className="text-blue-900 dark:text-blue-100 font-medium">
                    {analyzing
                      ? `Analyzing calls... ${analysisProgress.completed}/${analysisProgress.total} complete`
                      : `${analysisProgress.remaining} call(s) pending analysis`
                    }
                  </p>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    {analyzing
                      ? `~${estimatedMinutes} minute${estimatedMinutes !== 1 ? 's' : ''} remaining`
                      : `Estimated time: ~${estimatedMinutes} minute${estimatedMinutes !== 1 ? 's' : ''}`
                    }
                  </p>
                </div>
              </div>
              {!analyzing && (
                <Button onClick={handleAnalyze} className="bg-blue-600 hover:bg-blue-700">
                  <Play className="w-4 h-4 mr-2" />
                  Start Analysis
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            {analyzing && (
              <div className="mt-3">
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(analysisProgress.completed / analysisProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <CallMetricsCards summary={summary} />

      {/* Top Insights */}
      {summary.top_insights.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Top Insights</CardTitle>
            <CardDescription>Key findings from call analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {summary.top_insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Feature Heatmap */}
      {summary.feature_frequency.length > 0 && (
        <FeatureHeatmap features={summary.feature_frequency} />
      )}

      {/* Call Records Table */}
      <CallRecordsTable projectId={projectId} />

      {/* Export Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Export & Share</CardTitle>
          <CardDescription>Download reports or share insights with your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleExport('pdf')}
              disabled={exporting}
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('md')}
              disabled={exporting}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Markdown
            </Button>
            <Button variant="outline" onClick={handleSlackShare}>
              <Send className="w-4 h-4 mr-2" />
              Share to Slack
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ingest Dialog */}
      {showIngestDialog && (
        <IngestDialog
          projectId={projectId}
          onClose={() => setShowIngestDialog(false)}
          onSuccess={() => {
            setShowIngestDialog(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

