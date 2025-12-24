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
import { runPreflightChecks } from '@/lib/hunters/concurrency';

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
        .in('status', ['active', 'paused', 'setup'])
        .single();
      integrations = data ? [data] : [];
      integrationError = error;
    } else if (platformType) {
      const { data, error } = await supabase
        .from('platform_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('platform_type', platformType)
        .in('status', ['active', 'paused', 'setup']);
      integrations = data || [];
      integrationError = error;
    } else {
      // Get all active/paused/setup integrations (matches original working code)
      const { data, error } = await supabase
        .from('platform_integrations')
        .select('*')
        .eq('project_id', projectId)
        .in('status', ['active', 'paused', 'setup']);
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
    let platforms = [...new Set(integrations.map((i: any) => i.platform_type))] as string[];
    console.log('[Hunter Trigger] All platforms requested:', platforms);

    // === Plan-based platform filtering ===
    // Grok-powered platforms (expensive): twitter, g2, capterra, trustpilot, producthunt
    // Non-Grok platforms (cheap): reddit, hackernews, playstore
    const GROK_PLATFORMS = ['twitter', 'g2', 'capterra', 'trustpilot', 'producthunt'];
    const NON_GROK_PLATFORMS = ['reddit', 'hackernews', 'playstore'];

    // Get project plan
    const { data: projectPlan } = await supabase
      .from('projects')
      .select('plan')
      .eq('id', projectId)
      .single();

    const userPlan = projectPlan?.plan || 'free';

    // Pro and Free users: filter out Grok platforms
    if (userPlan !== 'premium') {
      const filteredPlatforms = platforms.filter(p => NON_GROK_PLATFORMS.includes(p));
      const removedPlatforms = platforms.filter(p => GROK_PLATFORMS.includes(p));

      if (removedPlatforms.length > 0) {
        console.log(`[Hunter Trigger] ${userPlan} plan - filtering out Grok platforms:`, removedPlatforms);
      }

      platforms = filteredPlatforms;

      if (platforms.length === 0) {
        return NextResponse.json<QueuedScanResponse>(
          {
            success: false,
            error: 'The platforms you have enabled (Twitter, G2, Capterra, Trustpilot, ProductHunt) require Premium. Please upgrade or enable Reddit, HackerNews, or PlayStore.'
          },
          { status: 403 }
        );
      }
    }

    console.log('[Hunter Trigger] Platforms to scan (after plan filter):', platforms);

    // Create scan and queue discovery jobs
    try {
      // === Phase 1: Check project concurrency limits ===
      const preflightResult = await runPreflightChecks(projectId);
      if (!preflightResult.allowed) {
        console.log(`[Hunter Trigger] Preflight check failed: ${preflightResult.reason}`);
        return NextResponse.json<QueuedScanResponse>(
          {
            success: false,
            error: preflightResult.reason || 'A scan is already in progress. Please wait.'
          },
          { status: 429 } // Too Many Requests
        );
      }

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
