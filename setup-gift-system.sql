-- Simplified Gift Subscription Setup
-- Run this in your Supabase SQL Editor

-- 1. Create gift_subscriptions table
CREATE TABLE IF NOT EXISTS gift_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  gifter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  gifter_email VARCHAR(255) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  gift_type VARCHAR(50) DEFAULT 'pro' CHECK (gift_type IN ('pro', 'enterprise')),
  duration_months INTEGER DEFAULT 1 CHECK (duration_months > 0),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  gift_message TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_gift_subscriptions_project ON gift_subscriptions(project_id);
CREATE INDEX IF NOT EXISTS idx_gift_subscriptions_gifter ON gift_subscriptions(gifter_id);
CREATE INDEX IF NOT EXISTS idx_gift_subscriptions_recipient ON gift_subscriptions(recipient_email);
CREATE INDEX IF NOT EXISTS idx_gift_subscriptions_status ON gift_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_gift_subscriptions_expires ON gift_subscriptions(expires_at);

-- 3. Enable RLS
ALTER TABLE gift_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Project owners can view gifts" ON gift_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = gift_subscriptions.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can create gifts" ON gift_subscriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = gift_subscriptions.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can update gifts" ON gift_subscriptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = gift_subscriptions.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Recipients can view own gifts" ON gift_subscriptions
  FOR SELECT USING (
    recipient_id = auth.uid() OR recipient_email = auth.email()
  );

CREATE POLICY "Recipients can claim gifts" ON gift_subscriptions
  FOR UPDATE USING (
    recipient_id = auth.uid() OR recipient_email = auth.email()
  );

-- 5. Create function to create gift subscriptions
CREATE OR REPLACE FUNCTION public.create_gift_subscription(
  p_project_id UUID,
  p_recipient_email VARCHAR(255),
  p_duration_months INTEGER DEFAULT 1,
  p_gift_message TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  gift_id UUID;
  expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if user has permission to gift for this project
  IF NOT EXISTS (
    SELECT 1 FROM projects 
    WHERE id = p_project_id 
    AND owner_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized to gift for this project');
  END IF;
  
  -- Set expiry date (gifts expire after 30 days if not claimed)
  expires_at := NOW() + INTERVAL '30 days';
  
  -- Create the gift
  INSERT INTO gift_subscriptions (
    project_id,
    gifter_id,
    gifter_email,
    recipient_email,
    gift_type,
    duration_months,
    expires_at,
    gift_message
  ) VALUES (
    p_project_id,
    auth.uid(),
    auth.email(),
    p_recipient_email,
    'pro',
    p_duration_months,
    expires_at,
    p_gift_message
  ) RETURNING id INTO gift_id;
  
  RETURN json_build_object(
    'success', true, 
    'gift_id', gift_id,
    'expires_at', expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to claim gift subscriptions
CREATE OR REPLACE FUNCTION public.claim_gift_subscription(gift_id UUID)
RETURNS JSON AS $$
DECLARE
  gift_record gift_subscriptions%ROWTYPE;
  project_record projects%ROWTYPE;
  new_expiry_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the gift record
  SELECT * INTO gift_record FROM gift_subscriptions WHERE id = gift_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Gift not found');
  END IF;
  
  -- Check if gift is still valid
  IF gift_record.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Gift already claimed or expired');
  END IF;
  
  IF gift_record.expires_at < NOW() THEN
    UPDATE gift_subscriptions SET status = 'expired' WHERE id = gift_id;
    RETURN json_build_object('success', false, 'error', 'Gift has expired');
  END IF;
  
  -- Get the project
  SELECT * INTO project_record FROM projects WHERE id = gift_record.project_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Project not found');
  END IF;
  
  -- Calculate new expiry date
  new_expiry_date := COALESCE(project_record.current_period_end, NOW()) + (gift_record.duration_months || ' months')::INTERVAL;
  
  -- Update the project to Pro plan
  UPDATE projects 
  SET 
    plan = 'pro',
    current_period_end = new_expiry_date,
    subscription_status = 'active',
    updated_at = NOW()
  WHERE id = gift_record.project_id;
  
  -- Update the gift status
  UPDATE gift_subscriptions 
  SET 
    status = 'claimed',
    claimed_at = NOW(),
    recipient_id = auth.uid(),
    updated_at = NOW()
  WHERE id = gift_id;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Gift claimed successfully',
    'expires_at', new_expiry_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to get gift statistics
CREATE OR REPLACE FUNCTION public.get_gift_stats(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
  total_gifts INTEGER;
  pending_gifts INTEGER;
  claimed_gifts INTEGER;
  expired_gifts INTEGER;
BEGIN
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'claimed') as claimed,
    COUNT(*) FILTER (WHERE status = 'expired') as expired
  INTO total_gifts, pending_gifts, claimed_gifts, expired_gifts
  FROM gift_subscriptions 
  WHERE project_id = p_project_id;
  
  RETURN json_build_object(
    'total_gifts', total_gifts,
    'pending_gifts', pending_gifts,
    'claimed_gifts', claimed_gifts,
    'expired_gifts', expired_gifts
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger for updated_at (if update_updated_at_column function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_gift_subscriptions_updated_at ON gift_subscriptions;
    CREATE TRIGGER update_gift_subscriptions_updated_at
        BEFORE UPDATE ON gift_subscriptions
        FOR EACH ROW
        EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

-- Success message
SELECT 'Gift subscription system setup completed successfully!' as message;
