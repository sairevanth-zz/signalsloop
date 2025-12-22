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
  debug?: unknown; // For debugging
}

/**
 * POST /api/hunter/trigger
 * Queue a scan for background processing
 */
export async function POST(request: NextRequest) {
  console.log('[Hunter Trigger] Starting...');

  try {
    const supabase = await createServerClient();
    console.log('[Hunter Trigger] Supabase client created');

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log('[Hunter Trigger] User:', user?.id || 'not authenticated');

    if (!user) {
      return NextResponse.json<QueuedScanResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as TriggerScanRequest;
    const { projectId, platformType, integrationId } = body;

    console.log('[Hunter Trigger] Request:', { projectId, platformType, integrationId });

    if (!projectId) {
      return NextResponse.json<QueuedScanResponse>(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    console.log('[Hunter Trigger] Project:', project, 'Error:', projectError);

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json<QueuedScanResponse>(
        { success: false, error: 'Unauthorized - project not found or not owned by user' },
        { status: 403 }
      );
    }

    // Get integrations to scan
    let integrations;
    let integrationError;

    if (integrationId) {
      const { data, error } = await supabase
        .from('platform_integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('status', 'active')
        .single();
      integrations = data ? [data] : [];
      integrationError = error;
    } else if (platformType) {
      const { data, error } = await supabase
        .from('platform_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('platform_type', platformType)
        .eq('status', 'active');
      integrations = data || [];
      integrationError = error;
    } else {
      // Get all active integrations
      const { data, error } = await supabase
        .from('platform_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active');
      integrations = data || [];
      integrationError = error;
    }

    console.log('[Hunter Trigger] Integrations found:', integrations?.length || 0, 'Error:', integrationError);

    if (integrations.length === 0) {
      return NextResponse.json<QueuedScanResponse>(
        {
          success: false,
          error: 'No active integrations found. Please set up platforms in Hunter Settings first.',
          debug: { integrationError, projectId }
        },
        { status: 404 }
      );
    }

    // Get unique platforms
    const platforms = [...new Set(integrations.map((i: any) => i.platform_type))] as string[];
    console.log('[Hunter Trigger] Platforms to scan:', platforms);

    // Create scan and queue discovery jobs
    try {
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
    } catch (scanError) {
      console.error('[Hunter Trigger] Error creating scan:', scanError);
      return NextResponse.json<QueuedScanResponse>(
        {
          success: false,
          error: scanError instanceof Error ? scanError.message : 'Failed to create scan',
          debug: { scanError: String(scanError) }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Hunter Trigger] Error:', error);
    return NextResponse.json<QueuedScanResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue scan',
        debug: { error: String(error) }
      },
      { status: 500 }
    );
  }
}
