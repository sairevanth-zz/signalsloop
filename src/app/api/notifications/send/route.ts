/**
 * API Route: Send Push Notification
 * POST /api/notifications/send
 *
 * Sends push notifications to project subscribers
 * Internal use only - verify authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { sendBatchNotifications, notificationTemplates } from '@/lib/notifications/web-push';
import type { NotificationType, NotificationPayload } from '@/lib/notifications/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Verify internal API key or admin auth
    const apiKey = request.headers.get('x-api-key');
    const isInternalCall = apiKey === process.env.INTERNAL_API_KEY;

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // For external calls, require authentication
    if (!isInternalCall) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    const {
      projectId,
      type,
      payload,
      targetUserIds,
      // Template-specific fields
      templateName,
      templateData,
    } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let notificationPayload: NotificationPayload;
    let notificationType: NotificationType = type || 'general';

    // Use template if specified
    if (templateName && templateData) {
      switch (templateName) {
        case 'criticalFeedback':
          notificationPayload = notificationTemplates.criticalFeedback(
            templateData.feedbackTitle,
            templateData.projectSlug,
            templateData.feedbackId
          );
          notificationType = 'critical_feedback';
          break;

        case 'anomalyDetected':
          notificationPayload = notificationTemplates.anomalyDetected(
            templateData.description,
            templateData.projectSlug
          );
          notificationType = 'anomaly_detected';
          break;

        case 'competitorAlert':
          notificationPayload = notificationTemplates.competitorAlert(
            templateData.competitorName,
            templateData.eventType,
            templateData.projectSlug
          );
          notificationType = 'competitor_alert';
          break;

        case 'specGenerated':
          notificationPayload = notificationTemplates.specGenerated(
            templateData.specTitle,
            templateData.projectSlug,
            templateData.specId
          );
          notificationType = 'spec_generated';
          break;

        case 'weeklyDigest':
          notificationPayload = notificationTemplates.weeklyDigest(
            templateData.summary,
            templateData.projectSlug
          );
          notificationType = 'weekly_digest';
          break;

        default:
          return NextResponse.json(
            { error: 'Unknown template name' },
            { status: 400 }
          );
      }
    } else if (payload) {
      notificationPayload = payload;
    } else {
      return NextResponse.json(
        { error: 'Either payload or templateName with templateData is required' },
        { status: 400 }
      );
    }

    // Verify project access (for non-internal calls)
    if (!isInternalCall) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, owner_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      // Only project owner can send notifications
      if (project.owner_id !== user?.id) {
        return NextResponse.json(
          { error: 'Not authorized to send notifications for this project' },
          { status: 403 }
        );
      }
    }

    // Send notifications
    const result = await sendBatchNotifications(
      projectId,
      notificationPayload,
      notificationType,
      targetUserIds
    );

    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[Send Notification API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}
