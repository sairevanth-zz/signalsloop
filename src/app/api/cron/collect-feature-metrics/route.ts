/**
 * Feature Impact Metrics Collection Cron Job
 *
 * Runs daily to collect post-launch metrics for features that were launched
 * 30+ days ago. This data is used to train the AI roadmap prediction model.
 *
 * Process:
 * 1. Find all features launched 30+ days ago without post-launch metrics
 * 2. Collect actual metrics (sentiment, engagement, adoption, etc.)
 * 3. Compare actual vs predicted impact
 * 4. Update model training data for improved future predictions
 */

import { NextResponse } from 'next/server';
import { batchCollectPostLaunchMetrics } from '@/lib/predictions/impact-simulation/data-collection';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

export const runtime = 'nodejs';
export const maxDuration = 180; // 3 minutes

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[Feature Metrics Cron] Unauthorized request');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('[Feature Metrics Cron] Starting batch collection...');

    const supabase = getServiceRoleClient();

    // Get all active projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, slug')
      .eq('is_active', true);

    if (projectsError) {
      throw new Error(`Error fetching projects: ${projectsError.message}`);
    }

    if (!projects || projects.length === 0) {
      console.log('[Feature Metrics Cron] No active projects found');
      return NextResponse.json({ success: true, projects: 0, features_collected: 0 });
    }

    const results = [];
    let totalFeaturesCollected = 0;

    // Run batch collection for each project
    for (const project of projects) {
      try {
        console.log(`[Feature Metrics Cron] Processing project: ${project.name} (${project.id})`);

        const collectedCount = await batchCollectPostLaunchMetrics(project.id);

        results.push({
          project_id: project.id,
          project_name: project.name,
          features_collected: collectedCount,
        });

        totalFeaturesCollected += collectedCount;

        console.log(`[Feature Metrics Cron] Project ${project.name}: ${collectedCount} features collected`);
      } catch (error) {
        console.error(`[Feature Metrics Cron] Error processing project ${project.name}:`, error);
        results.push({
          project_id: project.id,
          project_name: project.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`[Feature Metrics Cron] Completed. Total features collected: ${totalFeaturesCollected}`);

    return NextResponse.json({
      success: true,
      projects_processed: projects.length,
      total_features_collected: totalFeaturesCollected,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Feature Metrics Cron] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
