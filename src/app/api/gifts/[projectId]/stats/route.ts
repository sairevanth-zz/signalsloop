import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!;

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get gift statistics using the database function
    const { data, error } = await supabase.rpc('get_gift_stats', {
      p_project_id: params.projectId,
    });

    if (error) {
      console.error('Error fetching gift stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch gift statistics' },
        { status: 500 }
      );
    }

    return NextResponse.json({ stats: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
