import React, { useEffect, useState } from 'react';
import { BentoCard } from './BentoCard';
import { Activity, Users, Loader2, RefreshCw, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CrossToolPanelProps {
  projectId: string;
}

interface CrossToolData {
  velocity: Array<{
    sprint_name: string | null;
    sprint_end_date: string | null;
    completed_points: number | null;
  }>;
  usage: {
    wau: number;
    events_7d: number;
    top_events: Array<{ event: string; count: number }>;
  };
}

interface JiraConnection {
  id: string;
  site_name?: string;
  site_url?: string;
  default_project_key?: string;
  status?: string;
}

export function CrossToolPanel({ projectId }: CrossToolPanelProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CrossToolData | null>(null);
  const [connections, setConnections] = useState<JiraConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [boardId, setBoardId] = useState<string>('');
  const [syncing, setSyncing] = useState(false);
  const [ingesting, setIngesting] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/cross-tool?projectId=${projectId}`);
        const json = await res.json();
        if (active && json.success) {
          setData({
            velocity: json.velocity || [],
            usage: json.usage || { wau: 0, events_7d: 0, top_events: [] },
          });
        }
      } catch (error) {
        console.error('[CrossToolPanel] Failed to load data:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    const fetchConnections = async () => {
      try {
        const res = await fetch(`/api/integrations/jira/connections?projectId=${projectId}`);
        const json = await res.json();
        if (active && json.success) {
          setConnections(json.connections || []);
          if (!selectedConnection && json.connections?.length) {
            setSelectedConnection(json.connections[0].id);
          }
        }
      } catch (error) {
        console.error('[CrossToolPanel] Failed to load Jira connections:', error);
      }
    };

    fetchConnections();
    fetchData();
    return () => {
      active = false;
    };
  }, [projectId, selectedConnection]);

  const handleSyncVelocity = async () => {
    if (!selectedConnection || !boardId) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/integrations/jira/sync-velocity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: selectedConnection, boardId, projectId }),
      });
      const json = await res.json();
      if (!json.success) {
        console.error('[CrossToolPanel] Velocity sync failed:', json.error);
      }
      // Refresh data after sync
      const refresh = await fetch(`/api/dashboard/cross-tool?projectId=${projectId}`);
      const refreshJson = await refresh.json();
      if (refreshJson.success) {
        setData({
          velocity: refreshJson.velocity || [],
          usage: refreshJson.usage || { wau: 0, events_7d: 0, top_events: [] },
        });
      }
    } catch (error) {
      console.error('[CrossToolPanel] Velocity sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleIngestSampleUsage = async () => {
    setIngesting(true);
    try {
      const now = new Date().toISOString();
      const res = await fetch('/api/integrations/analytics/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          source: 'custom',
          events: [
            { event: 'dashboard_viewed', distinctId: 'demo-user', timestamp: now },
            { event: 'feedback_submitted', distinctId: 'demo-user', timestamp: now },
            { event: 'roadmap_opened', distinctId: 'demo-user', timestamp: now },
          ],
        }),
      });

      const json = await res.json();
      if (!json.success) {
        console.error('[CrossToolPanel] Sample ingest failed:', json.error);
      }

      // Refresh usage stats
      const refresh = await fetch(`/api/dashboard/cross-tool?projectId=${projectId}`);
      const refreshJson = await refresh.json();
      if (refreshJson.success) {
        setData({
          velocity: refreshJson.velocity || [],
          usage: refreshJson.usage || { wau: 0, events_7d: 0, top_events: [] },
        });
      }
    } catch (error) {
      console.error('[CrossToolPanel] Usage ingest error:', error);
    } finally {
      setIngesting(false);
    }
  };

  return (
    <BentoCard colSpan={2}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-white">Execution & Usage Drilldown</h3>
          </div>
          <Users className="h-4 w-4 text-slate-500" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading cross-tool signals...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-slate-500">Recent Sprints</div>
              {data?.velocity && data.velocity.length > 0 ? (
                <div className="space-y-2">
                  {data.velocity.map((sprint, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm text-white">
                          {sprint.sprint_name || `Sprint ${idx + 1}`}
                        </span>
                        <span className="text-xs text-slate-500">
                          {sprint.sprint_end_date
                            ? new Date(sprint.sprint_end_date).toLocaleDateString()
                            : 'No end date'}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-emerald-300">
                        {Math.round((sprint.completed_points || 0) * 10) / 10} pts
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-3 text-sm text-slate-500">
                  No velocity data yet. Run Jira sync to pull sprint velocity.
                </div>
              )}

              <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-3 space-y-2">
                <div className="text-xs uppercase tracking-wide text-slate-500">Sync Jira Velocity</div>
                <select
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-white"
                  value={selectedConnection}
                  onChange={(e) => setSelectedConnection(e.target.value)}
                >
                  <option value="">Select Jira connection</option>
                  {connections.map((conn) => (
                    <option key={conn.id} value={conn.id}>
                      {conn.site_name || conn.site_url || conn.id}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-white"
                  placeholder="Board ID (e.g., 23)"
                  value={boardId}
                  onChange={(e) => setBoardId(e.target.value)}
                />
                <button
                  onClick={handleSyncVelocity}
                  disabled={!selectedConnection || !boardId || syncing}
                  className="flex w-full items-center justify-center gap-2 rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Sync Velocity
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-slate-500">Usage Signals</div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-3">
                <div className="flex items-center justify-between text-sm text-white">
                  <span>Weekly Active</span>
                  <span className="font-semibold">{data?.usage?.wau ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-white mt-2">
                  <span>Events (7d)</span>
                  <span className="font-semibold">{data?.usage?.events_7d ?? 0}</span>
                </div>

                <div className="mt-3 border-t border-slate-800 pt-2">
                  <div className="text-xs text-slate-500 mb-2">Top Events</div>
                  {data?.usage?.top_events?.length ? (
                    <ul className="space-y-1 text-sm text-white">
                      {data.usage.top_events.map((evt, idx) => (
                        <li key={idx} className="flex items-center justify-between">
                          <span className="truncate">{evt.event}</span>
                          <span className={cn('text-xs font-semibold', idx === 0 ? 'text-emerald-300' : 'text-slate-300')}>
                            {evt.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-slate-500">No events ingested yet.</div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-3 space-y-2">
                <div className="text-xs uppercase tracking-wide text-slate-500">Sample Usage Events</div>
                <p className="text-xs text-slate-500">Generate demo events to populate WAU and top events.</p>
                <button
                  onClick={handleIngestSampleUsage}
                  disabled={ingesting}
                  className="flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {ingesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Generate Demo Usage
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BentoCard>
  );
}
