'use client';

/**
 * AI Reasoning Page
 * Feature F: Gen 3
 * 
 * Main entry point for AI Reasoning dashboard
 * Shows project selector if needed
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Brain,
  Filter,
  Search,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Sparkles,
  BarChart3,
  TrendingUp,
  Folder,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createBrowserClient } from '@supabase/ssr';
import { ReasoningDrawer } from '@/components/reasoning/ReasoningDrawer';
import { ReasoningTrace, ReasoningFeature } from '@/types/reasoning';

const FEATURE_LABELS: Record<ReasoningFeature, string> = {
  devils_advocate: "Devil's Advocate",
  prediction: 'Feature Prediction',
  prioritization: 'Priority Scoring',
  classification: 'Classification',
  sentiment_analysis: 'Sentiment Analysis',
  theme_detection: 'Theme Detection',
  spec_writer: 'Spec Writer',
  roadmap_suggestion: 'Roadmap Suggestion',
  competitive_intel: 'Competitive Intel',
  anomaly_detection: 'Anomaly Detection',
  churn_prediction: 'Churn Prediction',
  impact_simulation: 'Impact Simulation',
  stakeholder_response: 'Stakeholder Response',
};

const FEATURE_COLORS: Record<ReasoningFeature, string> = {
  devils_advocate: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  prediction: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  prioritization: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  classification: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  sentiment_analysis: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  theme_detection: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  spec_writer: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  roadmap_suggestion: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  competitive_intel: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  anomaly_detection: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  churn_prediction: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  impact_simulation: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  stakeholder_response: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

interface Project {
  id: string;
  name: string;
  slug: string;
}

function AIReasoningContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('projectId');

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(projectId || '');
  const [traces, setTraces] = useState<ReasoningTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrace, setSelectedTrace] = useState<ReasoningTrace | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchTraces();
    }
  }, [selectedProject, selectedFeature]);

  async function fetchProjects() {
    setLoadingProjects(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, slug')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setProjects(data);
        if (!selectedProject && data.length > 0) {
          setSelectedProject(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  }

  async function fetchTraces() {
    if (!selectedProject) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({ projectId: selectedProject });
      if (selectedFeature !== 'all') {
        params.append('feature', selectedFeature);
      }
      
      const response = await fetch(`/api/reasoning?${params}`);
      const data = await response.json();
      setTraces(data.traces || []);
    } catch (error) {
      console.error('Failed to fetch traces:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTraces = traces.filter((trace) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        trace.decision_summary.toLowerCase().includes(query) ||
        trace.decision_type.toLowerCase().includes(query) ||
        trace.feature.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Calculate stats
  const stats = {
    total: traces.length,
    avgConfidence: traces.length > 0
      ? traces.reduce((acc, t) => acc + (t.outputs.confidence || 0), 0) / traces.length
      : 0,
    avgLatency: traces.length > 0
      ? traces.reduce((acc, t) => acc + (t.metadata.latency_ms || 0), 0) / traces.length
      : 0,
    byFeature: traces.reduce((acc, t) => {
      acc[t.feature] = (acc[t.feature] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  }

  function openTraceDetails(trace: ReasoningTrace) {
    setSelectedTrace(trace);
    setDrawerOpen(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-slate-950 dark:to-purple-950/30">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                AI Reasoning Layer
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Transparent AI decision-making - see why AI made each recommendation
              </p>
            </div>
          </div>
        </div>

        {/* Project Selector */}
        <div className="mb-6">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[300px] bg-white dark:bg-slate-900">
              <Folder className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {loadingProjects ? (
                <SelectItem value="loading" disabled>Loading projects...</SelectItem>
              ) : projects.length === 0 ? (
                <SelectItem value="none" disabled>No projects found</SelectItem>
              ) : (
                projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-slate-500">Total Decisions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{(stats.avgConfidence * 100).toFixed(0)}%</p>
                  <p className="text-sm text-slate-500">Avg Confidence</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgLatency.toFixed(0)}ms</p>
                  <p className="text-sm text-slate-500">Avg Latency</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Object.keys(stats.byFeature).length}</p>
                  <p className="text-sm text-slate-500">AI Features</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search decisions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-900"
            />
          </div>
          <Select value={selectedFeature} onValueChange={setSelectedFeature}>
            <SelectTrigger className="w-[200px] bg-white dark:bg-slate-900">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by feature" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Features</SelectItem>
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Traces List */}
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur">
          <CardHeader>
            <CardTitle>AI Decision History</CardTitle>
            <CardDescription>
              Click on any decision to see the full reasoning process
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedProject ? (
              <div className="text-center py-12">
                <Folder className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <h3 className="font-medium text-slate-700 dark:text-slate-300">
                  Select a Project
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  Choose a project above to view AI reasoning traces.
                </p>
              </div>
            ) : loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredTraces.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <h3 className="font-medium text-slate-700 dark:text-slate-300">
                  No AI Decisions Yet
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  AI reasoning will appear here as you use SignalsLoop's AI features.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTraces.map((trace, index) => (
                  <motion.div
                    key={trace.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => openTraceDetails(trace)}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-slate-800/50 cursor-pointer transition-all hover:shadow-md group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={FEATURE_COLORS[trace.feature]}>
                            {FEATURE_LABELS[trace.feature]}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {trace.decision_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {trace.decision_summary}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(trace.created_at).toLocaleString()}
                          </span>
                          <span className={`flex items-center gap-1 ${getConfidenceColor(trace.outputs.confidence)}`}>
                            {trace.outputs.confidence >= 0.8 ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            {Math.round(trace.outputs.confidence * 100)}% confidence
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {trace.reasoning_steps.length} steps
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-500 transition-colors" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reasoning Drawer */}
      {selectedTrace && (
        <ReasoningDrawer
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedTrace(null);
          }}
          entityType={selectedTrace.entity_type || selectedTrace.feature}
          entityId={selectedTrace.entity_id || selectedTrace.id}
          feature={selectedTrace.feature}
        />
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-slate-950 dark:to-purple-950/30">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 w-[300px] mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

export default function AIReasoningPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AIReasoningContent />
    </Suspense>
  );
}
