/**
 * API: Single Executive Brief
 * Get, update, and send individual briefs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { executiveBriefService } from '@/lib/briefs/executive-brief-service';

interface RouteParams {
  params: Promise<{ briefId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { briefId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const brief = await executiveBriefService.getBrief(briefId);
    
    if (!brief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 });
    }
    
    return NextResponse.json(brief);
    
  } catch (error) {
    console.error('[API] Get brief error:', error);
    return NextResponse.json(
      { error: 'Failed to get brief' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { briefId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { action, recipients } = body;
    
    switch (action) {
      case 'send': {
        if (!recipients || recipients.length === 0) {
          return NextResponse.json({ error: 'Recipients required' }, { status: 400 });
        }
        
        const success = await executiveBriefService.sendBrief(briefId, recipients);
        
        if (!success) {
          return NextResponse.json({ error: 'Failed to send brief' }, { status: 500 });
        }
        
        return NextResponse.json({ success: true, message: 'Brief sent successfully' });
      }
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('[API] Brief action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { briefId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { error } = await supabase
      .from('executive_briefs')
      .delete()
      .eq('id', briefId);
    
    if (error) {
      return NextResponse.json({ error: 'Failed to delete brief' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[API] Delete brief error:', error);
    return NextResponse.json(
      { error: 'Failed to delete brief' },
      { status: 500 }
    );
  }
}
