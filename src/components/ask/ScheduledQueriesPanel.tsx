/**
 * Scheduled Queries Panel Component
 * Displays and manages scheduled queries
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, ToggleLeft, ToggleRight, Mail, MessageSquare } from 'lucide-react';
import type { ScheduledQuery, ScheduleFrequency, DeliveryMethod } from '@/types/ask';

interface ScheduledQueriesPanelProps {
  projectId: string;
  className?: string;
}

export function ScheduledQueriesPanel({ projectId, className = '' }: ScheduledQueriesPanelProps) {
  const [queries, setQueries] = useState<ScheduledQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadQueries();
  }, [projectId]);

  async function loadQueries() {
    try {
      setLoading(true);
      const response = await fetch(`/api/ask/scheduled-queries?projectId=${projectId}`);
      const data = await response.json();

      if (data.success && data.queries) {
        setQueries(data.queries);
      }
    } catch (error) {
      console.error('Error loading scheduled queries:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleQuery(queryId: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/ask/scheduled-queries/${queryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        loadQueries();
      }
    } catch (error) {
      console.error('Error toggling query:', error);
    }
  }

  async function deleteQuery(queryId: string) {
    if (!confirm('Are you sure you want to delete this scheduled query?')) return;

    try {
      const response = await fetch(`/api/ask/scheduled-queries/${queryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadQueries();
      }
    } catch (error) {
      console.error('Error deleting query:', error);
    }
  }

  function formatFrequency(query: ScheduledQuery): string {
    if (query.frequency === 'daily') return 'Daily';
    if (query.frequency === 'weekly') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Weekly on ${days[query.day_of_week || 0]}`;
    }
    if (query.frequency === 'monthly') {
      return `Monthly on day ${query.day_of_month}`;
    }
    return query.frequency;
  }

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-slate-400">Loading scheduled queries...</div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-white">Scheduled Queries</h2>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Schedule Query
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <CreateScheduledQueryForm
          projectId={projectId}
          onSuccess={() => {
            setShowCreateForm(false);
            loadQueries();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Queries List */}
      {queries.length === 0 ? (
        <div className="text-center py-12 border border-slate-700 rounded-lg bg-slate-800/30">
          <Clock className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No scheduled queries yet</p>
          <p className="text-sm text-slate-500">
            Schedule recurring queries to get automated insights delivered to your inbox
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queries.map((query) => (
            <div
              key={query.id}
              className="border border-slate-700 rounded-lg p-4 bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-white">{query.query_text}</span>
                    {!query.is_active && (
                      <span className="text-xs px-2 py-1 bg-slate-700 text-slate-400 rounded">
                        Paused
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>{formatFrequency(query)}</span>
                    <span>•</span>
                    <span>{query.time_utc} UTC</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      {query.delivery_method === 'email' || query.delivery_method === 'both' ? (
                        <Mail className="h-3 w-3" />
                      ) : null}
                      {query.delivery_method === 'slack' || query.delivery_method === 'both' ? (
                        <MessageSquare className="h-3 w-3" />
                      ) : null}
                      {query.delivery_method}
                    </div>
                  </div>

                  {query.next_run_at && (
                    <div className="text-xs text-slate-500 mt-1">
                      Next run: {new Date(query.next_run_at).toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleQuery(query.id, query.is_active)}
                    className="p-2 hover:bg-slate-700 rounded transition-colors"
                    title={query.is_active ? 'Pause' : 'Resume'}
                  >
                    {query.is_active ? (
                      <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-slate-500" />
                    )}
                  </button>

                  <button
                    onClick={() => deleteQuery(query.id)}
                    className="p-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Create Form Component
// ============================================================================

function CreateScheduledQueryForm({
  projectId,
  onSuccess,
  onCancel,
}: {
  projectId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState('');
  const [frequency, setFrequency] = useState<ScheduleFrequency>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [time, setTime] = useState('09:00');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('email');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setSubmitting(true);

      const response = await fetch('/api/ask/scheduled-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          query_text: query,
          frequency,
          day_of_week: frequency === 'weekly' ? dayOfWeek : undefined,
          day_of_month: frequency === 'monthly' ? dayOfMonth : undefined,
          time_utc: time + ':00',
          delivery_method: deliveryMethod,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create scheduled query');
      }
    } catch (error) {
      console.error('Error creating scheduled query:', error);
      alert('Failed to create scheduled query');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 border border-blue-500/20 rounded-lg bg-blue-500/5">
      <h3 className="text-sm font-medium text-white mb-4">Schedule a Recurring Query</h3>

      <div className="space-y-4">
        {/* Query */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Query</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., What are the top feedback themes this week?"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* Frequency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {frequency === 'weekly' && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">Day of Week</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>
          )}

          {frequency === 'monthly' && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {frequency === 'daily' && <div />}
        </div>

        {/* Time and Delivery */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Time (UTC)</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Delivery Method</label>
            <select
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="email">Email</option>
              <option value="slack">Slack</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <button
          type="submit"
          disabled={submitting || !query.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {submitting ? 'Creating...' : 'Create Schedule'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
