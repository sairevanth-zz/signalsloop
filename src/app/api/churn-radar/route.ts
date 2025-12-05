/**
 * API: Churn Radar
 * Customer health and churn prediction endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { churnRadarService } from '@/lib/churn-radar';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const action = searchParams.get('action') || 'summary';
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }
    
    switch (action) {
      case 'summary': {
        const summary = await churnRadarService.getSummary(projectId);
        return NextResponse.json(summary);
      }
      
      case 'customers': {
        const riskLevel = searchParams.get('riskLevel') as any || 'all';
        const sortBy = searchParams.get('sortBy') as any || 'healthScore';
        const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'asc';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        
        const result = await churnRadarService.listCustomers(projectId, {
          riskLevel,
          sortBy,
          sortOrder,
          page,
          limit: Math.min(limit, 100),
        });
        
        return NextResponse.json(result);
      }
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('[API] Churn radar error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch churn data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { projectId, action, customerData } = body;
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }
    
    switch (action) {
      case 'calculate': {
        if (!customerData) {
          return NextResponse.json({ error: 'Customer data required' }, { status: 400 });
        }
        
        const health = await churnRadarService.calculateAndUpdateHealth(projectId, customerData);
        return NextResponse.json({ health });
      }
      
      case 'batch': {
        const result = await churnRadarService.batchCalculateHealth(projectId);
        return NextResponse.json(result);
      }
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('[API] Churn radar post error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
