/**
 * Cron Job: Detect Roadmap Adjustments
 * 
 * GET /api/cron/detect-adjustments
 * 
 * Schedule: Every 6 hours (configurable in vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectRoadmapAdjustmentTriggers } from '@/lib/roadmap/trigger-detection';
import { generateAdjustmentProposal } from '@/lib/roadmap/proposal-generator';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.log('[Cron] Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting roadmap adjustment detection');

    const supabase = getServiceRoleClient();

    if (!supabase) {
        return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const results = {
        projectsProcessed: 0,
        triggersDetected: 0,
        proposalsCreated: 0,
        errors: [] as string[]
    };

    try {
        // Get all active projects
        const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('id, name')
            .limit(100);

        if (projectsError || !projects) {
            throw new Error(`Failed to fetch projects: ${projectsError?.message}`);
        }

        console.log(`[Cron] Processing ${projects.length} projects`);

        // Process each project
        for (const project of projects) {
            try {
                // Detect triggers
                const triggers = await detectRoadmapAdjustmentTriggers(project.id);
                results.triggersDetected += triggers.length;

                // Generate proposals for significant triggers
                const significantTriggers = triggers.filter(t => t.severity !== 'low');

                for (const trigger of significantTriggers) {
                    try {
                        const proposal = await generateAdjustmentProposal(project.id, trigger);

                        const { error: insertError } = await supabase
                            .from('roadmap_adjustment_proposals')
                            .insert(proposal);

                        if (!insertError) {
                            results.proposalsCreated++;
                        }
                    } catch (err) {
                        console.error(`[Cron] Failed to create proposal for ${project.name}:`, err);
                    }
                }

                results.projectsProcessed++;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                results.errors.push(`Project ${project.id}: ${message}`);
                console.error(`[Cron] Error processing project ${project.name}:`, err);
            }
        }

        // Expire old pending proposals
        await supabase.rpc('expire_old_proposals');

        console.log(`[Cron] Complete: ${results.projectsProcessed} projects, ${results.triggersDetected} triggers, ${results.proposalsCreated} proposals`);

        return NextResponse.json({
            success: true,
            ...results
        });
    } catch (error) {
        console.error('[Cron] Fatal error:', error);
        return NextResponse.json(
            { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
