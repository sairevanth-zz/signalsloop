/**
 * API Route: Competitor Weaknesses
 * Fetches competitor weaknesses (commonly criticized features)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!;

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

    const { data: weaknesses, error } = await supabase
      .from('competitor_weaknesses')
      .select('*')
      .eq('competitor_product_id', competitorProductId)
      .order('complaint_count', { ascending: false });

    if (error) {
      console.error('[External Weaknesses API] Error fetching weaknesses:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      weaknesses: weaknesses || [],
    });
  } catch (error: any) {
    console.error('[External Weaknesses API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
