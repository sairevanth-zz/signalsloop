'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, Download, Send, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { CallMetricsCards } from './CallMetricsCards';
import { CallRecordsTable } from './CallRecordsTable';
import { FeatureHeatmap } from './FeatureHeatmap';
import { IngestDialog } from './IngestDialog';

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
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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

        {summary.pending_processing && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 text-sm">
              ⏳ Call analysis in progress. Refresh to see updated results.
            </p>
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
                  <span className="text-gray-700">{insight}</span>
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
