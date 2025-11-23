'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flask, Plus, TrendingUp, CheckCircle, Clock, Play } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';

interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  status: 'draft' | 'ready' | 'running' | 'paused' | 'completed' | 'cancelled';
  experiment_type: string;
  primary_metric: string;
  sample_size_target: number;
  created_at: string;
  start_date?: string;
  ai_generated: boolean;
}

interface ExperimentWithStats {
  experiment: Experiment;
  result_count: number;
  significant_results: number;
  learning_count: number;
}

export default function ExperimentsPage() {
  const params = useParams();
  const router = useRouter();
  const projectSlug = params.slug as string;
  const [experiments, setExperiments] = useState<ExperimentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Fix hydration by ensuring initial client render matches server
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get project ID
  useEffect(() => {
    if (!mounted) return;

    const fetchProject = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data } = await supabase
        .from('projects')
        .select('id')
        .eq('slug', projectSlug)
        .single();

      if (data) {
        setProjectId(data.id);
      }
    };

    fetchProject();
  }, [projectSlug, mounted]);

  // Fetch experiments
  useEffect(() => {
    if (!projectId) return;

    const fetchExperiments = async () => {
      try {
        const url = filter === 'all'
          ? `/api/experiments?projectId=${projectId}`
          : `/api/experiments?projectId=${projectId}&status=${filter}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.experiments) {
          setExperiments(data.experiments);
        }
      } catch (error) {
        console.error('Error fetching experiments:', error);
        toast.error('Failed to load experiments');
      } finally {
        setLoading(false);
      }
    };

    fetchExperiments();
  }, [projectId, filter]);

  const stats = {
    total: experiments.length,
    running: experiments.filter((e) => e.experiment.status === 'running').length,
    completed: experiments.filter((e) => e.experiment.status === 'completed').length,
    significant: experiments.reduce((sum, e) => sum + e.significant_results, 0),
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    ready: 'bg-blue-100 text-blue-800',
    running: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading experiments...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Flask className="h-8 w-8" />
            Experimentation Intelligence
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered experiment design and automated tracking
          </p>
        </div>
        <Button onClick={() => router.push(`/${projectSlug}/experiments/new`)}>
          <Plus className="h-4 w-4 mr-2" />
          New Experiment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Experiments</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <Flask className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Running</p>
              <p className="text-3xl font-bold mt-1">{stats.running}</p>
            </div>
            <Play className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-3xl font-bold mt-1">{stats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Significant Results</p>
              <p className="text-3xl font-bold mt-1">{stats.significant}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'draft', 'running', 'completed'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Experiments List */}
      {experiments.length === 0 ? (
        <Card className="p-12 text-center">
          <Flask className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No experiments yet</h3>
          <p className="text-muted-foreground mb-4">
            Use AI to design rigorous experiments and track results automatically
          </p>
          <Button onClick={() => router.push(`/${projectSlug}/experiments/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Experiment
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {experiments.map(({ experiment, result_count, significant_results, learning_count }) => (
            <Card
              key={experiment.id}
              className="p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/${projectSlug}/experiments/${experiment.id}`)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{experiment.name}</h3>
                    <Badge className={statusColors[experiment.status]}>
                      {experiment.status}
                    </Badge>
                    {experiment.ai_generated && (
                      <Badge variant="outline" className="text-xs">
                        ✨ AI Generated
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {experiment.hypothesis}
                  </p>

                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-muted-foreground">Primary Metric</p>
                      <p className="font-semibold">{experiment.primary_metric}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sample Size</p>
                      <p className="font-semibold">{experiment.sample_size_target?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Results</p>
                      <p className="font-semibold">
                        {result_count} ({significant_results} significant)
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Learnings</p>
                      <p className="font-semibold">{learning_count}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(experiment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
