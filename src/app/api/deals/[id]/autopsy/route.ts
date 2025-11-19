/**
 * Deal Autopsy API
 * POST: Generate or regenerate autopsy for a specific deal
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateDealAutopsy, findSimilarDeals, updateBattlecardWithDeal } from '@/lib/ai-deal-autopsy';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow longer for AI processing

/**
 * POST /api/deals/[id]/autopsy
 * Generates autopsy analysis for a closed deal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    const dealId = params.id;

    if (!dealId) {
      return NextResponse.json(
        { success: false, error: 'Deal ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the deal
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Only generate autopsies for closed deals
    if (deal.status === 'open') {
      return NextResponse.json(
        { success: false, error: 'Cannot generate autopsy for open deals. Deal must be won or lost.' },
        { status: 400 }
      );
    }

    console.log(`[Deal Autopsy API] Generating autopsy for deal ${dealId} (${deal.name})`);

    // Generate autopsy using AI
    const autopsy = await generateDealAutopsy(deal);

    if (!autopsy) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate autopsy. AI service may be unavailable.' },
        { status: 500 }
      );
    }

    // Find similar deals
    const similarDeals = await findSimilarDeals(dealId, supabase);

    // Check if autopsy already exists
    const { data: existingAutopsy } = await supabase
      .from('deal_autopsies')
      .select('id, regenerated_count')
      .eq('deal_id', dealId)
      .single();

    const processingTimeMs = Date.now() - startTime;

    // Upsert autopsy
    const autopsyData = {
      deal_id: dealId,
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
      processing_time_ms: processingTimeMs,
      ...(existingAutopsy
        ? {
            regenerated_count: (existingAutopsy.regenerated_count || 0) + 1,
            last_regenerated_at: new Date().toISOString(),
          }
        : {
            generated_at: new Date().toISOString(),
            regenerated_count: 0,
          }),
    };

    const { data: savedAutopsy, error: autopsyError } = await supabase
      .from('deal_autopsies')
      .upsert(autopsyData, {
        onConflict: 'deal_id',
      })
      .select()
      .single();

    if (autopsyError) {
      console.error('[Deal Autopsy API] Error saving autopsy:', autopsyError);
      return NextResponse.json(
        { success: false, error: autopsyError.message },
        { status: 500 }
      );
    }

    // Update battlecard in background (don't wait for it)
    updateBattlecardWithDeal(deal.project_id, dealId, autopsy, supabase).catch(error => {
      console.error('[Deal Autopsy API] Error updating battlecard:', error);
    });

    console.log(`[Deal Autopsy API] Autopsy generated in ${processingTimeMs}ms for deal ${dealId}`);

    return NextResponse.json({
      success: true,
      message: existingAutopsy ? 'Autopsy regenerated successfully' : 'Autopsy generated successfully',
      autopsy: savedAutopsy,
      processing_time_ms: processingTimeMs,
      similar_deals: {
        open_count: similarDeals.open.length,
        lost_count: similarDeals.lost.length,
      },
    });
  } catch (error) {
    console.error('[Deal Autopsy API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate autopsy',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/deals/[id]/autopsy
 * Retrieves existing autopsy for a deal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealId = params.id;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: autopsy, error } = await supabase
      .from('deal_autopsies')
      .select('*, deals(*)')
      .eq('deal_id', dealId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Autopsy not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      autopsy,
    });
  } catch (error) {
    console.error('[Deal Autopsy API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch autopsy',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
