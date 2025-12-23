/**
 * Strategic Recommendations Cron Job
 * Generates strategic recommendations based on competitive intelligence
 * Should be triggered weekly (Monday 1 AM) via cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateStrategicRecommendations } from '@/lib/competitive-intelligence';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

/**
 * GET /api/cron/strategic-recommendations
 * Triggered by cron weekly on Monday at 1 AM
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

    console.log('[Strategic Recommendations Cron] Starting strategic analysis');

    // Get all projects with competitive data
    const { data: projects, error: projectsError } = await supabase
      .from('competitors')
      .select('project_id')
      .gt('total_mentions', 5); // Only analyze projects with meaningful competitive data

    if (projectsError) {
      throw projectsError;
    }

    if (!projects || projects.length === 0) {
      console.log('[Strategic Recommendations Cron] No projects with sufficient competitive data found');
      return NextResponse.json({
        success: true,
        message: 'No projects to analyze',
        processed: 0,
      });
    }

    // Deduplicate project IDs
    const uniqueProjectIds = [...new Set(projects.map((p) => p.project_id))];

    console.log(`[Strategic Recommendations Cron] Found ${uniqueProjectIds.length} projects to analyze`);

    // Generate recommendations for each project
    let totalRecommendations = 0;
    const projectResults = [];

    for (const projectId of uniqueProjectIds) {
      try {
        console.log(`[Strategic Recommendations Cron] Generating recommendations for project ${projectId}`);

        // Generate strategic recommendations
        const result = await generateStrategicRecommendations(projectId);

        totalRecommendations += result.recommendationsGenerated;

        projectResults.push({
          projectId,
          success: result.success,
          recommendationsGenerated: result.recommendationsGenerated,
          executiveSummary: result.executiveSummary,
        });

        // Delay between projects to prevent rate limit issues (GPT-4 calls)
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(`[Strategic Recommendations Cron] Error analyzing project ${projectId}:`, error);
        projectResults.push({
          projectId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(
      `[Strategic Recommendations Cron] Completed. Generated ${totalRecommendations} recommendations across ${uniqueProjectIds.length} projects`,
    );

    return NextResponse.json({
      success: true,
      message: 'Strategic recommendations generation completed',
      projectsAnalyzed: uniqueProjectIds.length,
      totalRecommendations,
      results: projectResults,
    });
  } catch (error) {
    console.error('[Strategic Recommendations Cron] Error:', error);
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
