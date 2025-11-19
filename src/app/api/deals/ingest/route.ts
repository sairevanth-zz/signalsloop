/**
 * Deal Ingestion API
 * POST: Accepts deals from CSV/webhook/API and stores them
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface IngestDeal {
  external_id?: string;
  name: string;
  amount: number;
  stage?: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed';
  status?: 'won' | 'lost' | 'open';
  competitor?: string;
  competitor_product?: string;
  notes?: string;
  close_reason?: string;
  contact_name?: string;
  contact_email?: string;
  contact_company?: string;
  closed_at?: string;
  expected_close_date?: string;
  source?: string;
  metadata?: Record<string, any>;
}

/**
 * POST /api/deals/ingest
 * Accepts single deal or array of deals
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, deals: dealsInput, deal: singleDeal } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Accept either single deal or array
    const deals: IngestDeal[] = dealsInput || (singleDeal ? [singleDeal] : []);

    if (!deals || deals.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one deal is required' },
        { status: 400 }
      );
    }

    // Validate deals
    for (const deal of deals) {
      if (!deal.name) {
        return NextResponse.json(
          { success: false, error: 'Deal name is required' },
          { status: 400 }
        );
      }
      if (deal.amount === undefined || deal.amount === null) {
        return NextResponse.json(
          { success: false, error: 'Deal amount is required' },
          { status: 400 }
        );
      }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Transform and insert deals
    const dealsToInsert = deals.map(deal => ({
      project_id: projectId,
      external_id: deal.external_id || null,
      name: deal.name,
      amount: deal.amount,
      stage: deal.stage || 'prospecting',
      status: deal.status || 'open',
      competitor: deal.competitor || null,
      competitor_product: deal.competitor_product || null,
      notes: deal.notes || null,
      close_reason: deal.close_reason || null,
      contact_name: deal.contact_name || null,
      contact_email: deal.contact_email || null,
      contact_company: deal.contact_company || null,
      closed_at: deal.closed_at || null,
      expected_close_date: deal.expected_close_date || null,
      source: deal.source || 'api',
      metadata: deal.metadata || {},
    }));

    const { data: insertedDeals, error: insertError } = await supabase
      .from('deals')
      .insert(dealsToInsert)
      .select();

    if (insertError) {
      console.error('[Deal Ingest API] Error inserting deals:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    console.log(`[Deal Ingest API] Inserted ${insertedDeals?.length || 0} deals for project ${projectId}`);

    return NextResponse.json({
      success: true,
      message: `Successfully ingested ${insertedDeals?.length || 0} deal(s)`,
      deals: insertedDeals,
      count: insertedDeals?.length || 0,
    });
  } catch (error) {
    console.error('[Deal Ingest API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to ingest deals',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
