import { NextResponse } from 'next/server';
import { z } from 'zod';
import { secureAPI, validateAdminAuth } from '@/lib/api-security';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { createStripePromotionCode, updateStripePromotionCode, deleteStripePromotionCode } from '@/lib/stripe-discount-sync';

export const runtime = 'nodejs';
export const maxDuration = 30;

// GET - Fetch all discount codes
export const GET = secureAPI(
  async () => {
    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const { data: codes, error } = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching discount codes:', error);
      return NextResponse.json({ error: 'Failed to fetch discount codes', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ codes: codes || [] });
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
  }
);

// POST - Create a new discount code
export const POST = secureAPI(
  async ({ body }) => {
    const {
      code,
      description,
      discount_type,
      discount_value,
      min_amount,
      max_discount,
      usage_limit,
      valid_until,
      target_email,
      duration,
      duration_in_months
    } = body!;

    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Check if code already exists
    const { data: existingCode } = await supabase
      .from('discount_codes')
      .select('id')
      .eq('code', code.toUpperCase())
      .single();

    if (existingCode) {
      return NextResponse.json({ error: 'Discount code already exists' }, { status: 400 });
    }

    // First, create the code in Stripe
    let stripeCouponId: string | undefined;
    let stripePromotionCodeId: string | undefined;
    let stripeSyncError: string | undefined;
    let syncedToStripe = false;

    try {
      const stripeResult = await createStripePromotionCode({
        code: code.toUpperCase(),
        discountType: discount_type,
        discountValue: discount_value,
        maxRedemptions: usage_limit,
        expiresAt: valid_until,
        duration: duration || 'once',
        durationInMonths: duration_in_months,
        metadata: {
          source: 'signalsloop_admin',
          description: description || ''
        }
      });

      stripeCouponId = stripeResult.couponId;
      stripePromotionCodeId = stripeResult.promotionCodeId;
      syncedToStripe = true;

      console.log('✅ Created Stripe promotion code:', stripeResult.code);
    } catch (stripeError) {
      console.error('⚠️ Failed to create Stripe promotion code (will create discount code anyway):', stripeError);
      stripeSyncError = stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error';
    }

    // Then create in database (even if Stripe fails)
    const { data: newCode, error } = await supabase
      .from('discount_codes')
      .insert({
        code: code.toUpperCase(),
        description,
        discount_type,
        discount_value,
        min_amount: min_amount || 0,
        max_discount,
        usage_limit,
        valid_from: new Date().toISOString(),
        valid_until,
        target_email,
        duration: duration || 'once',
        duration_in_months,
        is_active: true,
        usage_count: 0,
        stripe_coupon_id: stripeCouponId,
        stripe_promotion_code_id: stripePromotionCodeId,
        synced_to_stripe: syncedToStripe,
        stripe_sync_error: stripeSyncError
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating discount code:', error);
      return NextResponse.json({ error: 'Failed to create discount code', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      code: newCode,
      message: syncedToStripe
        ? 'Discount code created and synced to Stripe successfully'
        : 'Discount code created (Stripe sync failed - check logs)',
      stripeSynced: syncedToStripe
    });
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
    bodySchema: z.object({
      code: z.string().min(1),
      description: z.string().optional(),
      discount_type: z.enum(['percentage', 'fixed']),
      discount_value: z.number().positive(),
      min_amount: z.number().optional(),
      max_discount: z.number().optional(),
      usage_limit: z.number().int().positive().optional(),
      valid_until: z.string().optional(),
      target_email: z.string().email().optional(),
      duration: z.enum(['once', 'repeating', 'forever']).optional(),
      duration_in_months: z.number().int().positive().optional(),
    }),
  }
);

// PATCH - Update a discount code
export const PATCH = secureAPI(
  async ({ body }) => {
    const { id, action, ...updates } = body!;

    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    if (action === 'toggle') {
      // Get current code
      const { data: currentCode } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('id', id)
        .single();

      if (!currentCode) {
        return NextResponse.json({ error: 'Discount code not found' }, { status: 404 });
      }

      const newStatus = !currentCode.is_active;

      // Update in Stripe if synced
      if (currentCode.stripe_promotion_code_id) {
        try {
          await updateStripePromotionCode(currentCode.stripe_promotion_code_id, newStatus);
          console.log('✅ Updated Stripe promotion code status');
        } catch (stripeError) {
          console.error('⚠️ Failed to update Stripe promotion code:', stripeError);
        }
      }

      // Update in database
      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active: newStatus })
        .eq('id', id);

      if (error) {
        console.error('Error toggling discount code:', error);
        return NextResponse.json({ error: 'Failed to toggle discount code', details: error.message }, { status: 500 });
      }

      return NextResponse.json({ message: 'Discount code toggled successfully' });
    }

    // Update discount code
    const { error } = await supabase
      .from('discount_codes')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating discount code:', error);
      return NextResponse.json({ error: 'Failed to update discount code', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Discount code updated successfully' });
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
    bodySchema: z.object({
      id: z.string().uuid(),
      action: z.enum(['toggle']).optional(),
      // Allow additional fields for updates
    }).passthrough(),
  }
);

// DELETE - Delete a discount code
export const DELETE = secureAPI(
  async ({ query }) => {
    const { id } = query!;

    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Get the discount code to get Stripe IDs
    const { data: discountCode } = await supabase
      .from('discount_codes')
      .select('stripe_coupon_id, stripe_promotion_code_id')
      .eq('id', id)
      .single();

    // Delete from Stripe if synced
    if (discountCode?.stripe_coupon_id) {
      try {
        await deleteStripePromotionCode(discountCode.stripe_coupon_id);
        console.log('✅ Deleted Stripe coupon');
      } catch (stripeError) {
        console.error('⚠️ Failed to delete Stripe coupon (will delete from database anyway):', stripeError);
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('discount_codes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting discount code:', error);
      return NextResponse.json({ error: 'Failed to delete discount code', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Discount code deleted successfully' });
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
