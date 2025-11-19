/**
 * Deal Autopsy Cron Job
 * Automatically generates autopsies for newly closed deals
 * Should be triggered daily via cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateDealAutopsy, findSimilarDeals, updateBattlecardWithDeal } from '@/lib/ai-deal-autopsy';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

/**
 * GET /api/cron/deal-autopsy
 * Triggered by cron daily (or every few hours)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-cron-secret-here';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('[Deal Autopsy Cron] Starting autopsy generation for closed deals');

    // Find all closed deals without autopsies (closed in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: dealsNeedingAutopsy, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .in('status', ['won', 'lost'])
      .gte('closed_at', sevenDaysAgo.toISOString())
      .is('closed_at', 'not.null');

    if (dealsError) {
      throw dealsError;
    }

    if (!dealsNeedingAutopsy || dealsNeedingAutopsy.length === 0) {
      console.log('[Deal Autopsy Cron] No closed deals found');
      return NextResponse.json({
        success: true,
        message: 'No closed deals needing autopsy',
        processed: 0,
      });
    }

    console.log(`[Deal Autopsy Cron] Found ${dealsNeedingAutopsy.length} closed deals`);

    // Filter out deals that already have autopsies
    const { data: existingAutopsies } = await supabase
      .from('deal_autopsies')
      .select('deal_id')
      .in(
        'deal_id',
        dealsNeedingAutopsy.map((d) => d.id)
      );

    const existingAutopsyDealIds = new Set(existingAutopsies?.map((a) => a.deal_id) || []);
    const dealsToProcess = dealsNeedingAutopsy.filter((d) => !existingAutopsyDealIds.has(d.id));

    if (dealsToProcess.length === 0) {
      console.log('[Deal Autopsy Cron] All closed deals already have autopsies');
      return NextResponse.json({
        success: true,
        message: 'All closed deals already have autopsies',
        processed: 0,
        total_closed: dealsNeedingAutopsy.length,
      });
    }

    console.log(`[Deal Autopsy Cron] Processing ${dealsToProcess.length} deals needing autopsy`);

    // Process deals in batches to avoid timeout
    const BATCH_SIZE = 10;
    const results = [];
    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < dealsToProcess.length; i += BATCH_SIZE) {
      const batch = dealsToProcess.slice(i, i + BATCH_SIZE);

      for (const deal of batch) {
        try {
          console.log(`[Deal Autopsy Cron] Generating autopsy for deal ${deal.id} (${deal.name})`);

          // Generate autopsy
          const autopsy = await generateDealAutopsy(deal);

          if (!autopsy) {
            console.error(`[Deal Autopsy Cron] Failed to generate autopsy for deal ${deal.id}`);
            failed++;
            results.push({
              dealId: deal.id,
              dealName: deal.name,
              success: false,
              error: 'AI generation failed',
            });
            continue;
          }

          // Find similar deals
          const similarDeals = await findSimilarDeals(deal.id, supabase);

          // Save autopsy
          const { error: saveError } = await supabase.from('deal_autopsies').insert({
            deal_id: deal.id,
            summary: autopsy.summary,
            primary_reason: autopsy.primary_reason,
            primary_reason_detail: autopsy.primary_reason_detail,
            objections: autopsy.objections,
            competitor_signals: autopsy.competitor_signals,
            key_themes: autopsy.key_themes,
            recommendations: autopsy.recommendations,
            action_items: autopsy.action_items,
            similar_open_deal_ids: similarDeals.open,
            similar_lost_deal_ids: similarDeals.lost,
            confidence: autopsy.confidence,
            ai_model: 'gpt-4o',
            generated_at: new Date().toISOString(),
          });

          if (saveError) {
            console.error(`[Deal Autopsy Cron] Error saving autopsy for deal ${deal.id}:`, saveError);
            failed++;
            results.push({
              dealId: deal.id,
              dealName: deal.name,
              success: false,
              error: saveError.message,
            });
            continue;
          }

          // Update battlecard (non-blocking)
          updateBattlecardWithDeal(deal.project_id, deal.id, autopsy, supabase).catch((error) => {
            console.error(`[Deal Autopsy Cron] Error updating battlecard for deal ${deal.id}:`, error);
          });

          processed++;
          successful++;

          results.push({
            dealId: deal.id,
            dealName: deal.name,
            success: true,
            primary_reason: autopsy.primary_reason,
            confidence: autopsy.confidence,
            similar_open_deals: similarDeals.open.length,
          });

          // Rate limiting: wait 1 second between deals
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`[Deal Autopsy Cron] Error processing deal ${deal.id}:`, error);
          failed++;
          results.push({
            dealId: deal.id,
            dealName: deal.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < dealsToProcess.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(
      `[Deal Autopsy Cron] Completed: ${processed} processed, ${successful} successful, ${failed} failed`
    );

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} deals`,
      processed,
      successful,
      failed,
      total_closed: dealsNeedingAutopsy.length,
      results,
    });
  } catch (error) {
    console.error('[Deal Autopsy Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Deal autopsy cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
