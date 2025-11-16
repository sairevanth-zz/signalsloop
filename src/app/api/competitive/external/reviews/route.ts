/**
 * API Route: Competitor Reviews
 * Fetches competitor reviews with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const competitorProductId = searchParams.get('competitorProductId');
    const platform = searchParams.get('platform');
    const sentiment = searchParams.get('sentiment');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!competitorProductId) {
      return NextResponse.json(
        { success: false, error: 'competitorProductId is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from('competitor_reviews')
      .select('*')
      .eq('competitor_product_id', competitorProductId)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (platform && platform !== 'all') {
      query = query.eq('platform', platform);
    }

    if (sentiment && sentiment !== 'all') {
      query = query.eq('sentiment_category', sentiment);
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error('[External Reviews API] Error fetching reviews:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reviews: reviews || [],
    });
  } catch (error: any) {
    console.error('[External Reviews API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
