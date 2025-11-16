/**
 * Competitor Profile API
 * GET: Returns detailed competitor profile with mentions, sentiment, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * GET /api/competitive/profile?competitorId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const competitorId = searchParams.get('competitorId');

    if (!competitorId) {
      return NextResponse.json({ success: false, error: 'competitorId is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get competitor profile using the database function
    const { data: profileData, error: profileError } = await supabase.rpc('get_competitor_profile', {
      p_competitor_id: competitorId,
    });

    if (profileError) {
      console.error('[Competitor Profile API] Error fetching profile:', profileError);
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
    }

    if (!profileData || profileData.length === 0) {
      return NextResponse.json({ success: false, error: 'Competitor not found' }, { status: 404 });
    }

    const profile = profileData[0];

    return NextResponse.json({
      success: true,
      competitor: profile.competitor_data,
      mentionBreakdown: profile.mention_breakdown,
      sentimentTrend: profile.sentiment_trend,
      topMentions: profile.top_mentions,
    });
  } catch (error) {
    console.error('[Competitor Profile API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch competitor profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
