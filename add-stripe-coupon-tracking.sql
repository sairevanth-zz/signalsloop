-- Add Stripe coupon tracking to discount_codes table
-- Run this in your Supabase SQL Editor

ALTER TABLE discount_codes 
ADD COLUMN IF NOT EXISTS stripe_coupon_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_promotion_code_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS synced_to_stripe BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_sync_error TEXT;

-- Create index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_discount_codes_stripe_coupon ON discount_codes(stripe_coupon_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_stripe_promo ON discount_codes(stripe_promotion_code_id);

-- Add comments
COMMENT ON COLUMN discount_codes.stripe_coupon_id IS 'Stripe coupon ID for this discount code';
COMMENT ON COLUMN discount_codes.stripe_promotion_code_id IS 'Stripe promotion code ID';
COMMENT ON COLUMN discount_codes.synced_to_stripe IS 'Whether this code has been synced to Stripe';
COMMENT ON COLUMN discount_codes.stripe_sync_error IS 'Last error when syncing to Stripe, if any';

