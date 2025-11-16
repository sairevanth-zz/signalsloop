/**
 * API Route: Trigger External Review Scraping
 * Manually trigger scraping of competitor reviews
 */

import { NextRequest, NextResponse } from 'next/server';
import { scrapeCompetitorReviews, analyzeStrengthsAndWeaknesses } from '@/lib/competitive-intelligence/external-review-scraper';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { competitorProductId, platform, limit = 50 } = body;

    if (!competitorProductId || !platform) {
      return NextResponse.json(
        { success: false, error: 'competitorProductId and platform are required' },
        { status: 400 }
      );
    }

    if (!['g2', 'capterra', 'trustradius'].includes(platform)) {
      return NextResponse.json(
        { success: false, error: 'Invalid platform. Must be g2, capterra, or trustradius' },
        { status: 400 }
      );
    }

    // Scrape reviews
    const scrapeResult = await scrapeCompetitorReviews(
      competitorProductId,
      platform as 'g2' | 'capterra' | 'trustradius',
      limit
    );

    if (!scrapeResult.success) {
      return NextResponse.json(
        { success: false, error: scrapeResult.error },
        { status: 500 }
      );
    }

    // Analyze strengths and weaknesses
    const analyzeResult = await analyzeStrengthsAndWeaknesses(competitorProductId);

    return NextResponse.json({
      success: true,
      reviewsScraped: scrapeResult.reviewsScraped,
      strengthsFound: analyzeResult.strengthsFound,
      weaknessesFound: analyzeResult.weaknessesFound,
    });
  } catch (error: any) {
    console.error('[External Scrape API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
