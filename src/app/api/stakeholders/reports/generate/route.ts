/**
 * Stakeholder Reports Generation API
 *
 * POST /api/stakeholders/reports/generate - Generate and send report for a stakeholder
 *
 * Part of Phase 3: Stakeholder Management & Experimentation Intelligence
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateStakeholderReport, sendWeeklyReports } from '@/lib/stakeholders/report-generator';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for AI generation

/**
 * POST - Generate report for a stakeholder or all stakeholders in a project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stakeholderId, projectId, sendEmail: shouldSendEmail = false } = body;

    if (!stakeholderId && !projectId) {
      return NextResponse.json(
        { error: 'Either stakeholderId or projectId is required' },
        { status: 400 }
      );
    }

    // If projectId provided, generate reports for all stakeholders
    if (projectId && !stakeholderId) {
      console.log(`[Reports API] Generating reports for all stakeholders in project ${projectId}`);

      try {
        await sendWeeklyReports(projectId);

        return NextResponse.json({
          success: true,
          message: 'Weekly reports generated and sent to all stakeholders',
        });
      } catch (error) {
        console.error('[Reports API] Error sending weekly reports:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to send weekly reports' },
          { status: 500 }
        );
      }
    }

    // Generate report for specific stakeholder
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      );
    }

    // Get stakeholder details
    const { data: stakeholder, error: fetchError } = await supabase
      .from('stakeholders')
      .select('*')
      .eq('id', stakeholderId)
      .single();

    if (fetchError || !stakeholder) {
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    console.log(`[Reports API] Generating report for stakeholder ${stakeholder.email}`);

    // Generate report
    const reportHtml = await generateStakeholderReport(
      stakeholder.id,
      stakeholder.role,
      stakeholder.project_id
    );

    // Send email if requested
    if (shouldSendEmail) {
      try {
        await sendEmail({
          to: stakeholder.email,
          subject: `Product Intelligence Report - ${new Date().toLocaleDateString()}`,
          html: reportHtml,
        });

        // Update sent_at
        await supabase
          .from('stakeholder_reports')
          .update({ sent_at: new Date().toISOString() })
          .eq('stakeholder_id', stakeholder.id)
          .is('sent_at', null)
          .order('generated_at', { ascending: false })
          .limit(1);

        console.log(`[Reports API] Report sent to ${stakeholder.email}`);
      } catch (emailError) {
        console.error('[Reports API] Error sending email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Get the latest report
    const { data: latestReport } = await supabase
      .from('stakeholder_reports')
      .select('*')
      .eq('stakeholder_id', stakeholder.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      report: latestReport,
      emailSent: shouldSendEmail,
    });
  } catch (error) {
    console.error('[Reports API] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
