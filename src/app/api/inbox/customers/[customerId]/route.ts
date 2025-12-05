/**
 * API: Single Customer
 * Get and update customer details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { InboxService } from '@/lib/inbox/inbox-service';

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
    
    const inboxService = new InboxService(supabase);
    const customer = await inboxService.getCustomer(customerId);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    // Also get recent feedback for this customer
    const feedback = await inboxService.getCustomerFeedback(
      customer.projectId,
      customerId,
      10
    );
    
    return NextResponse.json({ customer, feedback });
    
  } catch (error) {
    console.error('[API] Get customer error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { customerId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    const inboxService = new InboxService(supabase);
    const success = await inboxService.updateCustomer(customerId, body);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
    }
    
    const customer = await inboxService.getCustomer(customerId);
    return NextResponse.json(customer);
    
  } catch (error) {
    console.error('[API] Update customer error:', error);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}
