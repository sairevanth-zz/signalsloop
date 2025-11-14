/**
 * Platforms Dashboard Component
 * Manage platform integrations with status monitoring
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlatformBadge } from './PlatformBadge';
import {
  PlatformIntegration,
  PlatformType,
  PLATFORM_META,
  PlatformHealthStats,
} from '@/types/hunter';
import {
  Plus,
  Settings,
  Play,
  Pause,
  Trash2,
  Check,
  X,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface PlatformsDashboardProps {
  projectId: string;
  onAddPlatform?: () => void;
  className?: string;
}

export function PlatformsDashboard({
  projectId,
  onAddPlatform,
  className,
}: PlatformsDashboardProps) {
  const [integrations, setIntegrations] = useState<PlatformIntegration[]>([]);
  const [healthStats, setHealthStats] = useState<PlatformHealthStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformIntegration | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, [projectId]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/hunter/platforms?projectId=${projectId}`);
      const data = await response.json();

      if (data.success) {
        setIntegrations(data.integrations || []);
        setHealthStats(data.healthStats || []);
      }
    } catch (error) {
      console.error('[PlatformsDashboard] Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (integration: PlatformIntegration) => {
    try {
      const newStatus = integration.status === 'active' ? 'paused' : 'active';

      const response = await fetch('/api/hunter/platforms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: integration.id,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Platform ${newStatus === 'active' ? 'activated' : 'paused'}`);
        loadIntegrations();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update platform status');
    }
  };

  const handleDelete = async (integration: PlatformIntegration) => {
    if (!confirm('Are you sure you want to remove this platform?')) return;

    try {
      const response = await fetch(
        `/api/hunter/platforms?integrationId=${integration.id}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Platform removed');
        loadIntegrations();
      } else {
        toast.error(data.error || 'Failed to remove platform');
      }
    } catch (error) {
      toast.error('Failed to remove platform');
    }
  };

  const getHealthForPlatform = (platformType: PlatformType) => {
    return healthStats.find((h) => h.platform_type === platformType);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'setup':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Platform Integrations</h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage your connected platforms and monitor their health
          </p>
        </div>
        <Button onClick={onAddPlatform}>
          <Plus className="h-4 w-4 mr-2" />
          Add Platform
        </Button>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => {
          const meta = PLATFORM_META[integration.platform_type];
          const health = getHealthForPlatform(integration.platform_type);

          return (
            <Card key={integration.id} className="p-5">
              {/* Platform Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{meta.icon}</div>
                  <div>
                    <div className="font-semibold">{meta.name}</div>
                    <div
                      className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${getStatusColor(
                        integration.status
                      )}`}
                    >
                      {integration.status.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {integration.status === 'active' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(integration)}
                      title="Pause"
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(integration)}
                      title="Activate"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPlatform(integration);
                      setShowConfigDialog(true);
                    }}
                    title="Configure"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(integration)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                </div>
              </div>

              {/* Stats */}
              {health && (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Scans</span>
                    <span className="font-semibold">{health.total_scans}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-semibold">{health.success_rate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Items Found</span>
                    <span className="font-semibold">{health.total_items_found}</span>
                  </div>
                  {health.last_scan_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Last Scan</span>
                      <span className="font-semibold">
                        {new Date(health.last_scan_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {integration.last_error && (
                <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium">Last Error</div>
                      <div className="mt-1">{integration.last_error}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {health && health.success_rate < 100 && (
                <div className="mt-3">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        health.success_rate >= 80
                          ? 'bg-green-500'
                          : health.success_rate >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${health.success_rate}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {/* Empty State */}
        {integrations.length === 0 && !loading && (
          <Card className="p-12 text-center col-span-full">
            <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">No platforms configured</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Add your first platform to start discovering feedback
            </p>
            <Button onClick={onAddPlatform}>
              <Plus className="h-4 w-4 mr-2" />
              Add Platform
            </Button>
          </Card>
        )}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Configure {selectedPlatform && PLATFORM_META[selectedPlatform.platform_type].name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Platform configuration is managed through the setup wizard or API credentials.
            </p>
            {/* Add platform-specific configuration fields here */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                Close
              </Button>
              <Button>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
