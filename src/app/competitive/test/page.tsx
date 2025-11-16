/**
 * Competitive Intelligence Test/Debug Page
 * Use this to check status and manually trigger extraction
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Play } from 'lucide-react';

export default function CompetitiveTestPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<any>(null);

  const checkStatus = async () => {
    setLoading(true);
    try {
      // Get project ID from localStorage
      const projectId = localStorage.getItem('currentProjectId');

      if (!projectId) {
        alert('No project ID found. Please select a project first.');
        setLoading(false);
        return;
      }

      // Check for discovered feedback
      const feedbackRes = await fetch(`/api/hunter/feed?projectId=${projectId}&limit=5`);
      const feedbackData = await feedbackRes.json();

      // Check for competitors
      const competitorsRes = await fetch(`/api/competitive/competitors?projectId=${projectId}`);
      const competitorsData = await competitorsRes.json();

      // Check for competitive mentions
      const overviewRes = await fetch(`/api/competitive/overview?projectId=${projectId}`);
      const overviewData = await overviewRes.json();

      setStatus({
        projectId,
        hasFeedback: feedbackData.success && feedbackData.items?.length > 0,
        feedbackCount: feedbackData.items?.length || 0,
        hasCompetitors: competitorsData.success && competitorsData.competitors?.length > 0,
        competitorsCount: competitorsData.competitors?.length || 0,
        totalMentions: overviewData.overview?.total_mentions || 0,
        overview: overviewData.overview,
      });
    } catch (error) {
      console.error('Error checking status:', error);
      alert('Error checking status. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  const triggerExtraction = async () => {
    setExtracting(true);
    setExtractionResult(null);

    try {
      const projectId = localStorage.getItem('currentProjectId');
      if (!projectId) {
        alert('No project ID found. Please select a project first.');
        setExtracting(false);
        return;
      }

      const res = await fetch('/api/competitive/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId, limit: 20 }),
      });

      const data = await res.json();
      setExtractionResult(data);

      if (data.success) {
        alert(`Extraction completed!\n\nProcessed: ${data.processed}\nMentions found: ${data.mentionsFound}\nSuccessful: ${data.successful}\nFailed: ${data.failed}`);
        // Refresh status
        setTimeout(() => checkStatus(), 1000);
      } else {
        alert(`Extraction failed: ${data.error || data.message}`);
      }
    } catch (error) {
      console.error('Error triggering extraction:', error);
      alert('Error triggering extraction. See console for details.');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Competitive Intelligence - Debug Page</h1>
        <p className="text-sm text-gray-500 mt-1">
          Check status and manually trigger competitive extraction
        </p>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">System Status</h2>
          <Button onClick={checkStatus} disabled={loading} size="sm">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              'Check Status'
            )}
          </Button>
        </div>

        {status && (
          <div className="space-y-3">
            <StatusRow
              label="Project ID"
              value={status.projectId}
              status={true}
            />
            <StatusRow
              label="Discovered Feedback"
              value={`${status.feedbackCount} items`}
              status={status.hasFeedback}
              help={!status.hasFeedback ? 'No feedback discovered yet. Run Hunter first!' : undefined}
            />
            <StatusRow
              label="Competitors Detected"
              value={`${status.competitorsCount} competitors`}
              status={status.hasCompetitors}
              help={!status.hasCompetitors ? 'No competitors extracted yet. Click "Trigger Extraction" below.' : undefined}
            />
            <StatusRow
              label="Competitive Mentions"
              value={`${status.totalMentions} mentions`}
              status={status.totalMentions > 0}
            />

            {status.overview && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Overview Stats</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Active Competitors:</span>
                    <span className="ml-2 font-medium">{status.overview.active_competitors}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Net Switches:</span>
                    <span className="ml-2 font-medium">{status.overview.net_switches}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Avg Sentiment:</span>
                    <span className="ml-2 font-medium">{status.overview.avg_sentiment_vs_competitors?.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Recent Mentions (7d):</span>
                    <span className="ml-2 font-medium">{status.overview.mentions_last_7d}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!status && (
          <p className="text-sm text-gray-500 text-center py-8">
            Click "Check Status" to see the current state
          </p>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Manual Extraction</h2>
        <p className="text-sm text-gray-600 mb-4">
          This will manually trigger the competitive extraction process. Normally this runs automatically every 30 minutes via cron.
        </p>

        <Button
          onClick={triggerExtraction}
          disabled={extracting}
          className="w-full"
        >
          {extracting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Trigger Competitive Extraction
            </>
          )}
        </Button>

        {extractionResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(extractionResult, null, 2)}
            </pre>
          </div>
        )}
      </Card>

      <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Quick Start Guide</h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>Make sure you have feedback discovered by the Hunter first</li>
          <li>Click "Check Status" above to verify you have feedback</li>
          <li>If you have feedback but no competitors, click "Trigger Extraction"</li>
          <li>Wait for extraction to complete (processes 20 feedback items per project)</li>
          <li>Go to <code className="bg-blue-100 px-1 rounded">/competitive</code> to see the dashboard</li>
        </ol>
      </Card>
    </div>
  );
}

function StatusRow({
  label,
  value,
  status,
  help
}: {
  label: string;
  value: string;
  status: boolean;
  help?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {help && <p className="text-xs text-amber-600 mt-1">{help}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{value}</span>
        {status ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-gray-300" />
        )}
      </div>
    </div>
  );
}
