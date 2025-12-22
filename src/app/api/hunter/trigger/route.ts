/**
 * Hunter Trigger API
 * Queue-based: Creates a scan record and enqueues discovery jobs
 * Returns immediately, workers process async
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { TriggerScanRequest } from '@/types/hunter';
import { createScan } from '@/lib/hunters/job-queue';
import { incrementAIUsage } from '@/lib/ai-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 10; // Fast response, workers do the work

interface QueuedScanResponse {
  success: boolean;
  scanId?: string;
  platforms?: string[];
  message?: string;
  error?: string;
}

/**
 * POST /api/hunter/trigger
 * Queue a scan for background processing
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<QueuedScanResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as TriggerScanRequest;
    const { projectId, platformType, integrationId } = body;

    if (!projectId) {
      return NextResponse.json<QueuedScanResponse>(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const { data: project } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json<QueuedScanResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get integrations to scan
    let integrations;
    if (integrationId) {
      const { data } = await supabase
        .from('hunter_integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('status', 'active')
        .single();
      integrations = data ? [data] : [];
    } else if (platformType) {
      const { data } = await supabase
        .from('hunter_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('platform_type', platformType)
        .eq('status', 'active');
      integrations = data || [];
    } else {
      // Get all active integrations
      const { data } = await supabase
        .from('hunter_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active');
      integrations = data || [];
    }

    if (integrations.length === 0) {
      return NextResponse.json<QueuedScanResponse>(
        { success: false, error: 'No active integrations found' },
        { status: 404 }
      );
    }

    // Get unique platforms
    const platforms = [...new Set(integrations.map((i: any) => i.platform_type))];

    // Create scan and queue discovery jobs
    const { scan, jobs } = await createScan(projectId, platforms, user.id);

    console.log(`[Hunter Trigger] Created scan ${scan.id} with ${jobs.length} discovery jobs`);

    // Increment usage ONCE per scan button click
    try {
      await incrementAIUsage(projectId, 'hunter_scan');
    } catch (e) {
      console.error('[Hunter Trigger] Error incrementing usage:', e);
    }

    return NextResponse.json<QueuedScanResponse>({
      success: true,
      scanId: scan.id,
      platforms,
      message: `Scan queued for ${platforms.length} platform(s). Results will appear as they're processed.`,
    });
  } catch (error) {
    console.error('[Hunter Trigger] Error:', error);
    return NextResponse.json<QueuedScanResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue scan',
      },
      { status: 500 }
    );
  }
}
