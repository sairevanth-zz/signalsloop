import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

interface CreateStripePromotionCodeParams {
  code: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  maxRedemptions?: number;
  expiresAt?: string;
  metadata?: Record<string, string>;
}

export async function createStripePromotionCode({
  code,
  discountType,
  discountValue,
  maxRedemptions,
  expiresAt,
  metadata = {}
}: CreateStripePromotionCodeParams) {
  try {
    // First, create a coupon
    const couponParams: Stripe.CouponCreateParams = {
      name: code,
      metadata: {
        ...metadata,
        source: 'signalsloop_admin'
      }
    };

    if (discountType === 'percentage') {
      couponParams.percent_off = discountValue;
    } else {
      // Stripe expects amount in cents
      couponParams.amount_off = Math.round(discountValue * 100);
      couponParams.currency = 'usd';
    }

    if (expiresAt) {
      // Stripe expects Unix timestamp
      couponParams.redeem_by = Math.floor(new Date(expiresAt).getTime() / 1000);
    }

    if (maxRedemptions) {
      couponParams.max_redemptions = maxRedemptions;
    }

    // Coupons can only be used for subscription payments
    couponParams.applies_to = {
      products: [] // Empty means all products
    };

    const coupon = await stripe.coupons.create(couponParams);

    // Then, create a promotion code using the coupon
    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: code.toUpperCase(),
      active: true,
      metadata: {
        ...metadata,
        source: 'signalsloop_admin',
        signalsloop_code: code
      }
    });

    return {
      success: true,
      couponId: coupon.id,
      promotionCodeId: promotionCode.id,
      code: promotionCode.code
    };
  } catch (error) {
    console.error('Error creating Stripe promotion code:', error);
    
    // If promotion code already exists, try to retrieve it
    if (error instanceof Stripe.errors.StripeError && error.code === 'resource_already_exists') {
      try {
        const existingPromotionCodes = await stripe.promotionCodes.list({
          code: code.toUpperCase(),
          limit: 1
        });

        if (existingPromotionCodes.data.length > 0) {
          const existing = existingPromotionCodes.data[0];
          return {
            success: true,
            couponId: existing.coupon.id,
            promotionCodeId: existing.id,
            code: existing.code,
            alreadyExists: true
          };
        }
      } catch (retrieveError) {
        console.error('Error retrieving existing promotion code:', retrieveError);
      }
    }

    throw error;
  }
}

export async function updateStripePromotionCode(
  promotionCodeId: string,
  active: boolean
) {
  try {
    const promotionCode = await stripe.promotionCodes.update(promotionCodeId, {
      active
    });

    return {
      success: true,
      promotionCodeId: promotionCode.id,
      active: promotionCode.active
    };
  } catch (error) {
    console.error('Error updating Stripe promotion code:', error);
    throw error;
  }
}

export async function deleteStripePromotionCode(couponId: string) {
  try {
    // Delete the coupon (this also invalidates all promotion codes using it)
    await stripe.coupons.del(couponId);

    return {
      success: true,
      message: 'Stripe coupon deleted'
    };
  } catch (error) {
    console.error('Error deleting Stripe coupon:', error);
    throw error;
  }
}

export async function getStripeCouponUsage(couponId: string) {
  try {
    const coupon = await stripe.coupons.retrieve(couponId);

    return {
      success: true,
      timesRedeemed: coupon.times_redeemed || 0,
      valid: coupon.valid,
      redeemedBy: coupon.redeem_by
    };
  } catch (error) {
    console.error('Error retrieving Stripe coupon usage:', error);
    throw error;
  }
}

export async function syncDiscountCodeToStripe(discountCode: {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  usage_limit?: number;
  valid_until?: string;
}) {
  try {
    const result = await createStripePromotionCode({
      code: discountCode.code,
      discountType: discountCode.discount_type,
      discountValue: discountCode.discount_value,
      maxRedemptions: discountCode.usage_limit,
      expiresAt: discountCode.valid_until,
      metadata: {
        signalsloop_discount_id: discountCode.id
      }
    });

    return result;
  } catch (error) {
    console.error('Error syncing discount code to Stripe:', error);
    throw error;
  }
}

