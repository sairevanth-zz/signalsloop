-- Add duration fields to discount_codes table for recurring discounts
-- This allows creating promotion codes like "3 months free" for Product Hunt launches

ALTER TABLE discount_codes
ADD COLUMN IF NOT EXISTS duration VARCHAR(20) DEFAULT 'once' CHECK (duration IN ('once', 'repeating', 'forever'));

ALTER TABLE discount_codes
ADD COLUMN IF NOT EXISTS duration_in_months INTEGER;

-- Add comments for clarity
COMMENT ON COLUMN discount_codes.duration IS 'Stripe coupon duration: once (one-time), repeating (multiple billing periods), or forever';
COMMENT ON COLUMN discount_codes.duration_in_months IS 'Number of months the discount applies (only for duration=repeating)';

-- Example: Product Hunt launch code (100% off for 3 months)
-- INSERT INTO discount_codes (code, description, discount_type, discount_value, duration, duration_in_months, usage_limit, valid_until)
-- VALUES ('PRODUCTHUNT', 'Product Hunt launch special - 3 months free', 'percentage', 100, 'repeating', 3, 200, NOW() + INTERVAL '1 month');
