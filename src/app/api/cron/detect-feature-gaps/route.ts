/**
 * Feature Gap Detection Cron Job
 * Analyzes competitive mentions to identify feature gaps
 * Should be triggered daily at 2 AM via cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { detectFeatureGaps } from '@/lib/competitive-intelligence';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

/**
 * GET /api/cron/detect-feature-gaps
 * Triggered by cron daily at 2 AM
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

    console.log('[Feature Gap Detection Cron] Starting feature gap analysis');

    // Get all projects with competitive mentions
    const { data: projects, error: projectsError } = await supabase
      .from('competitors')
      .select('project_id')
      .gt('total_mentions', 0);

    if (projectsError) {
      throw projectsError;
    }

    if (!projects || projects.length === 0) {
      console.log('[Feature Gap Detection Cron] No projects with competitive mentions found');
      return NextResponse.json({
        success: true,
        message: 'No projects to analyze',
        processed: 0,
      });
    }

    // Deduplicate project IDs
    const uniqueProjectIds = [...new Set(projects.map((p) => p.project_id))];

    console.log(`[Feature Gap Detection Cron] Found ${uniqueProjectIds.length} projects to analyze`);

    // Analyze each project
    let totalGapsDetected = 0;
    const projectResults = [];

    for (const projectId of uniqueProjectIds) {
      try {
        console.log(`[Feature Gap Detection Cron] Analyzing project ${projectId}`);

        // Detect feature gaps for last 90 days
        const result = await detectFeatureGaps(projectId, 90);

        totalGapsDetected += result.gapsDetected;

        projectResults.push({
          projectId,
          success: result.success,
          gapsDetected: result.gapsDetected,
        });

        // Small delay between projects to prevent rate limit issues
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`[Feature Gap Detection Cron] Error analyzing project ${projectId}:`, error);
        projectResults.push({
          projectId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`[Feature Gap Detection Cron] Completed. Detected ${totalGapsDetected} feature gaps across ${uniqueProjectIds.length} projects`);

    return NextResponse.json({
      success: true,
      message: 'Feature gap detection completed',
      projectsAnalyzed: uniqueProjectIds.length,
      totalGapsDetected,
      results: projectResults,
    });
  } catch (error) {
    console.error('[Feature Gap Detection Cron] Error:', error);
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
