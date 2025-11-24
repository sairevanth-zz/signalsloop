/**
 * Project Integrations API
 * Manage LaunchDarkly/Optimizely integration credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Get project ID from slug
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', params.slug)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get integrations (without API keys)
    const { data: integrations, error } = await supabase
      .from('integration_credentials')
      .select('id, provider, is_active, validation_status, validation_error, last_validated_at, created_at')
      .eq('project_id', project.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ integrations: integrations || [] });
  } catch (error) {
    console.error('[Integrations API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const body = await request.json();
    const { provider, api_key, additional_config } = body;

    if (!provider || !api_key) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Get project ID
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', params.slug)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // TODO: Encrypt API key before storing
    // For now, storing as-is (should use proper encryption in production)

    // Upsert integration
    const { data: integration, error } = await supabase
      .from('integration_credentials')
      .upsert(
        {
          project_id: project.id,
          provider,
          api_key,
          additional_config: additional_config || {},
          is_active: true,
          validation_status: 'pending',
        },
        {
          onConflict: 'project_id,provider',
        }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ integration });
  } catch (error) {
    console.error('[Integrations API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save integration' },
      { status: 500 }
    );
  }
}
