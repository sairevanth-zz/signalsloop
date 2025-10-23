'use client';

import React from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const supabase = getSupabaseClient();

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
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading security events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Card className="p-6 bg-red-50 border-red-200 mb-4">
          <div className="text-red-800">{error}</div>
        </Card>
        {debugInfo && (
          <Card className="p-6">
            <h2 className="font-bold mb-2">Debug Information:</h2>
            <pre className="text-xs overflow-x-auto bg-gray-50 p-4 rounded">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Severity</label>
            <select
              className="border rounded-md px-3 py-2 text-sm"
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
              className="border rounded-md px-3 py-2 text-sm"
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
            <Button
              variant="outline"
              onClick={() => setFilter({})}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Events List */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No security events found
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Badge className={getSeverityColor(event.severity)}>
                    {event.severity.toUpperCase()}
                  </Badge>
                  <span className="text-sm font-mono text-gray-600">{event.type}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(event.created_at).toLocaleString()}
                </span>
              </div>

              <p className="text-gray-900 mb-3">{event.message}</p>

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
                    <span className="font-mono text-xs">{event.path}</span>
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
                    <span className="text-gray-500">User:</span>{' '}
                    <span className="font-mono text-xs">{event.user_id.substring(0, 8)}...</span>
                  </div>
                )}
              </div>

              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <details className="mt-3">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                    View metadata
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
