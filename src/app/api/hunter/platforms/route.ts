/**
 * Hunter Platforms API
 * Manage platform integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import {
  AddPlatformRequest,
  UpdatePlatformRequest,
} from '@/types/hunter';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/hunter/platforms?projectId=xxx
 * List all platform integrations for a project
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

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

    // Get all platform integrations
    const { data: integrations, error } = await supabase
      .from('platform_integrations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Also get platform health stats
    const { data: healthStats } = await supabase
      .from('platform_health_stats')
      .select('*')
      .eq('project_id', projectId);

    return NextResponse.json({
      success: true,
      integrations: integrations || [],
      healthStats: healthStats || [],
    });
  } catch (error) {
    console.error('[Hunter Platforms] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch platform integrations',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hunter/platforms
 * Add a new platform integration
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as AddPlatformRequest;
    const {
      projectId,
      platformType,
      config,
      scanFrequencyMinutes = 15,
    } = body;

    // Validate input
    if (!projectId || !platformType || !config) {
      return NextResponse.json(
        {
          success: false,
          error: 'projectId, platformType, and config are required',
        },
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

    // Calculate next scan time
    const nextScanAt = new Date(
      Date.now() + scanFrequencyMinutes * 60 * 1000
    ).toISOString();

    // Insert or update platform integration
    const { data: integration, error } = await supabase
      .from('platform_integrations')
      .upsert(
        {
          project_id: projectId,
          platform_type: platformType,
          config,
          status: 'active',
          scan_frequency_minutes: scanFrequencyMinutes,
          next_scan_at: nextScanAt,
        },
        {
          onConflict: 'project_id,platform_type',
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      integration,
      message: 'Platform integration added successfully',
    });
  } catch (error) {
    console.error('[Hunter Platforms] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add platform integration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/hunter/platforms
 * Update an existing platform integration
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as UpdatePlatformRequest;
    const { integrationId, config, status, scanFrequencyMinutes } = body;

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'integrationId is required' },
        { status: 400 }
      );
    }

    // Get existing integration
    const { data: integration } = await supabase
      .from('platform_integrations')
      .select('project_id')
      .eq('id', integrationId)
      .single();

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Verify user owns the project
    const { data: project } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', integration.project_id)
      .single();

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (config) {
      updates.config = config;
    }

    if (status) {
      updates.status = status;
    }

    if (scanFrequencyMinutes) {
      updates.scan_frequency_minutes = scanFrequencyMinutes;
      // Recalculate next scan time
      updates.next_scan_at = new Date(
        Date.now() + scanFrequencyMinutes * 60 * 1000
      ).toISOString();
    }

    // Update integration
    const { data: updated, error } = await supabase
      .from('platform_integrations')
      .update(updates)
      .eq('id', integrationId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      integration: updated,
      message: 'Platform integration updated successfully',
    });
  } catch (error) {
    console.error('[Hunter Platforms] PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update platform integration',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/hunter/platforms?integrationId=xxx
 * Delete a platform integration
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'integrationId is required' },
        { status: 400 }
      );
    }

    // Get existing integration
    const { data: integration } = await supabase
      .from('platform_integrations')
      .select('project_id')
      .eq('id', integrationId)
      .single();

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Verify user owns the project
    const { data: project } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', integration.project_id)
      .single();

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete integration
    const { error } = await supabase
      .from('platform_integrations')
      .delete()
      .eq('id', integrationId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Platform integration deleted successfully',
    });
  } catch (error) {
    console.error('[Hunter Platforms] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete platform integration',
      },
      { status: 500 }
    );
  }
}
