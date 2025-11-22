/**
 * Stakeholders API
 *
 * GET /api/stakeholders?projectId=xxx - List all stakeholders for a project
 * POST /api/stakeholders - Create new stakeholder
 *
 * Part of Phase 3: Stakeholder Management & Experimentation Intelligence
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { createServerClient } from '@/lib/supabase-client';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * GET - List stakeholders for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    // Use service role client for admin operations
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      );
    }

    // Get all stakeholders with report stats
    const { data, error } = await supabase
      .rpc('get_project_stakeholders', { p_project_id: projectId });

    if (error) {
      console.error('[Stakeholders API] Error fetching stakeholders:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      stakeholders: data || [],
    });
  } catch (error) {
    console.error('[Stakeholders API] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new stakeholder
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      name,
      email,
      role,
      interests = [],
      notificationPreferences = {
        frequency: 'weekly',
        email_enabled: true,
        slack_enabled: false,
        include_sections: ['okrs', 'roadmap', 'competitive', 'metrics', 'feedback_themes'],
      },
    } = body;

    // Validate required fields
    if (!projectId || !name || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, name, email, role' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['ceo', 'sales', 'engineering', 'marketing', 'customer_success'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate access token for stakeholder portal
    const accessToken = crypto.randomBytes(32).toString('base64url');
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setFullYear(tokenExpiresAt.getFullYear() + 1); // 1 year expiry

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      );
    }

    // Create stakeholder
    const { data, error } = await supabase
      .from('stakeholders')
      .insert({
        project_id: projectId,
        name,
        email,
        role,
        interests,
        notification_preferences: notificationPreferences,
        access_token: accessToken,
        token_expires_at: tokenExpiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Stakeholders API] Error creating stakeholder:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      stakeholder: data,
      portalUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/stakeholder-portal/${accessToken}`,
    }, { status: 201 });
  } catch (error) {
    console.error('[Stakeholders API] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
