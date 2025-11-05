import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendDailyIntelligenceDigest } from '@/lib/email';

/**
 * Vercel Cron Job for Daily User Intelligence Digest
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-intelligence-digest",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 *
 * Schedule: Daily at 9:00 AM UTC
 */

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute

export async function GET(request: NextRequest) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const digestEmail = process.env.DAILY_DIGEST_EMAIL;
    if (!digestEmail) {
      console.log('[Daily Digest] DAILY_DIGEST_EMAIL not configured, skipping');
      return NextResponse.json({
        success: false,
        message: 'DAILY_DIGEST_EMAIL not configured'
      });
    }

    console.log('[Daily Digest] Starting daily intelligence digest...');

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    // Calculate timeframe (last 24 hours)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const timeframeStart = yesterday.toISOString();
    const timeframeEnd = now.toISOString();

    // Fetch new users in last 24 hours
    const { data: newUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, plan, created_at')
      .gte('created_at', timeframeStart)
      .lte('created_at', timeframeEnd)
      .order('created_at', { ascending: false });

    if (usersError) {
      throw new Error(`Failed to fetch new users: ${usersError.message}`);
    }

    const totalSignups = newUsers?.length || 0;

    // Calculate plan breakdown
    const planBreakdown = {
      free: 0,
      pro: 0,
      gift: 0,
      discount: 0
    };

    if (newUsers) {
      newUsers.forEach(user => {
        const plan = (user.plan || 'free').toLowerCase();
        if (plan.includes('gift')) {
          planBreakdown.gift++;
        } else if (plan.includes('discount')) {
          planBreakdown.discount++;
        } else if (plan.includes('pro')) {
          planBreakdown.pro++;
        } else {
          planBreakdown.free++;
        }
      });
    }

    // Fetch enrichment data for these users
    const userIds = newUsers?.map(u => u.id) || [];
    let enrichmentData: any[] = [];
    let enrichmentRate = 0;
    let avgConfidence = 0;

    if (userIds.length > 0) {
      const { data: intelligence, error: intelligenceError } = await supabase
        .from('user_intelligence')
        .select('*')
        .in('user_id', userIds);

      if (!intelligenceError && intelligence) {
        enrichmentData = intelligence;
        enrichmentRate = (intelligence.length / totalSignups) * 100;

        if (intelligence.length > 0) {
          const totalConfidence = intelligence.reduce((sum, u) => sum + (u.confidence_score || 0), 0);
          avgConfidence = totalConfidence / intelligence.length;
        }
      }
    }

    // Calculate top companies
    const companyCounts: Record<string, number> = {};
    enrichmentData.forEach(intel => {
      if (intel.company_name) {
        companyCounts[intel.company_name] = (companyCounts[intel.company_name] || 0) + 1;
      }
    });

    const topCompanies = Object.entries(companyCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get notable signups (high confidence, pro plans, or interesting companies)
    const notableSignups = enrichmentData
      .filter(intel => {
        // Notable if: high confidence (>70%), or pro plan, or has company + role
        return (
          intel.confidence_score > 0.7 ||
          (intel.plan_type && intel.plan_type.includes('pro')) ||
          (intel.company_name && intel.role)
        );
      })
      .sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0))
      .slice(0, 10)
      .map(intel => ({
        email: intel.email,
        name: intel.name,
        company: intel.company_name,
        role: intel.role,
        plan: intel.plan_type || 'free',
        confidence: intel.confidence_score || 0
      }));

    // Send email
    const emailResult = await sendDailyIntelligenceDigest({
      toEmail: digestEmail,
      stats: {
        totalSignups,
        planBreakdown,
        topCompanies,
        enrichmentRate,
        avgConfidence
      },
      notableSignups,
      timeframeStart,
      timeframeEnd
    });

    console.log('[Daily Digest] Email sent successfully');

    return NextResponse.json({
      success: true,
      stats: {
        totalSignups,
        planBreakdown,
        topCompanies: topCompanies.length,
        notableSignups: notableSignups.length,
        enrichmentRate: Math.round(enrichmentRate),
        avgConfidence: Math.round(avgConfidence * 100)
      },
      emailSent: emailResult.success
    });

  } catch (error) {
    console.error('[Daily Digest] Failed:', error);

    return NextResponse.json(
      {
        error: 'Daily digest failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
