import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, projectId } = body;

    if (!apiKey || !projectId) {
      return NextResponse.json({ error: 'Missing apiKey or projectId in request body' }, { status: 400 });
    }

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

    // Hash the provided API key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    console.log('=== DEBUG DATABASE ===');
    console.log('Project ID:', projectId);
    console.log('API Key (first 10 chars):', apiKey.substring(0, 10));
    console.log('Computed Hash:', keyHash);

    // Get ALL api_keys for this project
    const { data: allKeys, error: allKeysError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('project_id', projectId);

    console.log('All API keys in DB for project:', allKeys);
    console.log('Error fetching all keys:', allKeysError);

    // Try to find with the computed hash
    const { data: matchedKey, error: matchError } = await supabase
      .from('api_keys')
      .select(`
        *,
        projects!inner(id, slug, name, plan, user_id)
      `)
      .eq('key_hash', keyHash)
      .single();

    console.log('Matched key with hash:', matchedKey);
    console.log('Match error:', matchError);

    return NextResponse.json({
      debug_info: {
        provided_api_key_prefix: apiKey.substring(0, 10),
        computed_hash: keyHash,
        project_id: projectId
      },
      all_keys_in_db: allKeys?.map(k => ({
        id: k.id,
        name: k.name,
        key_hash: k.key_hash,
        created_at: k.created_at
      })),
      all_keys_error: allKeysError,
      matched_key: matchedKey ? {
        id: matchedKey.id,
        name: matchedKey.name,
        project: matchedKey.projects
      } : null,
      match_error: matchError,
      hash_matches: allKeys?.map(k => ({
        name: k.name,
        db_hash: k.key_hash,
        computed_hash: keyHash,
        matches: k.key_hash === keyHash
      }))
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
