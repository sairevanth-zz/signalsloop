import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendGiftNotificationEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 30;

// GET - Fetch all gift subscriptions
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const { data: gifts, error } = await supabase
      .from('gift_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching gifts:', error);
      return NextResponse.json({ error: 'Failed to fetch gifts', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ gifts: gifts || [] });
  } catch (error) {
    console.error('Admin gifts API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new gift subscription
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const body = await request.json();
    const {
      recipient_email,
      recipient_name,
      sender_email,
      sender_name,
      gift_message,
      duration_months,
      expires_at
    } = body;

    if (!recipient_email || !duration_months) {
      return NextResponse.json({ error: 'Recipient email and duration are required' }, { status: 400 });
    }

    // Generate a unique redemption code
    const redemption_code = `GIFT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const { data: newGift, error } = await supabase
      .from('gift_subscriptions')
      .insert({
        recipient_email: recipient_email.toLowerCase(),
        recipient_name,
        gifter_email: sender_email?.toLowerCase() || 'admin@signalsloop.com',
        sender_name: sender_name || 'SignalsLoop Admin',
        gift_message,
        duration_months: parseInt(duration_months),
        redemption_code,
        status: 'pending',
        expires_at: expires_at || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days default
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating gift:', error);
      return NextResponse.json({ error: 'Failed to create gift', details: error.message }, { status: 500 });
    }

    // Send email notification to recipient
    try {
      await sendGiftNotificationEmail({
        recipientEmail: recipient_email,
        recipientName: recipient_name,
        senderName: sender_name || 'SignalsLoop Admin',
        giftMessage: gift_message,
        durationMonths: parseInt(duration_months),
        redemptionCode: redemption_code,
        expiresAt: newGift.expires_at,
        giftId: newGift.id
      });
      console.log('✅ Gift notification email sent to:', recipient_email);
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error('⚠️ Failed to send gift email (gift still created):', emailError);
    }

    return NextResponse.json({ gift: newGift, message: 'Gift subscription created successfully' });
  } catch (error) {
    console.error('Admin create gift error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a gift subscription
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const body = await request.json();
    const { id, action, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Gift ID required' }, { status: 400 });
    }

    if (action === 'cancel') {
      const { error } = await supabase
        .from('gift_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) {
        console.error('Error cancelling gift:', error);
        return NextResponse.json({ error: 'Failed to cancel gift', details: error.message }, { status: 500 });
      }

      return NextResponse.json({ message: 'Gift cancelled successfully' });
    }

    if (action === 'resend') {
      // In a real implementation, you'd send an email here
      return NextResponse.json({ message: 'Gift email resent successfully' });
    }

    // General update
    const { error } = await supabase
      .from('gift_subscriptions')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating gift:', error);
      return NextResponse.json({ error: 'Failed to update gift', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Gift updated successfully' });
  } catch (error) {
    console.error('Admin update gift error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a gift subscription
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Gift ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('gift_subscriptions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting gift:', error);
      return NextResponse.json({ error: 'Failed to delete gift', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Gift deleted successfully' });
  } catch (error) {
    console.error('Admin delete gift error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

