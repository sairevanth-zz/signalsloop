/**
 * Dynamic Roadmap Intelligence Cron Job
 *
 * Runs hourly to detect signals and auto-adjust roadmap priorities:
 * - Feedback velocity spikes
 * - Sentiment deterioration
 * - Competitive pressure
 * - Revenue impact
 */

import { NextResponse } from 'next/server';
import { runDynamicRoadmapAgent } from '@/lib/agents/dynamic-roadmap-agent';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[Dynamic Roadmap Cron] Unauthorized request');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('[Dynamic Roadmap Cron] Starting...');

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
      console.log('[Dynamic Roadmap Cron] No active projects found');
      return NextResponse.json({ success: true, projects: 0, adjustments: 0 });
    }

    const results = [];
    let totalAdjustments = 0;

    // Run agent for each project
    for (const project of projects) {
      try {
        console.log(`[Dynamic Roadmap Cron] Processing project: ${project.name} (${project.id})`);

        const adjustments = await runDynamicRoadmapAgent(project.id);

        results.push({
          project_id: project.id,
          project_name: project.name,
          adjustments: adjustments.length,
          changes: adjustments.map(a => ({
            theme: a.themeName,
            old_priority: a.oldPriority,
            new_priority: a.newPriority,
            reason: a.reason
          }))
        });

        totalAdjustments += adjustments.length;

        console.log(`[Dynamic Roadmap Cron] Project ${project.name}: ${adjustments.length} adjustments`);
      } catch (error) {
        console.error(`[Dynamic Roadmap Cron] Error processing project ${project.name}:`, error);
        results.push({
          project_id: project.id,
          project_name: project.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`[Dynamic Roadmap Cron] Completed. Total adjustments: ${totalAdjustments}`);

    return NextResponse.json({
      success: true,
      projects_processed: projects.length,
      total_adjustments: totalAdjustments,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Dynamic Roadmap Cron] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
