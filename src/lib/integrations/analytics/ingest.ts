import { getServiceRoleClient } from '@/lib/supabase-singleton';

export type AnalyticsSource = 'mixpanel' | 'amplitude' | 'segment' | 'custom';

export interface AnalyticsEventInput {
  event: string;
  distinctId?: string;
  userId?: string;
  properties?: Record<string, any>;
  timestamp?: string | number | Date;
  metadata?: Record<string, any>;
}

export interface IngestRequest {
  projectId: string;
  source: AnalyticsSource;
  events: AnalyticsEventInput[];
}

export interface IngestResult {
  inserted: number;
}

/**
 * Normalize and store usage analytics events from multiple providers.
 */
export async function ingestAnalyticsEvents(req: IngestRequest): Promise<IngestResult> {
  const supabase = getServiceRoleClient();

  if (!req.events || req.events.length === 0) {
    return { inserted: 0 };
  }

  const rows = req.events.map(normalizeEvent(req.projectId, req.source)).filter(Boolean) as any[];

  if (rows.length === 0) {
    return { inserted: 0 };
  }

  const { error } = await supabase.from('usage_analytics_events').insert(rows);
  if (error) {
    throw error;
  }

  return { inserted: rows.length };
}

function normalizeEvent(projectId: string, source: AnalyticsSource) {
  return (event: AnalyticsEventInput) => {
    if (!event?.event) {
      return null;
    }

    const occurredAt = normalizeTimestamp(event.timestamp);

    return {
      project_id: projectId,
      source,
      event_name: event.event,
      user_id: event.userId || null,
      distinct_id: event.distinctId || null,
      properties: event.properties || {},
      occurred_at: occurredAt,
      metadata: event.metadata || {},
    };
  };
}

function normalizeTimestamp(ts?: string | number | Date): string {
  if (!ts) return new Date().toISOString();

  if (ts instanceof Date) return ts.toISOString();

  if (typeof ts === 'number') return new Date(ts).toISOString();

  const parsed = new Date(ts);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return new Date().toISOString();
}
