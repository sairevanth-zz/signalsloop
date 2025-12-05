/**
 * API: Single Inbox Item
 * Get, update, and manage individual feedback items
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { InboxService } from '@/lib/inbox/inbox-service';

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const inboxService = new InboxService(supabase);
    const item = await inboxService.getItem(itemId);
    
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    return NextResponse.json(item);
    
  } catch (error) {
    console.error('[API] Get inbox item error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inbox item' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { action, ...data } = body;
    
    const inboxService = new InboxService(supabase);
    let success = false;
    
    switch (action) {
      case 'markRead':
        success = await inboxService.markAsRead(itemId, user.id);
        break;
        
      case 'toggleStarred':
        success = await inboxService.toggleStarred(itemId);
        break;
        
      case 'archive':
        success = await inboxService.archiveItem(itemId);
        break;
        
      case 'spam':
        success = await inboxService.markAsSpam(itemId);
        break;
        
      case 'updateStatus':
        if (!data.status) {
          return NextResponse.json({ error: 'Status required' }, { status: 400 });
        }
        success = await inboxService.updateStatus(itemId, data.status);
        break;
        
      case 'reply':
        if (!data.content || !data.sentVia) {
          return NextResponse.json({ error: 'Reply content and sentVia required' }, { status: 400 });
        }
        success = await inboxService.recordReply(itemId, user.id, data.content, data.sentVia);
        break;
        
      case 'convert':
        if (!data.postId) {
          return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
        }
        success = await inboxService.convertToPost(itemId, user.id, data.postId);
        break;
        
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    
    if (!success) {
      return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
    }
    
    // Return updated item
    const updatedItem = await inboxService.getItem(itemId);
    return NextResponse.json(updatedItem);
    
  } catch (error) {
    console.error('[API] Update inbox item error:', error);
    return NextResponse.json(
      { error: 'Failed to update inbox item' },
      { status: 500 }
    );
  }
}
