/**
 * LiveExperimentsCard - Shows running experiments with live metrics
 * Displays synced data from LaunchDarkly/Optimizely
 */

'use client';

import React, { useState, useEffect } from 'react';
import { BentoCard } from './BentoCard';
import { Beaker, TrendingUp, Users, ExternalLink, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface ExperimentData {
  id: string;
  name: string;
  status: string;
  feature_flag_provider: string;
  feature_flag_key: string;
  last_synced_at: string | null;
  variants: {
    name: string;
    users: number;
    conversion_rate?: number;
    is_winning?: boolean;
  }[];
  primary_metric: string;
}

interface LiveExperimentsCardProps {
  projectId: string;
  projectSlug: string;
}

export function LiveExperimentsCard({ projectId, projectSlug }: LiveExperimentsCardProps) {
  const [experiments, setExperiments] = useState<ExperimentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchExperiments();
    // Refresh every 30 seconds
    const interval = setInterval(fetchExperiments, 30000);
    return () => clearInterval(interval);
  }, [projectId]);

  async function fetchExperiments() {
    try {
      const response = await fetch(`/api/experiments?project_id=${projectId}&status=running&limit=3`);
      if (response.ok) {
        const data = await response.json();
        setExperiments(data.experiments || []);
      }
    } catch (error) {
      console.error('Failed to fetch experiments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function syncExperiment(experimentId: string) {
    setSyncing(experimentId);
    try {
      const response = await fetch('/api/experiments/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experiment_id: experimentId }),
      });

      if (response.ok) {
        await fetchExperiments();
      }
    } catch (error) {
      console.error('Failed to sync experiment:', error);
    } finally {
      setSyncing(null);
    }
  }

  if (loading) {
    return (
      <BentoCard colSpan={2}>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-600" />
        </div>
      </BentoCard>
    );
  }

  if (experiments.length === 0) {
    return (
      <BentoCard colSpan={2}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-purple-400" />
            <h3 className="font-semibold text-white">Live Experiments</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Beaker className="h-12 w-12 text-slate-700 mb-3" />
            <p className="text-sm text-slate-400 mb-2">No running experiments</p>
            <div className="flex flex-col gap-2">
              <Link
                href={`/${projectSlug}/settings/integrations`}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                Configure LaunchDarkly/Optimizely →
              </Link>
              <Link
                href={`/${projectSlug}/experiments/new`}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Create your first experiment →
              </Link>
            </div>
          </div>
        </div>
      </BentoCard>
    );
  }

  return (
    <BentoCard colSpan={2}>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-purple-400" />
            <h3 className="font-semibold text-white">Live Experiments</h3>
          </div>
          <span className="rounded-full bg-purple-950/50 px-2 py-1 text-xs font-medium text-purple-300">
            {experiments.length} Running
          </span>
        </div>

        {/* Experiments List */}
        <div className="space-y-3">
          {experiments.map((exp) => (
            <div
              key={exp.id}
              className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:bg-slate-800/50"
            >
              {/* Experiment Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Link
                    href={`/${projectSlug}/experiments/${exp.id}`}
                    className="font-medium text-white hover:text-blue-400 transition-colors"
                  >
                    {exp.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">
                      {exp.feature_flag_provider}
                    </span>
                    {exp.last_synced_at && (
                      <span className="text-xs text-slate-600">
                        • Synced {new Date(exp.last_synced_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => syncExperiment(exp.id)}
                  disabled={syncing === exp.id}
                  className="p-1 rounded hover:bg-slate-700 transition-colors disabled:opacity-50"
                  title="Sync now"
                >
                  <RefreshCw className={`h-4 w-4 text-slate-400 ${syncing === exp.id ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Variants */}
              {exp.variants && exp.variants.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {exp.variants.slice(0, 2).map((variant, idx) => (
                    <div
                      key={idx}
                      className={`rounded border p-2 ${
                        variant.is_winning
                          ? 'border-green-800/50 bg-green-950/20'
                          : 'border-slate-800 bg-slate-950/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-300">{variant.name}</span>
                        {variant.is_winning && (
                          <CheckCircle className="h-3 w-3 text-green-400" />
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-slate-500" />
                          <span className="text-sm text-white">{variant.users.toLocaleString()}</span>
                        </div>
                        {variant.conversion_rate !== undefined && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-slate-500" />
                            <span className="text-sm text-white">
                              {(variant.conversion_rate * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No data yet */}
              {(!exp.variants || exp.variants.length === 0) && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <AlertCircle className="h-3 w-3" />
                  <span>Waiting for data...</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* View All Link */}
        <Link
          href={`/${projectSlug}/experiments`}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          View all experiments
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </BentoCard>
  );
}
