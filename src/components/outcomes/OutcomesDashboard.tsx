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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Rocket,
  Target,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Info,
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

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
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
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Percentage of completed outcomes classified as "Success" or "Partial Success".
                  {summary.total === 0 && " Starting at 0% is normal - ship features to build your track record!"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

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
        <div className="space-y-6">
          {/* Hero Section */}
          <Card className="relative overflow-hidden border-2 border-dashed">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 opacity-50" />
            <CardContent className="relative p-12">
              <div className="text-center max-w-2xl mx-auto">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 mb-4">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Track What Happens After You Ship
                </h3>
                <p className="text-muted-foreground text-lg mb-6">
                  Stop guessing if your features worked. Get AI-powered insights on every launch.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button asChild size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    <Link href={`/app/roadmap?projectId=${projectId}`}>
                      <Rocket className="w-4 h-4 mr-2" />
                      Go to Roadmap
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <a href="https://docs.signalsloop.com/outcomes" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Learn More
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                How Outcome Attribution Works
              </CardTitle>
              <CardDescription>
                Automatic 30-day monitoring with GPT-4o powered analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Step 1 */}
                <div className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mb-3 ring-4 ring-green-50">
                      <Rocket className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="font-semibold mb-2">1. Ship a Feature</h4>
                    <p className="text-sm text-muted-foreground">
                      Mark a roadmap item as "completed" - we capture baseline metrics automatically
                    </p>
                  </div>
                  <div className="hidden md:block absolute top-6 -right-3 text-muted-foreground">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-3 ring-4 ring-blue-50">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="font-semibold mb-2">2. Monitor Impact</h4>
                    <p className="text-sm text-muted-foreground">
                      Track sentiment and feedback volume changes for 30 days post-launch
                    </p>
                  </div>
                  <div className="hidden md:block absolute top-6 -right-3 text-muted-foreground">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center mb-3 ring-4 ring-purple-50">
                      <Sparkles className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="font-semibold mb-2">3. AI Classification</h4>
                    <p className="text-sm text-muted-foreground">
                      GPT-4o analyzes metrics and classifies outcome with detailed reasoning
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                What You'll See
              </CardTitle>
              <CardDescription>
                Example outcome cards after you ship features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Success Example */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-green-50/50 to-emerald-50/50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-sm">Dark Mode Support</h4>
                      <p className="text-xs text-muted-foreground">Shipped 28 days ago</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      Success
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white/60 rounded p-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <TrendingUp className="w-3 h-3" />
                        Sentiment
                      </div>
                      <div className="text-sm font-semibold text-green-600">+12.5%</div>
                    </div>
                    <div className="bg-white/60 rounded p-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <TrendingDown className="w-3 h-3" />
                        Complaints
                      </div>
                      <div className="text-sm font-semibold text-green-600">-45%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex-1 bg-white/60 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }} />
                    </div>
                    <span className="text-muted-foreground">Day 30</span>
                  </div>
                </div>

                {/* Monitoring Example */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50/50 to-cyan-50/50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-sm">Email Notifications</h4>
                      <p className="text-xs text-muted-foreground">Shipped 12 days ago</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                      Monitoring
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white/60 rounded p-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <TrendingUp className="w-3 h-3" />
                        Sentiment
                      </div>
                      <div className="text-sm font-semibold text-blue-600">+5.2%</div>
                    </div>
                    <div className="bg-white/60 rounded p-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Minus className="w-3 h-3" />
                        Feedback
                      </div>
                      <div className="text-sm font-semibold text-muted-foreground">+2</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex-1 bg-white/60 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '40%' }} />
                    </div>
                    <span className="text-muted-foreground">Day 12/30</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Banner */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Info className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-purple-900 font-medium mb-1">
                    Success Rate starts at 0%
                  </p>
                  <p className="text-sm text-purple-700">
                    This is completely normal when you're starting out. As you ship features and collect
                    outcomes, you'll build a track record of what works and what doesn't. The system learns
                    from each launch to help you make better decisions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
