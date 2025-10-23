'use client';

import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  ip?: string;
  user_agent?: string;
  path?: string;
  method?: string;
  user_id?: string;
  project_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export default function SecurityEventsPage() {
  const [events, setEvents] = React.useState<SecurityEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [debugInfo, setDebugInfo] = React.useState<any>(null);
  const [filter, setFilter] = React.useState<{
    severity?: string;
    type?: string;
  }>({});

  React.useEffect(() => {
    loadEvents();
  }, [filter]);

  async function loadEvents() {
    try {
      setLoading(true);
      setError(null);

      // Get session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Please log in to view security events');
        setLoading(false);
        return;
      }

      // Debug: Check auth status
      const debugResponse = await fetch('/api/admin/debug-auth', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const debugData = await debugResponse.json();
      setDebugInfo(debugData);

      if (!debugData.isAdmin) {
        setError(`Not authorized as admin. Debug info: ${JSON.stringify(debugData, null, 2)}`);
        setLoading(false);
        return;
      }

      // Build query params
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (filter.severity) params.set('severity', filter.severity);
      if (filter.type) params.set('type', filter.type);

      // Fetch events
      const response = await fetch(`/api/admin/security-events?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch security events');
      }

      const data = await response.json();
      setEvents(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error loading security events:', err);
    } finally {
      setLoading(false);
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Security Events</h1>
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Security Events</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-4">
            {error}
          </div>
          {debugInfo && (
            <div className="bg-white border rounded-lg p-4">
              <h2 className="font-bold mb-2">Debug Information:</h2>
              <pre className="text-xs overflow-x-auto bg-gray-50 p-4 rounded">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Security Events</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Severity</label>
              <select
                className="border rounded px-3 py-2"
                value={filter.severity || ''}
                onChange={(e) => setFilter({ ...filter, severity: e.target.value || undefined })}
              >
                <option value="">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                className="border rounded px-3 py-2"
                value={filter.type || ''}
                onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
              >
                <option value="">All</option>
                <option value="rate_limit_exceeded">Rate Limit</option>
                <option value="invalid_api_key">Invalid API Key</option>
                <option value="csrf_validation_failed">CSRF Failed</option>
                <option value="xss_attempt_blocked">XSS Attempt</option>
                <option value="sql_injection_attempt">SQL Injection</option>
                <option value="unauthorized_access">Unauthorized Access</option>
                <option value="suspicious_request">Suspicious Request</option>
                <option value="authentication_failed">Auth Failed</option>
                <option value="validation_error">Validation Error</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilter({})}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No security events found
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(event.severity)}`}>
                      {event.severity.toUpperCase()}
                    </span>
                    <span className="text-sm font-mono text-gray-600">{event.type}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-gray-900 mb-2">{event.message}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {event.ip && (
                    <div>
                      <span className="text-gray-500">IP:</span>{' '}
                      <span className="font-mono">{event.ip}</span>
                    </div>
                  )}
                  {event.path && (
                    <div>
                      <span className="text-gray-500">Path:</span>{' '}
                      <span className="font-mono">{event.path}</span>
                    </div>
                  )}
                  {event.method && (
                    <div>
                      <span className="text-gray-500">Method:</span>{' '}
                      <span className="font-mono">{event.method}</span>
                    </div>
                  )}
                  {event.user_id && (
                    <div>
                      <span className="text-gray-500">User ID:</span>{' '}
                      <span className="font-mono text-xs">{event.user_id.substring(0, 8)}...</span>
                    </div>
                  )}
                </div>

                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                      View metadata
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
