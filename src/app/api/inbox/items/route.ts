/**
 * API: Inbox Items
 * List and manage unified feedback items
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { InboxService } from '@/lib/inbox/inbox-service';
import {
  InboxFilters,
  InboxSortOptions,
  InboxPagination,
  FeedbackStatus,
  FeedbackCategory,
  IntegrationType,
} from '@/lib/inbox/types';

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
    
    // Build filters from query params
    const filters: InboxFilters = {};
    
    const status = searchParams.get('status');
    if (status) {
      filters.status = status.includes(',') 
        ? status.split(',') as FeedbackStatus[]
        : status as FeedbackStatus;
    }
    
    const category = searchParams.get('category');
    if (category) {
      filters.category = category.includes(',')
        ? category.split(',') as FeedbackCategory[]
        : category as FeedbackCategory;
    }
    
    const sourceType = searchParams.get('sourceType');
    if (sourceType) {
      filters.sourceType = sourceType.includes(',')
        ? sourceType.split(',') as IntegrationType[]
        : sourceType as IntegrationType;
    }
    
    const sentimentMin = searchParams.get('sentimentMin');
    if (sentimentMin) filters.sentimentMin = parseFloat(sentimentMin);
    
    const sentimentMax = searchParams.get('sentimentMax');
    if (sentimentMax) filters.sentimentMax = parseFloat(sentimentMax);
    
    const urgencyMin = searchParams.get('urgencyMin');
    if (urgencyMin) filters.urgencyMin = parseInt(urgencyMin, 10);
    
    const starred = searchParams.get('starred');
    if (starred) filters.starred = starred === 'true';
    
    const customerId = searchParams.get('customerId');
    if (customerId) filters.customerId = customerId;
    
    const search = searchParams.get('search');
    if (search) filters.search = search;
    
    const dateFrom = searchParams.get('dateFrom');
    if (dateFrom) filters.dateFrom = dateFrom;
    
    const dateTo = searchParams.get('dateTo');
    if (dateTo) filters.dateTo = dateTo;
    
    const tags = searchParams.get('tags');
    if (tags) filters.tags = tags.split(',');
    
    // Build sort options
    const sortField = searchParams.get('sortField') || 'originalCreatedAt';
    const sortDirection = searchParams.get('sortDirection') || 'desc';
    const sort: InboxSortOptions = {
      field: sortField as InboxSortOptions['field'],
      direction: sortDirection as 'asc' | 'desc',
    };
    
    // Build pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const pagination: InboxPagination = { page, limit: Math.min(limit, 100) };
    
    // Fetch items
    const inboxService = new InboxService(supabase);
    const result = await inboxService.listItems(projectId, filters, sort, pagination);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] Inbox items error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inbox items' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { itemIds, action, ...params } = body;
    
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'Item IDs required' }, { status: 400 });
    }
    
    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 });
    }
    
    const inboxService = new InboxService(supabase);
    let success = false;
    
    switch (action) {
      case 'markRead':
        for (const itemId of itemIds) {
          await inboxService.markAsRead(itemId, user.id);
        }
        success = true;
        break;
        
      case 'archive':
        success = await inboxService.bulkUpdateStatus(itemIds, 'archived');
        break;
        
      case 'spam':
        success = await inboxService.bulkUpdateStatus(itemIds, 'spam');
        break;
        
      case 'updateStatus':
        if (!params.status) {
          return NextResponse.json({ error: 'Status required' }, { status: 400 });
        }
        success = await inboxService.bulkUpdateStatus(itemIds, params.status);
        break;
        
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    
    return NextResponse.json({ success });
    
  } catch (error) {
    console.error('[API] Inbox items patch error:', error);
    return NextResponse.json(
      { error: 'Failed to update inbox items' },
      { status: 500 }
    );
  }
}
