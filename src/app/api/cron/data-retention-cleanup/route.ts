import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { logAuditEvent, AuditEventTypes } from '@/lib/audit-logger';

/**
 * Data Retention Cleanup Cron Job
 * 
 * Enforces data retention policies for SOC 2 compliance.
 * Automatically removes data older than specified retention periods.
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/data-retention-cleanup",
 *     "schedule": "0 3 * * 0"  // Weekly at 3 AM on Sundays
 *   }]
 * }
 */

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

// Retention periods in days
const RETENTION_POLICIES = {
  // Audit logs - 2 years for compliance
  audit_logs: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '730', 10),
  
  // Security events - 1 year
  security_events: parseInt(process.env.SECURITY_EVENT_RETENTION_DAYS || '365', 10),
  
  // Sync logs - 90 days
  inbox_sync_logs: parseInt(process.env.SYNC_LOG_RETENTION_DAYS || '90', 10),
  
  // Reasoning traces - 90 days
  reasoning_traces: parseInt(process.env.REASONING_TRACE_RETENTION_DAYS || '90', 10),
  
  // Notifications - 30 days after read
  notifications: parseInt(process.env.NOTIFICATION_RETENTION_DAYS || '30', 10),
  
  // Brief history - 180 days
  executive_briefs: parseInt(process.env.BRIEF_RETENTION_DAYS || '180', 10),
  
  // Health history - 365 days  
  customer_health_history: parseInt(process.env.HEALTH_HISTORY_RETENTION_DAYS || '365', 10),
  
  // Story generation logs - 90 days
  story_generation_logs: parseInt(process.env.STORY_LOG_RETENTION_DAYS || '90', 10),
};

interface CleanupResult {
  table: string;
  deleted: number;
  retentionDays: number;
  error?: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[DataRetention] Starting cleanup job...');
    console.log('[DataRetention] Retention policies:', RETENTION_POLICIES);

    const supabase = getSupabaseServiceRoleClient();
    const results: CleanupResult[] = [];

    // 1. Cleanup audit logs
    results.push(await cleanupTable(
      supabase,
      'audit_logs',
      'created_at',
      RETENTION_POLICIES.audit_logs
    ));

    // 2. Cleanup security events
    results.push(await cleanupTable(
      supabase,
      'security_events',
      'created_at',
      RETENTION_POLICIES.security_events
    ));

    // 3. Cleanup inbox sync logs
    results.push(await cleanupTable(
      supabase,
      'inbox_sync_logs',
      'started_at',
      RETENTION_POLICIES.inbox_sync_logs
    ));

    // 4. Cleanup reasoning traces
    results.push(await cleanupTable(
      supabase,
      'reasoning_traces',
      'created_at',
      RETENTION_POLICIES.reasoning_traces
    ));

    // 5. Cleanup old read notifications
    results.push(await cleanupReadNotifications(
      supabase,
      RETENTION_POLICIES.notifications
    ));

    // 6. Cleanup executive briefs
    results.push(await cleanupTable(
      supabase,
      'executive_briefs',
      'created_at',
      RETENTION_POLICIES.executive_briefs
    ));

    // 7. Cleanup customer health history
    results.push(await cleanupTable(
      supabase,
      'customer_health_history',
      'recorded_at',
      RETENTION_POLICIES.customer_health_history
    ));

    // 8. Cleanup story generation logs
    results.push(await cleanupTable(
      supabase,
      'story_generation_logs',
      'created_at',
      RETENTION_POLICIES.story_generation_logs
    ));

    const duration = Date.now() - startTime;
    const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
    const errors = results.filter(r => r.error);

    // Log the cleanup event
    await logAuditEvent({
      eventType: 'system.data_retention_cleanup',
      eventCategory: 'admin',
      actorType: 'cron',
      action: 'cleanup',
      actionStatus: errors.length === 0 ? 'success' : 'failure',
      metadata: {
        totalDeleted,
        duration,
        results: results.map(r => ({
          table: r.table,
          deleted: r.deleted,
          retentionDays: r.retentionDays,
        })),
      },
    }).catch(err => console.error('[DataRetention] Failed to log audit event:', err));

    console.log(`[DataRetention] Cleanup complete: ${totalDeleted} records deleted in ${duration}ms`);

    return NextResponse.json({
      success: errors.length === 0,
      summary: {
        totalDeleted,
        durationMs: duration,
        tablesProcessed: results.length,
        errors: errors.length,
      },
      results,
      retentionPolicies: RETENTION_POLICIES,
    });

  } catch (error) {
    console.error('[DataRetention] Cleanup job failed:', error);

    return NextResponse.json(
      {
        error: 'Cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generic table cleanup function
 */
async function cleanupTable(
  supabase: any,
  tableName: string,
  dateColumn: string,
  retentionDays: number
): Promise<CleanupResult> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .lt(dateColumn, cutoffDate.toISOString())
      .select('id');

    if (error) {
      // Table might not exist yet - that's okay
      if (error.code === '42P01') {
        console.log(`[DataRetention] Table ${tableName} does not exist, skipping`);
        return {
          table: tableName,
          deleted: 0,
          retentionDays,
          error: 'Table does not exist',
        };
      }
      throw error;
    }

    const deleted = data?.length || 0;
    console.log(`[DataRetention] ${tableName}: deleted ${deleted} records older than ${retentionDays} days`);

    return {
      table: tableName,
      deleted,
      retentionDays,
    };
  } catch (error) {
    console.error(`[DataRetention] Error cleaning ${tableName}:`, error);
    return {
      table: tableName,
      deleted: 0,
      retentionDays,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Special cleanup for notifications - only delete read ones
 */
async function cleanupReadNotifications(
  supabase: any,
  retentionDays: number
): Promise<CleanupResult> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('read', true)
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      if (error.code === '42P01') {
        return {
          table: 'notifications (read)',
          deleted: 0,
          retentionDays,
          error: 'Table does not exist',
        };
      }
      throw error;
    }

    const deleted = data?.length || 0;
    console.log(`[DataRetention] notifications (read): deleted ${deleted} records older than ${retentionDays} days`);

    return {
      table: 'notifications (read)',
      deleted,
      retentionDays,
    };
  } catch (error) {
    console.error('[DataRetention] Error cleaning notifications:', error);
    return {
      table: 'notifications (read)',
      deleted: 0,
      retentionDays,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
