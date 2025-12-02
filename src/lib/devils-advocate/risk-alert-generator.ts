/**
 * Risk Alert Generator
 *
 * Creates and manages PRD risk alerts in the database.
 */

import { createServerClient } from '@/lib/supabase-client';
import type { PRDRiskAlert, PRDRiskAlertInput } from '@/types/devils-advocate';
import { PRDRiskAlertInputSchema } from '@/types/devils-advocate';

/**
 * Generates and stores risk alerts from Red Team analysis
 */
export async function generateRiskAlerts(
  alerts: PRDRiskAlertInput[]
): Promise<PRDRiskAlert[]> {
  const supabase = await createServerClient();
  const createdAlerts: PRDRiskAlert[] = [];

  try {
    for (const alert of alerts) {
      // Validate the alert
      const validated = PRDRiskAlertInputSchema.parse(alert);

      // Insert into database
      const { data, error } = await supabase
        .from('prd_risk_alerts')
        .insert({
          spec_id: validated.spec_id,
          project_id: validated.project_id,
          risk_type: validated.risk_type,
          severity: validated.severity,
          title: validated.title,
          description: validated.description,
          evidence: validated.evidence,
          recommended_action: validated.recommended_action,
          confidence_score: validated.confidence_score || null,
          reasoning_trace: validated.reasoning_trace || null,
          status: 'open',
        })
        .select()
        .single();

      if (error) {
        console.error('[generateRiskAlerts] Error creating alert:', error);
        continue;
      }

      createdAlerts.push(data as PRDRiskAlert);
    }

    // Send real-time notifications for critical/high severity alerts
    const criticalAlerts = createdAlerts.filter((a) =>
      ['critical', 'high'].includes(a.severity)
    );

    if (criticalAlerts.length > 0) {
      await sendRiskAlertNotifications(criticalAlerts);
    }

    return createdAlerts;
  } catch (error) {
    console.error('[generateRiskAlerts] Error:', error);
    throw error;
  }
}

/**
 * Gets all risk alerts for a spec
 */
export async function getRiskAlertsForSpec(specId: string): Promise<PRDRiskAlert[]> {
  const supabase = await createServerClient();

  try {
    const { data, error } = await supabase
      .from('prd_risk_alerts')
      .select('*')
      .eq('spec_id', specId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as PRDRiskAlert[];
  } catch (error) {
    console.error('[getRiskAlertsForSpec] Error:', error);
    throw error;
  }
}

/**
 * Updates alert status (acknowledge, resolve, dismiss)
 */
export async function updateRiskAlertStatus(
  alertId: string,
  status: 'acknowledged' | 'resolved' | 'dismissed',
  userId: string,
  resolutionNotes?: string
): Promise<PRDRiskAlert> {
  const supabase = await createServerClient();

  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolved_by = userId;
      updateData.resolved_at = new Date().toISOString();
      if (resolutionNotes) {
        updateData.resolution_notes = resolutionNotes;
      }
    }

    const { data, error } = await supabase
      .from('prd_risk_alerts')
      .update(updateData)
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as PRDRiskAlert;
  } catch (error) {
    console.error('[updateRiskAlertStatus] Error:', error);
    throw error;
  }
}

/**
 * Gets risk alerts summary for a project
 */
export async function getRiskAlertsSummary(projectId: string): Promise<any> {
  const supabase = await createServerClient();

  try {
    const { data, error } = await supabase.rpc('get_risk_alerts_summary', {
      p_project_id: projectId,
    });

    if (error) {
      throw error;
    }

    return data?.[0] || {
      total_alerts: 0,
      critical_alerts: 0,
      high_alerts: 0,
      open_alerts: 0,
      alerts_last_7d: 0,
      top_risk_types: [],
    };
  } catch (error) {
    console.error('[getRiskAlertsSummary] Error:', error);
    throw error;
  }
}

/**
 * Sends notifications for critical/high severity alerts
 */
async function sendRiskAlertNotifications(alerts: PRDRiskAlert[]): Promise<void> {
  // For MVP, just log the notifications
  // In production, this would send emails via Resend or Slack notifications
  console.log(`[RiskAlerts] Would send notifications for ${alerts.length} critical/high alerts:`,
    alerts.map((a) => ({ id: a.id, severity: a.severity, title: a.title }))
  );

  // TODO: Implement actual notifications
  // - Send email to spec owner
  // - Post to Slack if integration enabled
  // - Create Supabase Realtime notification
}
