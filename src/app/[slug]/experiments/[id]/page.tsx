'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Pause, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Experiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  status: string;
  primary_metric: string;
  secondary_metrics: string[];
  control_description: string;
  treatment_description: string;
  sample_size_target: number;
  minimum_detectable_effect: number;
  created_at: string;
}

export default function ExperimentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const experimentId = params.id as string;
  const projectSlug = params.slug as string;
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, fetch experiment details
    // For now, showing placeholder
    setLoading(false);
  }, [experimentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading experiment...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/${projectSlug}/experiments`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Experiments
      </Button>

      <Card className="p-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Experiment Details</h2>
        <p className="text-muted-foreground mb-4">
          Experiment ID: {experimentId}
        </p>
        <p className="text-sm text-muted-foreground">
          Full experiment details, results dashboard, and learnings will be displayed here.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          This page will include:
        </p>
        <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
          <li>Real-time results with statistical significance indicators</li>
          <li>Control vs Treatment performance charts</li>
          <li>Progress towards sample size goal</li>
          <li>Extracted learnings and insights</li>
          <li>Actions: Start, Pause, Complete experiment</li>
        </ul>
      </Card>
    </div>
  );
}
