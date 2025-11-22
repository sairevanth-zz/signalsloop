/**
 * Stakeholder Reports Cron Job
 *
 * POST /api/cron/send-stakeholder-reports
 *
 * Automatically sends weekly reports to all stakeholders across all projects.
 * Should be scheduled to run weekly (e.g., every Monday morning).
 *
 * Part of Phase 3: Stakeholder Management & Experimentation Intelligence
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendWeeklyReports } from '@/lib/stakeholders/report-generator';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 300; // Allow up to 5 minutes for multiple projects

/**
 * POST - Send weekly reports to all stakeholders
 *
 * Requires CRON_SECRET authorization header
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Stakeholder Reports Cron] Starting weekly report generation...');

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      );
    }

    // Get all projects that have stakeholders
    const { data: projects, error: projectsError } = await supabase
      .from('stakeholders')
      .select('project_id')
      .eq('notification_preferences->email_enabled', true);

    if (projectsError) {
      throw projectsError;
    }

    if (!projects || projects.length === 0) {
      console.log('[Stakeholder Reports Cron] No stakeholders found');
      return NextResponse.json({
        success: true,
        message: 'No stakeholders to send reports to',
        projectsProcessed: 0,
      });
    }

    // Get unique project IDs
    const uniqueProjectIds = [...new Set(projects.map(p => p.project_id))];

    console.log(`[Stakeholder Reports Cron] Processing ${uniqueProjectIds.length} projects`);

    const results = {
      success: [] as string[],
      failed: [] as string[],
    };

    // Send reports for each project
    for (const projectId of uniqueProjectIds) {
      try {
        console.log(`[Stakeholder Reports Cron] Processing project ${projectId}`);
        await sendWeeklyReports(projectId);
        results.success.push(projectId);
      } catch (error) {
        console.error(`[Stakeholder Reports Cron] Error processing project ${projectId}:`, error);
        results.failed.push(projectId);
      }
    }

    console.log('[Stakeholder Reports Cron] Completed');
    console.log(`- Success: ${results.success.length} projects`);
    console.log(`- Failed: ${results.failed.length} projects`);

    return NextResponse.json({
      success: true,
      projectsProcessed: uniqueProjectIds.length,
      successCount: results.success.length,
      failedCount: results.failed.length,
      failedProjects: results.failed,
    });
  } catch (error) {
    console.error('[Stakeholder Reports Cron] Fatal error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Manual trigger for testing (requires auth)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Stakeholder Reports Cron Job',
    description: 'Use POST with CRON_SECRET to trigger weekly report generation',
    schedule: 'Weekly (Monday 9:00 AM)',
  });
}
