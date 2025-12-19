/**
 * Hunter Setup API
 * POST /api/hunter/setup - Initialize hunter configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import {
  HunterSetupRequest,
  HunterSetupResponse,
} from '@/types/hunter';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/hunter/setup
 * Initialize hunter configuration for a project
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

    const body = (await request.json()) as HunterSetupRequest;
    const {
      projectId,
      companyName,
      nameVariations = [],
      competitors = [],
      industry,
      keywords = [],
      platforms = [],
      // Product context fields
      productTagline,
      productCategory,
      productDescription,
      targetAudience,
      websiteUrl,
      socialHandles,
      excludeTerms = [],
    } = body;

    // Validate input
    if (!projectId || !companyName) {
      return NextResponse.json(
        {
          success: false,
          error: 'projectId and companyName are required',
        },
        { status: 400 }
      );
    }

    if (!platforms || platforms.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one platform must be selected',
        },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project || project.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if hunter config already exists
    const { data: existingConfig } = await supabase
      .from('hunter_configs')
      .select('id')
      .eq('project_id', projectId)
      .single();

    let configId: string;

    if (existingConfig) {
      // Update existing config
      const { data: updatedConfig, error: updateError } = await supabase
        .from('hunter_configs')
        .update({
          company_name: companyName,
          name_variations: nameVariations,
          competitors,
          industry,
          keywords,
          // Product context fields
          product_tagline: productTagline,
          product_category: productCategory,
          product_description: productDescription,
          target_audience: targetAudience,
          website_url: websiteUrl,
          social_handles: socialHandles,
          exclude_terms: excludeTerms,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConfig.id)
        .select('id')
        .single();

      if (updateError) {
        throw updateError;
      }

      configId = updatedConfig.id;
    } else {
      // Create new config
      const { data: newConfig, error: insertError } = await supabase
        .from('hunter_configs')
        .insert({
          project_id: projectId,
          company_name: companyName,
          name_variations: nameVariations,
          competitors,
          industry,
          keywords,
          // Product context fields
          product_tagline: productTagline,
          product_category: productCategory,
          product_description: productDescription,
          target_audience: targetAudience,
          website_url: websiteUrl,
          social_handles: socialHandles,
          exclude_terms: excludeTerms,
          is_active: true,
        })
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      configId = newConfig.id;
    }

    // Create platform integrations (with default setup status)
    for (const platform of platforms) {
      const { error: platformError } = await supabase
        .from('platform_integrations')
        .upsert(
          {
            project_id: projectId,
            platform_type: platform,
            config: {},
            status: 'setup',
            scan_frequency_minutes: 15,
          },
          {
            onConflict: 'project_id,platform_type',
          }
        );

      if (platformError) {
        console.error(
          `[Hunter Setup] Error creating ${platform} integration:`,
          platformError
        );
      }
    }

    return NextResponse.json<HunterSetupResponse>({
      success: true,
      configId,
      message: 'Hunter configuration created successfully',
    });
  } catch (error) {
    console.error('[Hunter Setup] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to setup hunter configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/hunter/setup?projectId=xxx
 * Get hunter configuration for a project
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
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project || project.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get hunter config
    const { data: config, error: configError } = await supabase
      .from('hunter_configs')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (configError) {
      // No config exists yet
      return NextResponse.json({
        success: true,
        config: null,
      });
    }

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('[Hunter Setup] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch hunter configuration',
      },
      { status: 500 }
    );
  }
}
