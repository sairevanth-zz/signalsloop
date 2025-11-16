/**
 * API Route: Competitor Strengths
 * Fetches competitor strengths (highly praised features)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const competitorProductId = searchParams.get('competitorProductId');

    if (!competitorProductId) {
      return NextResponse.json(
        { success: false, error: 'competitorProductId is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: strengths, error } = await supabase
      .from('competitor_strengths')
      .select('*')
      .eq('competitor_product_id', competitorProductId)
      .order('praise_count', { ascending: false });

    if (error) {
      console.error('[External Strengths API] Error fetching strengths:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      strengths: strengths || [],
    });
  } catch (error: any) {
    console.error('[External Strengths API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
