/**
 * Test Integration Connection
 * Validates API credentials by making a test API call
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Get integration credentials
    const { data: integration, error } = await supabase
      .from('integration_credentials')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Test the connection based on provider
    let testResult: { valid: boolean; error?: string };

    if (integration.provider === 'launchdarkly') {
      testResult = await testLaunchDarkly(integration);
    } else if (integration.provider === 'optimizely') {
      testResult = await testOptimizely(integration);
    } else {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    // Update validation status
    await supabase
      .from('integration_credentials')
      .update({
        validation_status: testResult.valid ? 'valid' : 'invalid',
        validation_error: testResult.error || null,
        last_validated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    return NextResponse.json({
      valid: testResult.valid,
      error: testResult.error,
    });
  } catch (error) {
    console.error('[Test Integration] Error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function testLaunchDarkly(integration: any): Promise<{ valid: boolean; error?: string }> {
  const config = integration.additional_config || {};
  const projectKey = config.project_key || 'default';

  try {
    // Test by fetching account info
    const response = await fetch(`https://app.launchdarkly.com/api/v2/projects/${projectKey}`, {
      headers: {
        'Authorization': integration.api_key,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { valid: true };
    } else if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    } else if (response.status === 404) {
      return { valid: false, error: 'Project not found' };
    } else {
      return { valid: false, error: `API error: ${response.statusText}` };
    }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Connection failed' };
  }
}

async function testOptimizely(integration: any): Promise<{ valid: boolean; error?: string }> {
  try {
    // Test by fetching projects list
    const response = await fetch('https://api.optimizely.com/v2/projects', {
      headers: {
        'Authorization': `Bearer ${integration.api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { valid: true };
    } else if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    } else {
      return { valid: false, error: `API error: ${response.statusText}` };
    }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Connection failed' };
  }
}
