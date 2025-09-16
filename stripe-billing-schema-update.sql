-- Stripe Billing Schema Update
-- Add missing billing fields to projects table and create billing_events table
-- Run this in your Supabase SQL Editor

-- 1. Add missing billing fields to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS downgraded_at TIMESTAMP WITH TIME ZONE;

-- 2. Create billing_events table for tracking Stripe events
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  amount INTEGER, -- Amount in cents
  currency VARCHAR(3) DEFAULT 'usd',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_subscription_status ON projects(subscription_status);
CREATE INDEX IF NOT EXISTS idx_projects_stripe_customer ON projects(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_current_period ON projects(current_period_end);
CREATE INDEX IF NOT EXISTS idx_billing_events_customer ON billing_events(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created ON billing_events(created_at DESC);

-- 4. Enable RLS on billing_events table
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for billing_events
-- Only project owners can view their billing events
CREATE POLICY "Project owners can view their billing events" ON billing_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.stripe_customer_id = billing_events.stripe_customer_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- 6. Update existing projects to have default values
UPDATE projects 
SET 
  subscription_status = CASE 
    WHEN plan = 'pro' THEN 'active'
    ELSE 'canceled'
  END,
  cancel_at_period_end = false
WHERE subscription_status IS NULL;

-- 7. Add constraints for data integrity
ALTER TABLE projects 
ADD CONSTRAINT check_subscription_status 
CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid'));

-- 8. Add helpful comments
COMMENT ON COLUMN projects.subscription_status IS 'Current subscription status from Stripe';
COMMENT ON COLUMN projects.subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN projects.current_period_end IS 'End of current billing period';
COMMENT ON COLUMN projects.cancel_at_period_end IS 'Whether subscription will cancel at period end';
COMMENT ON COLUMN projects.downgraded_at IS 'When the subscription was downgraded to free';

COMMENT ON TABLE billing_events IS 'Log of all Stripe billing events for audit trail';
COMMENT ON COLUMN billing_events.event_type IS 'Type of Stripe event (payment_succeeded, subscription_canceled, etc.)';
COMMENT ON COLUMN billing_events.amount IS 'Amount in cents';
COMMENT ON COLUMN billing_events.metadata IS 'Additional event metadata from Stripe';

-- Success message
SELECT 'Stripe billing schema update completed successfully!' as message;
