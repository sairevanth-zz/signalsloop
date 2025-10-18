import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS
const getSupabaseAdmin = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

export async function POST(request: NextRequest) {
  try {
    const { projectId, name } = await request.json();

    if (!projectId || !name) {
      return NextResponse.json({ error: 'Missing projectId or name' }, { status: 400 });
    }

    // Generate API key
    const apiKey = 'sk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Encode for storage – other services expect base64 of the key
    const keyHash = Buffer.from(apiKey, 'utf8').toString('base64');

    const supabase = getSupabaseAdmin();

    // Insert with service role to bypass RLS
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        project_id: projectId,
        name: name,
        key_hash: keyHash,
        usage_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating API key:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      apiKey: apiKey, // Return plaintext key ONCE
      data: data
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
