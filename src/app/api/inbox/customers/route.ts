/**
 * API: Inbox Customers
 * List and manage unified customers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { InboxService } from '@/lib/inbox/inbox-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }
    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const churnRisk = searchParams.get('churnRisk') || undefined;
    const search = searchParams.get('search') || undefined;
    
    const inboxService = new InboxService(supabase);
    const result = await inboxService.listCustomers(
      projectId,
      { page, limit: Math.min(limit, 100) },
      { churnRisk, search }
    );
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] List customers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
