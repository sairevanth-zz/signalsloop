/**
 * Hunter Trigger API
 * Manually trigger a scan for one or all platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { TriggerScanRequest, TriggerScanResponse } from '@/types/hunter';
import { getHunter } from '@/lib/hunters';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for scanning

/**
 * POST /api/hunter/trigger
 * Manually trigger a scan
 */
export async function POST(request: NextRequest) {
  try {
    // Use createServerClient for auth (reads cookies)
    const supabaseAuth = await createServerClient();

    // Check authentication
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role client for database operations
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as TriggerScanRequest;
    const { projectId, platformType, integrationId } = body;

    if (!projectId) {
      return NextResponse.json(
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get hunter config
    const { data: config, error: configError } = await supabase
      .from('hunter_configs')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        {
          success: false,
          error: 'Hunter not configured for this project',
        },
        { status: 404 }
      );
    }

    // Get integrations to scan
    let integrations;
    if (integrationId) {
      const { data } = await supabase
        .from('platform_integrations')
        .select('*')
        .eq('id', integrationId)
        .single();
      integrations = data ? [data] : [];
    } else if (platformType) {
      const { data } = await supabase
        .from('platform_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('platform_type', platformType);
      integrations = data || [];
    } else {
      const { data } = await supabase
        .from('platform_integrations')
        .select('*')
        .eq('project_id', projectId)
        .in('status', ['active', 'paused', 'setup']);
      integrations = data || [];
    }

    if (integrations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active integrations found',
        },
        { status: 404 }
      );
    }

    // Run scans
    const results = [];
    for (const integration of integrations) {
      try {
        const hunter = getHunter(integration.platform_type);
        const result = await hunter.scan(config, integration);

        // Log the scan
        await hunter.logScan(result, integration.id, projectId, 'manual');

        results.push({
          platform: integration.platform_type,
          success: result.success,
          itemsFound: result.itemsFound,
          itemsStored: result.itemsStored,
          error: result.error,
        });
      } catch (error) {
        console.error(
          `[Hunter Trigger] Error scanning ${integration.platform_type}:`,
          error
        );
        results.push({
          platform: integration.platform_type,
          success: false,
          itemsFound: 0,
          itemsStored: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json<TriggerScanResponse>({
      success: true,
      message: `Scanned ${integrations.length} platform(s)`,
      results,
    } as any);
  } catch (error) {
    console.error('[Hunter Trigger] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger scan',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
