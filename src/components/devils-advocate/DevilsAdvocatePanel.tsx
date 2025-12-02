'use client';

/**
 * Devil's Advocate Panel
 *
 * Complete panel for displaying and managing risk alerts on a PRD/spec.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Sparkles, RefreshCw, Shield } from 'lucide-react';
import { RiskAlertCard } from './RiskAlertCard';
import { toast } from 'sonner';
import type { PRDRiskAlert } from '@/types/devils-advocate';

interface DevilsAdvocatePanelProps {
  specId: string;
  projectId: string;
}

export function DevilsAdvocatePanel({ specId, projectId }: DevilsAdvocatePanelProps) {
  const [alerts, setAlerts] = useState<PRDRiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open'>('all');

  useEffect(() => {
    fetchAlerts();
  }, [specId]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/devils-advocate/alerts?specId=${specId}`);
      const data = await response.json();

      if (data.success) {
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to load risk alerts');
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch('/api/devils-advocate/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec_id: specId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `Analysis complete: ${data.total_risks_found} risk${
            data.total_risks_found === 1 ? '' : 's'
          } found`
        );
        await fetchAlerts();
      } else {
        toast.error('Analysis failed');
      }
    } catch (error) {
      console.error('Error running analysis:', error);
      toast.error('Failed to run analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const updateAlertStatus = async (
    alertId: string,
    status: 'acknowledged' | 'resolved' | 'dismissed'
  ) => {
    try {
      const response = await fetch(`/api/devils-advocate/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Alert ${status}`);
        await fetchAlerts();
      } else {
        toast.error('Failed to update alert');
      }
    } catch (error) {
      console.error('Error updating alert:', error);
      toast.error('Failed to update alert');
    }
  };

  const filteredAlerts = filterStatus === 'all'
    ? alerts
    : alerts.filter((a) => a.status === 'open');

  const openAlertsCount = alerts.filter((a) => a.status === 'open').length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && a.status === 'open').length;
  const highCount = alerts.filter((a) => a.severity === 'high' && a.status === 'open').length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading risk analysis...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Devil's Advocate Analysis</CardTitle>
                <CardDescription className="mt-1">
                  Adversarial AI agent that challenges this PRD with competitive intelligence
                  and internal data
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={runAnalysis}
              disabled={analyzing}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Summary */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{openAlertsCount}</p>
                  <p className="text-xs text-muted-foreground">Open Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{criticalCount}</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{highCount}</p>
                  <p className="text-xs text-muted-foreground">High Priority</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <TabsList>
              <TabsTrigger value="all">
                All Alerts ({alerts.length})
              </TabsTrigger>
              <TabsTrigger value="open">
                Open ({openAlertsCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {alerts.length === 0 ? 'No Analysis Yet' : 'No Open Alerts'}
              </h3>
              <p className="text-muted-foreground">
                {alerts.length === 0
                  ? 'Click "Run Analysis" to have the Devil\'s Advocate review this PRD'
                  : 'All risk alerts have been addressed'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <RiskAlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={(id) => updateAlertStatus(id, 'acknowledged')}
                  onResolve={(id) => updateAlertStatus(id, 'resolved')}
                  onDismiss={(id) => updateAlertStatus(id, 'dismissed')}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
