import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Test all possible header variations
    const headers = {
      'Authorization (capital A)': request.headers.get('Authorization'),
      'authorization (lowercase a)': request.headers.get('authorization'),
      'AUTHORIZATION (all caps)': request.headers.get('AUTHORIZATION'),
    };

    console.log('=== AUTH TEST ===');
    console.log('All header variations:', headers);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'Missing API key',
        headers_received: headers,
        all_headers: Object.fromEntries(request.headers.entries())
      }, { status: 401 });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    console.log('API Key (first 10):', apiKey.substring(0, 10));
    console.log('Key Hash:', keyHash);

    // Try to connect to Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

    if (!supabaseUrl || !supabaseServiceRole) {
      return NextResponse.json({
        error: 'Missing Supabase env vars',
        has_url: !!supabaseUrl,
        has_service_role: !!supabaseServiceRole
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // Query for the API key
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select(`
        *,
        projects!inner(id, slug, name, plan, user_id)
      `)
      .eq('key_hash', keyHash)
      .single();

    console.log('Query error:', keyError);
    console.log('Query result:', apiKeyData ? 'FOUND' : 'NOT FOUND');

    if (keyError) {
      return NextResponse.json({
        success: false,
        error: 'API key lookup failed',
        supabase_error: keyError,
        key_hash_searched: keyHash
      }, { status: 401 });
    }

    if (!apiKeyData) {
      return NextResponse.json({
        success: false,
        error: 'API key not found in database',
        key_hash_searched: keyHash
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'Authentication successful!',
      project_id: apiKeyData.projects.id,
      project_slug: apiKeyData.projects.slug,
      api_key_name: apiKeyData.name
    });

  } catch (error) {
    console.error('Test auth error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
