'use client';

/**
 * Weekly Insight Report Card
 *
 * Displays AI-generated strategic insights powered by Claude Sonnet 4
 * Premium feature in the Hybrid AI strategy
 *
 * Shows:
 * - Executive summary
 * - Key insights with impact levels
 * - Biggest wins and critical issues
 * - Emerging trends
 * - Prioritized recommended actions
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Lightbulb,
  Target,
  RefreshCw,
  Calendar,
  Sparkles,
  Award,
  AlertTriangle,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface KeyInsight {
  insight: string;
  category: string;
  impact: 'high' | 'medium' | 'low';
  supportingData: any;
  recommendation: string;
}

interface RecommendedAction {
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
}

interface InsightReport {
  id: string;
  periodStart: string;
  periodEnd: string;
  executiveSummary: string;
  keyInsights: KeyInsight[];
  biggestWins: string[];
  criticalIssues: string[];
  emergingTrends: string[];
  recommendedActions: RecommendedAction[];
  forecastedSentiment: number;
  churnRiskAlerts: number;
  totalFeedbackAnalyzed: number;
  sentimentTrend: 'improving' | 'declining' | 'stable';
  model: string;
  generationTime: number;
  tokenUsage: {
    input: number;
    output: number;
  };
  createdAt: string;
  isRead: boolean;
}

interface Props {
  projectId: string;
}

export function InsightReportCard({ projectId }: Props) {
  const [report, setReport] = useState<InsightReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('summary');

  useEffect(() => {
    fetchReport();
  }, [projectId]);

  async function fetchReport() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/insights/weekly?projectId=${projectId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch report');
      }

      setReport(data.report);
    } catch (err) {
      console.error('Error fetching report:', err);
      setError('Failed to load weekly insights');
    } finally {
      setIsLoading(false);
    }
  }

  async function generateReport() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/insights/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate report');
      }

      await fetchReport();
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate insights. Ensure you have sufficient feedback data.');
    } finally {
      setIsGenerating(false);
    }
  }

  function getImpactColor(impact: string): string {
    switch (impact) {
      case 'high':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  }

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-slate-600 text-white';
    }
  }

  function getTrendIcon(trend: string) {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      default:
        return <span className="h-4 w-4 text-slate-400">→</span>;
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  if (isLoading) {
    return (
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Weekly Strategic Insights
          </CardTitle>
          <CardDescription>AI-powered analysis by Claude Sonnet 4</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-4 border-purple-500/30 bg-gradient-to-br from-slate-900 to-purple-950/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Weekly Strategic Insights
              <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-800">
                <Sparkles className="h-3 w-3 mr-1" />
                Claude Sonnet 4
              </Badge>
            </CardTitle>
            <CardDescription>
              {report
                ? `${formatDate(report.periodStart)} - ${formatDate(report.periodEnd)} • ${report.totalFeedbackAnalyzed} feedback items analyzed`
                : 'AI-powered strategic analysis of your weekly feedback'}
            </CardDescription>
          </div>
          <Button
            onClick={generateReport}
            disabled={isGenerating}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {report ? 'Regenerate' : 'Generate Insights'}
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

        {!report && !error && (
          <div className="text-center py-12">
            <Brain className="h-16 w-16 text-purple-400/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No weekly insights yet
            </h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Generate your first weekly insights report to get strategic analysis,
              actionable recommendations, and trend forecasts powered by Claude Sonnet 4.
            </p>
            <Button onClick={generateReport} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Weekly Insights
            </Button>
          </div>
        )}

        {report && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div className="p-5 bg-slate-800/50 rounded-lg border border-purple-500/30 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-purple-400" />
                <h3 className="font-semibold text-lg text-white">Executive Summary</h3>
                <div className="ml-auto flex items-center gap-2">
                  {getTrendIcon(report.sentimentTrend)}
                  <span className="text-sm text-slate-400 capitalize">{report.sentimentTrend}</span>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed">{report.executiveSummary}</p>
            </div>

            {/* Tabs for detailed sections */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">
                  <Eye className="h-4 w-4 mr-2" />
                  Insights
                </TabsTrigger>
                <TabsTrigger value="wins">
                  <Award className="h-4 w-4 mr-2" />
                  Wins & Issues
                </TabsTrigger>
                <TabsTrigger value="trends">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Trends
                </TabsTrigger>
                <TabsTrigger value="actions">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Actions
                </TabsTrigger>
              </TabsList>

              {/* Key Insights Tab */}
              <TabsContent value="summary" className="mt-4 space-y-3">
                {report.keyInsights && report.keyInsights.length > 0 ? (
                  report.keyInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${getImpactColor(insight.impact)}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs border-slate-600">
                              {insight.category}
                            </Badge>
                            <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                              {insight.impact} impact
                            </Badge>
                          </div>
                          <p className="font-medium text-white">{insight.insight}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 mt-2">
                        <span className="font-medium text-slate-200">Recommendation:</span> {insight.recommendation}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-8">No key insights available</p>
                )}
              </TabsContent>

              {/* Wins & Issues Tab */}
              <TabsContent value="wins" className="mt-4 space-y-4">
                {/* Biggest Wins */}
                <div>
                  <h4 className="flex items-center gap-2 font-semibold mb-3 text-green-400">
                    <Award className="h-4 w-4" />
                    Biggest Wins
                  </h4>
                  {report.biggestWins && report.biggestWins.length > 0 ? (
                    <ul className="space-y-2">
                      {report.biggestWins.map((win, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-slate-300">{win}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-sm">No wins identified this week</p>
                  )}
                </div>

                {/* Critical Issues */}
                <div>
                  <h4 className="flex items-center gap-2 font-semibold mb-3 text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    Critical Issues
                  </h4>
                  {report.criticalIssues && report.criticalIssues.length > 0 ? (
                    <ul className="space-y-2">
                      {report.criticalIssues.map((issue, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded"
                        >
                          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-slate-300">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-sm">No critical issues identified</p>
                  )}
                </div>
              </TabsContent>

              {/* Emerging Trends Tab */}
              <TabsContent value="trends" className="mt-4">
                {report.emergingTrends && report.emergingTrends.length > 0 ? (
                  <ul className="space-y-3">
                    {report.emergingTrends.map((trend, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg"
                      >
                        <Lightbulb className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-300">{trend}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 text-center py-8">No emerging trends detected</p>
                )}
              </TabsContent>

              {/* Recommended Actions Tab */}
              <TabsContent value="actions" className="mt-4">
                {report.recommendedActions && report.recommendedActions.length > 0 ? (
                  <div className="space-y-3">
                    {report.recommendedActions
                      .sort((a, b) => {
                        const priorities = { critical: 0, high: 1, medium: 2, low: 3 };
                        return priorities[a.priority] - priorities[b.priority];
                      })
                      .map((action, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <Badge className={getPriorityColor(action.priority)}>
                            {action.priority}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-white font-medium">{action.action}</p>
                            <div className="flex gap-3 mt-2 text-xs text-slate-400">
                              <span>
                                <span className="font-medium text-slate-300">Effort:</span> {action.effort}
                              </span>
                              <span>•</span>
                              <span>
                                <span className="font-medium text-slate-300">Impact:</span> {action.impact}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">No actions recommended</p>
                )}
              </TabsContent>
            </Tabs>

            {/* Footer metadata */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-700 text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Generated {formatDate(report.createdAt)}
                </span>
                <span>•</span>
                <span>{report.model}</span>
                <span>•</span>
                <span>{(report.generationTime / 1000).toFixed(1)}s</span>
              </div>
              {report.churnRiskAlerts > 0 && (
                <Badge variant="destructive">
                  {report.churnRiskAlerts} churn risk alert{report.churnRiskAlerts > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
