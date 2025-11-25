import React, { useEffect, useState } from 'react';
import { BentoCard } from './BentoCard';
import { Activity, Users, Loader2 } from 'lucide-react';
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

export function CrossToolPanel({ projectId }: CrossToolPanelProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CrossToolData | null>(null);

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

    fetchData();
    return () => {
      active = false;
    };
  }, [projectId]);

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
            </div>
          </div>
        )}
      </div>
    </BentoCard>
  );
}
