/**
 * Competitive Intelligence Extraction Cron Job
 * Extracts competitor mentions from newly discovered feedback
 * Should be triggered every 30 minutes via cron (after hunter scan)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractCompetitorMentionsBatch, getPendingFeedbackForExtraction } from '@/lib/competitive-intelligence';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

/**
 * GET /api/cron/competitive-extraction
 * Triggered by cron every 30 minutes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-cron-secret-here';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Create Supabase client with service role for cron jobs
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
    );

    console.log('[Competitive Extraction Cron] Starting competitive extraction');

    // Get all projects with hunter configs
    const { data: projects, error: projectsError } = await supabase
      .from('hunter_configs')
      .select('project_id')
      .eq('is_active', true);

    if (projectsError) {
      throw projectsError;
    }

    if (!projects || projects.length === 0) {
      console.log('[Competitive Extraction Cron] No active projects found');
      return NextResponse.json({
        success: true,
        message: 'No active projects',
        processed: 0,
      });
    }

    console.log(`[Competitive Extraction Cron] Found ${projects.length} active projects`);

    // Process each project
    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalMentions = 0;
    const projectResults = [];

    for (const project of projects) {
      try {
        // Get pending feedback for this project (limit to 20 per project per run)
        const pendingFeedbackIds = await getPendingFeedbackForExtraction(project.project_id, 20);

        if (pendingFeedbackIds.length === 0) {
          console.log(`[Competitive Extraction Cron] No pending feedback for project ${project.project_id}`);
          continue;
        }

        console.log(
          `[Competitive Extraction Cron] Processing ${pendingFeedbackIds.length} feedback items for project ${project.project_id}`,
        );

        // Extract competitors from feedback batch
        const result = await extractCompetitorMentionsBatch(pendingFeedbackIds);

        totalProcessed += result.processed;
        totalSuccessful += result.successful;
        totalMentions += result.totalMentions;

        projectResults.push({
          projectId: project.project_id,
          processed: result.processed,
          successful: result.successful,
          failed: result.failed,
          mentionsFound: result.totalMentions,
        });

        // Small delay between projects to prevent rate limit issues
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[Competitive Extraction Cron] Error processing project ${project.project_id}:`, error);
        projectResults.push({
          projectId: project.project_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(
      `[Competitive Extraction Cron] Completed. Processed ${totalProcessed} items, found ${totalMentions} competitive mentions`,
    );

    return NextResponse.json({
      success: true,
      message: 'Competitive extraction completed',
      totalProcessed,
      totalSuccessful,
      totalMentions,
      projects: projectResults.length,
      results: projectResults,
    });
  } catch (error) {
    console.error('[Competitive Extraction Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
