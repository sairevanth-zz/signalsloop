'use client';

/**
 * Anomaly Alert Card
 *
 * Displays AI-detected anomalies in feedback patterns:
 * - Sentiment spikes/drops
 * - Volume surges/silences
 * - Topic emergence
 *
 * Allows users to acknowledge, investigate, or dismiss anomalies
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Lightbulb,
} from 'lucide-react';

interface Anomaly {
  id: string;
  type: 'sentiment_spike' | 'volume_spike' | 'topic_emergence' | 'silence_period';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
  metricName: string;
  expectedValue: number;
  actualValue: number;
  deviationScore: number;
  significance: number;
  summary: string;
  potentialCauses: Array<{ cause: string; likelihood: string }>;
  recommendedActions: Array<{ action: string; priority: string }>;
  affectedPostsCount: number;
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
}

interface Props {
  projectId: string;
}

export function AnomalyAlertCard({ projectId }: Props) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchAnomalies();
  }, [projectId]);

  async function fetchAnomalies() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/anomalies/detect?projectId=${projectId}&limit=5`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch anomalies');
      }

      setAnomalies(data.anomalies || []);
    } catch (err) {
      console.error('Error fetching anomalies:', err);
      setError('Failed to load anomalies');
    } finally {
      setIsLoading(false);
    }
  }

  async function runDetection() {
    setIsDetecting(true);
    setError(null);

    try {
      const response = await fetch('/api/anomalies/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          detectionType: 'all',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to run detection');
      }

      await fetchAnomalies();
    } catch (err) {
      console.error('Error running detection:', err);
      setError('Failed to run anomaly detection');
    } finally {
      setIsDetecting(false);
    }
  }

  async function updateAnomalyStatus(id: string, status: string) {
    try {
      const response = await fetch(`/api/anomalies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update anomaly');
      }

      // Refresh anomalies
      await fetchAnomalies();
    } catch (err) {
      console.error('Error updating anomaly:', err);
    }
  }

  function getAnomalyIcon(type: string) {
    switch (type) {
      case 'sentiment_spike':
        return <TrendingUp className="h-4 w-4" />;
      case 'volume_spike':
        return <MessageSquare className="h-4 w-4" />;
      case 'silence_period':
        return <TrendingDown className="h-4 w-4" />;
      case 'topic_emergence':
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  }

  function getLikelihoodColor(likelihood: string): string {
    switch (likelihood) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      default:
        return 'text-slate-400';
    }
  }

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical':
        return 'text-red-400 font-semibold';
      case 'high':
        return 'text-orange-400 font-medium';
      case 'medium':
        return 'text-yellow-400';
      default:
        return 'text-slate-400';
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function formatTypeLabel(type: string): string {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  if (isLoading) {
    return (
      <Card className="col-span-2 border-slate-700 bg-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            Anomaly Alerts
          </CardTitle>
          <CardDescription className="text-slate-400">AI-detected unusual patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2 border-slate-700 bg-slate-900" data-tour="anomaly-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Anomaly Alerts
              {anomalies.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {anomalies.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-slate-400">AI-detected unusual patterns using GPT-4o</CardDescription>
          </div>
          <Button
            onClick={runDetection}
            disabled={isDetecting}
            size="sm"
            variant="outline"
            className="border-slate-600 hover:bg-slate-800"
          >
            {isDetecting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Detect Now
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {anomalies.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <p className="text-slate-300 mb-2 font-medium">No anomalies detected</p>
            <p className="text-sm text-slate-500">
              Everything looks normal. Anomaly detection runs automatically daily.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={`border rounded-lg p-4 ${getSeverityColor(anomaly.severity)}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getAnomalyIcon(anomaly.type)}
                    <div>
                      <div className="font-medium">{formatTypeLabel(anomaly.type)}</div>
                      <div className="text-xs opacity-75">
                        Detected {formatDate(anomaly.detectedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {anomaly.severity}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {anomaly.deviationScore.toFixed(1)}σ
                    </Badge>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-sm mb-3">{anomaly.summary}</p>

                {/* Metric Details */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3 p-2 bg-slate-900/50 rounded">
                  <div>
                    <span className="opacity-75">Expected:</span>{' '}
                    <span className="font-medium">{anomaly.expectedValue.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="opacity-75">Actual:</span>{' '}
                    <span className="font-medium">{anomaly.actualValue.toFixed(2)}</span>
                  </div>
                </div>

                {/* Expandable Details */}
                {expandedId === anomaly.id ? (
                  <div className="mt-3 pt-3 border-t space-y-3">
                    {/* Potential Causes */}
                    {anomaly.potentialCauses && anomaly.potentialCauses.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">Potential Causes:</div>
                        <ul className="space-y-1">
                          {anomaly.potentialCauses.map((cause, idx) => (
                            <li key={idx} className="text-xs flex items-start gap-2">
                              <span className={getLikelihoodColor(cause.likelihood)}>
                                • {cause.likelihood.toUpperCase()}:
                              </span>
                              <span>{cause.cause}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Actions */}
                    {anomaly.recommendedActions && anomaly.recommendedActions.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">Recommended Actions:</div>
                        <ul className="space-y-1">
                          {anomaly.recommendedActions.map((action, idx) => (
                            <li key={idx} className="text-xs flex items-start gap-2">
                              <span className={getPriorityColor(action.priority)}>
                                {action.priority.toUpperCase()}:
                              </span>
                              <span>{action.action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAnomalyStatus(anomaly.id, 'investigating')}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Investigate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAnomalyStatus(anomaly.id, 'resolved')}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateAnomalyStatus(anomaly.id, 'false_positive')}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedId(anomaly.id)}
                    className="mt-2 w-full"
                  >
                    Show Details
                  </Button>
                )}

                {expandedId === anomaly.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedId(null)}
                    className="mt-2 w-full"
                  >
                    Hide Details
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
