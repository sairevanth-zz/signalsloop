import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Fetch API keys for this project
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select('key_hash')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching API keys:', error);
      return NextResponse.json(
        { error: 'Failed to fetch API key' },
        { status: 500 }
      );
    }

    if (!apiKeys || apiKeys.length === 0) {
      return NextResponse.json(
        { error: 'No API key found. Please create an API key in project settings first.' },
        { status: 404 }
      );
    }

    // Decode the API key and generate embed code
    const apiKey = atob(apiKeys[0].key_hash);
    const embedCode = `<script src="https://signalsloop.com/embed/${apiKey}.js"></script>`;

    return NextResponse.json({ embedCode });

  } catch (error) {
    console.error('Error in copy embed code API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
