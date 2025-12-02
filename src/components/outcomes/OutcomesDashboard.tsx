'use client';

/**
 * Outcomes Dashboard Component
 *
 * Main dashboard displaying feature outcomes with:
 * - Summary statistics
 * - Timeline view of outcomes
 * - Detailed outcome reports
 * - Filter by classification
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import { OutcomeCard } from './OutcomeCard';
import { OutcomeTimeline } from './OutcomeTimeline';
import { OutcomeReport } from './OutcomeReport';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';
import Link from 'next/link';
import type { FeatureOutcomeDetailed, OutcomeReport as OutcomeReportType } from '@/types/outcome-attribution';

interface OutcomesDashboardProps {
  projectId: string;
  projectSlug?: string;
}

interface OutcomeSummary {
  total: number;
  byClassification: Record<string, number>;
  successRate: number;
  averageSentimentDelta: number;
  averageVolumeDelta: number;
}

export function OutcomesDashboard({ projectId, projectSlug }: OutcomesDashboardProps) {
  const [outcomes, setOutcomes] = useState<FeatureOutcomeDetailed[]>([]);
  const [summary, setSummary] = useState<OutcomeSummary | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<FeatureOutcomeDetailed | null>(null);
  const [outcomeReport, setOutcomeReport] = useState<OutcomeReportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');

  useEffect(() => {
    fetchOutcomes();
    fetchSummary();
  }, [projectId]);

  useEffect(() => {
    if (selectedOutcome && selectedOutcome.status === 'completed') {
      fetchReport(selectedOutcome.id);
    } else {
      setOutcomeReport(null);
    }
  }, [selectedOutcome]);

  const fetchOutcomes = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        toast.error('Unable to connect to database');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('feature_outcomes_detailed')
        .select('*')
        .eq('project_id', projectId)
        .order('shipped_at', { ascending: false });

      if (error) throw error;
      setOutcomes(data || []);
    } catch (error) {
      console.error('Error fetching outcomes:', error);
      toast.error('Failed to load outcomes');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/outcomes/summary?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchReport = async (outcomeId: string) => {
    setReportLoading(true);
    try {
      const response = await fetch(`/api/outcomes/${outcomeId}/report`);
      if (response.ok) {
        const data = await response.json();
        setOutcomeReport(data.report);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setReportLoading(false);
    }
  };

  const filteredOutcomes = outcomes.filter(o => {
    if (filterClassification === 'all') return true;
    if (filterClassification === 'monitoring') return o.status === 'monitoring';
    return o.outcome_classification === filterClassification;
  });

  const monitoringCount = outcomes.filter(o => o.status === 'monitoring').length;
  const completedCount = outcomes.filter(o => o.status === 'completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feature Outcomes</h1>
          <p className="text-muted-foreground">
            Track what happens after you ship features
          </p>
        </div>
        <Button onClick={() => { fetchOutcomes(); fetchSummary(); }} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{summary.total}</p>
                  <p className="text-xs text-muted-foreground">Total Outcomes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{monitoringCount}</p>
                  <p className="text-xs text-muted-foreground">Monitoring</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {(summary.successRate * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                {summary.averageSentimentDelta > 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : summary.averageSentimentDelta < 0 ? (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                ) : (
                  <Minus className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-2xl font-bold">
                    {summary.averageSentimentDelta > 0 ? '+' : ''}
                    {(summary.averageSentimentDelta * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Sentiment Change</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {outcomes.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Outcomes Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking feature outcomes by shipping items from your roadmap.
              When you mark a feature as "completed", we'll automatically monitor
              its impact for 30 days.
            </p>
            {projectSlug && (
              <Button asChild>
                <Link href={`/app/roadmap?projectId=${projectId}`}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go to Roadmap
                </Link>
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Main Content */}
      {outcomes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - List/Timeline */}
          <div className="lg:col-span-1 space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-2">
              <Select value={filterClassification} onValueChange={setFilterClassification}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="monitoring">Monitoring</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="partial_success">Partial Success</SelectItem>
                  <SelectItem value="no_impact">No Impact</SelectItem>
                  <SelectItem value="negative_impact">Negative Impact</SelectItem>
                </SelectContent>
              </Select>

              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'cards' | 'timeline')}>
                <TabsList className="grid grid-cols-2 w-[140px]">
                  <TabsTrigger value="cards">Cards</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Outcomes List */}
            {viewMode === 'cards' ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredOutcomes.map(outcome => (
                  <OutcomeCard
                    key={outcome.id}
                    outcome={outcome}
                    onClick={() => setSelectedOutcome(outcome)}
                    className={selectedOutcome?.id === outcome.id ? 'ring-2 ring-primary' : ''}
                  />
                ))}
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto pr-2">
                <OutcomeTimeline
                  outcomes={filteredOutcomes}
                  onSelect={setSelectedOutcome}
                  selectedId={selectedOutcome?.id}
                />
              </div>
            )}
          </div>

          {/* Right Panel - Details/Report */}
          <div className="lg:col-span-2">
            {selectedOutcome ? (
              reportLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : outcomeReport ? (
                <OutcomeReport report={outcomeReport} />
              ) : (
                <Card className="p-6">
                  <div className="text-center">
                    <Clock className="w-12 h-12 mx-auto text-blue-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {selectedOutcome.theme_name}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      This feature is still being monitored. A full report will be
                      available after the 30-day monitoring period ends.
                    </p>
                    <Badge variant="secondary">
                      {Math.ceil(selectedOutcome.days_remaining || 0)} days remaining
                    </Badge>
                  </div>
                </Card>
              )
            ) : (
              <Card className="p-12">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select an outcome to view details</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
