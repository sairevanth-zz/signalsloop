-- Add redemption code and recipient name columns to gift_subscriptions table
-- Run this in your Supabase SQL Editor

ALTER TABLE gift_subscriptions 
ADD COLUMN IF NOT EXISTS redemption_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255);

-- Create index for redemption code lookups
CREATE INDEX IF NOT EXISTS idx_gift_subscriptions_redemption_code ON gift_subscriptions(redemption_code);

-- Make redemption code unique
ALTER TABLE gift_subscriptions 
ADD CONSTRAINT unique_redemption_code UNIQUE (redemption_code);

-- Add comments
COMMENT ON COLUMN gift_subscriptions.redemption_code IS 'Unique code for claiming the gift';
COMMENT ON COLUMN gift_subscriptions.recipient_name IS 'Name of the gift recipient';
COMMENT ON COLUMN gift_subscriptions.sender_name IS 'Name of the person giving the gift';

