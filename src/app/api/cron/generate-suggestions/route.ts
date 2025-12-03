/**
 * API Route: Generate Suggestions Cron Job
 * GET /api/cron/generate-suggestions
 *
 * Generates proactive suggestions for all active projects
 * Should be called by Vercel Cron daily
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateProactiveSuggestions } from '@/lib/ask/suggestions-generator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// GET Handler - Generate suggestions for all projects
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[Generate Suggestions Cron] Invalid authorization');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Generate Suggestions Cron] Starting suggestion generation');

    // Get all active projects
    // For MVP, we'll process all projects. In production, add limits/pagination
    const { data: projects, error: fetchError } = await supabase
      .from('projects')
      .select('id, name')
      .order('created_at', { ascending: false })
      .limit(100); // Process up to 100 projects per run

    if (fetchError) {
      console.error('[Generate Suggestions Cron] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    if (!projects || projects.length === 0) {
      console.log('[Generate Suggestions Cron] No projects found');
      return NextResponse.json({
        success: true,
        message: 'No projects to process',
        processed: 0,
      });
    }

    console.log(`[Generate Suggestions Cron] Found ${projects.length} projects to process`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      total_suggestions: 0,
      errors: [] as string[],
    };

    // Generate suggestions for each project
    for (const project of projects) {
      try {
        console.log(`[Generate Suggestions Cron] Processing project: ${project.id} (${project.name})`);

        // Delete old expired suggestions first
        await supabase
          .from('ask_proactive_suggestions')
          .delete()
          .eq('project_id', project.id)
          .eq('status', 'active')
          .lt('expires_at', new Date().toISOString());

        // Generate new suggestions
        const suggestions = await generateProactiveSuggestions(project.id);

        results.succeeded++;
        results.total_suggestions += suggestions.length;
        console.log(`[Generate Suggestions Cron] Generated ${suggestions.length} suggestions for project ${project.id}`);
      } catch (error) {
        console.error(`[Generate Suggestions Cron] Error processing project ${project.id}:`, error);
        results.failed++;
        results.errors.push(
          `Project ${project.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        results.processed++;
      }
    }

    console.log('[Generate Suggestions Cron] Generation complete:', results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('[Generate Suggestions Cron] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
