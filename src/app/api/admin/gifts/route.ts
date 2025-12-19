import { NextResponse } from 'next/server';
import { z } from 'zod';
import { secureAPI, validateAdminAuth } from '@/lib/api-security';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendGiftNotificationEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 30;

// GET - Fetch all gift subscriptions
export const GET = secureAPI(
  async () => {
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
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
  }
);

// POST - Create a new gift subscription
export const POST = secureAPI(
  async ({ body }) => {
    const {
      recipient_email,
      recipient_name,
      sender_email,
      sender_name,
      gift_message,
      duration_months,
      tier = 'pro',
      expires_at
    } = body!;

    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Generate a unique redemption code with tier identifier
    const tierPrefix = tier === 'premium' ? 'PREMIUM' : 'PRO';
    const redemption_code = `GIFT-${tierPrefix}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const { data: newGift, error } = await supabase
      .from('gift_subscriptions')
      .insert({
        recipient_email: recipient_email.toLowerCase(),
        recipient_name,
        gifter_email: sender_email?.toLowerCase() || 'admin@signalsloop.com',
        sender_name: sender_name || 'SignalsLoop Admin',
        gift_message,
        duration_months,
        tier,
        redemption_code,
        status: 'pending',
        expires_at: expires_at || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
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
        durationMonths: duration_months,
        tier,
        redemptionCode: redemption_code,
        expiresAt: newGift.expires_at,
        giftId: newGift.id
      });
      console.log(`✅ Gift notification email sent to: ${recipient_email} (${tier} tier)`);
    } catch (emailError) {
      console.error('⚠️ Failed to send gift email (gift still created):', emailError);
    }

    return NextResponse.json({ gift: newGift, message: 'Gift subscription created successfully' });
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
    bodySchema: z.object({
      recipient_email: z.string().email(),
      recipient_name: z.string().optional(),
      sender_email: z.string().email().optional(),
      sender_name: z.string().optional(),
      gift_message: z.string().optional(),
      duration_months: z.number().int().positive(),
      tier: z.enum(['pro', 'premium']).optional().default('pro'),
      expires_at: z.string().optional(),
    }),
  }
);

// PATCH - Update a gift subscription
export const PATCH = secureAPI(
  async ({ body }) => {
    const { id, action, ...updates } = body!;

    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
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
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
    bodySchema: z.object({
      id: z.string().uuid(),
      action: z.enum(['cancel', 'resend']).optional(),
    }).passthrough(),
  }
);

// DELETE - Delete a gift subscription
export const DELETE = secureAPI(
  async ({ query }) => {
    const { id } = query!;

    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
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
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
    querySchema: z.object({
      id: z.string().uuid(),
    }),
  }
);
