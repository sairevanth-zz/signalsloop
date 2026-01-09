/**
 * API Route: Trigger External Review Scraping
 * Manually trigger scraping of competitor reviews
 * 
 * Premium-only feature (uses xAI/Grok for scraping)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { scrapeCompetitorReviews, analyzeStrengthsAndWeaknesses } from '@/lib/competitive-intelligence/external-review-scraper';
import { checkAIUsageLimit, incrementAIUsage, getUpgradeMessage } from '@/lib/ai-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { competitorProductId, projectId, platform, limit = 50 } = body;

    if (!competitorProductId || !platform) {
      return NextResponse.json(
        { success: false, error: 'competitorProductId and platform are required' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required for usage tracking' },
        { status: 400 }
      );
    }

    if (!['g2', 'capterra', 'trustradius'].includes(platform)) {
      return NextResponse.json(
        { success: false, error: 'Invalid platform. Must be g2, capterra, or trustradius' },
        { status: 400 }
      );
    }

    // Check tier limit - external scraping is Premium only
    const usageCheck = await checkAIUsageLimit(projectId, 'external_review_scrape');

    if (!usageCheck.allowed) {
      const plan = usageCheck.plan || 'free';
      return NextResponse.json({
        success: false,
        error: 'Limit reached',
        message: plan === 'premium'
          ? getUpgradeMessage('external_review_scrape', usageCheck.limit, 'pro')
          : 'External review scraping is a Premium-only feature. Upgrade to access competitor reviews from G2, Capterra, and TrustRadius.',
        usage: {
          current: usageCheck.current,
          limit: usageCheck.limit,
          remaining: usageCheck.remaining,
          plan: usageCheck.plan,
        },
        premiumOnly: usageCheck.limit === 0,
      }, { status: 429 });
    }

    console.log(`[External Scrape] Scraping ${platform} reviews for competitor ${competitorProductId} (${usageCheck.remaining} scrapes remaining)`);

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

    // Increment usage
    await incrementAIUsage(projectId, 'external_review_scrape');

    console.log(`[External Scrape] Completed. Reviews: ${scrapeResult.reviewsScraped}, Strengths: ${analyzeResult.strengthsFound}, Weaknesses: ${analyzeResult.weaknessesFound}`);

    return NextResponse.json({
      success: true,
      reviewsScraped: scrapeResult.reviewsScraped,
      strengthsFound: analyzeResult.strengthsFound,
      weaknessesFound: analyzeResult.weaknessesFound,
      usage: {
        current: usageCheck.current + 1,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining - 1,
      },
    });
  } catch (error: any) {
    console.error('[External Scrape API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/competitive/external/scrape?projectId=xxx
 * Check scraping usage status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    const usageCheck = await checkAIUsageLimit(projectId, 'external_review_scrape');

    return NextResponse.json({
      success: true,
      usage: {
        current: usageCheck.current,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining,
        plan: usageCheck.plan,
        allowed: usageCheck.allowed,
      },
      premiumOnly: usageCheck.limit === 0,
    });
  } catch (error) {
    console.error('[External Scrape API] GET Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get usage' }, { status: 500 });
  }
}
