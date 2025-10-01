import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Supabase client not available',
        env: {
          url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          serviceKey: !!process.env.SUPABASE_SERVICE_ROLE
        }
      }, { status: 500 });
    }

    // Simple test query
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1);

    if (error) {
      return NextResponse.json({ 
        error: 'Database query failed',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'API route working',
      data: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API test error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
