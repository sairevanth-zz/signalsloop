/**
 * API: Single Customer Health
 * Get and update individual customer health
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { churnRadarService } from '@/lib/churn-radar';

interface RouteParams {
  params: Promise<{ customerId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { customerId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const includeHistory = searchParams.get('includeHistory') === 'true';
    
    const health = await churnRadarService.getCustomerHealth(customerId);
    
    if (!health) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    let history = [];
    if (includeHistory) {
      history = await churnRadarService.getHealthHistory(customerId);
    }
    
    return NextResponse.json({ health, history });
    
  } catch (error) {
    console.error('[API] Get customer health error:', error);
    return NextResponse.json(
      { error: 'Failed to get customer health' },
      { status: 500 }
    );
  }
}
