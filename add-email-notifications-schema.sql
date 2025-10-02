-- Email Notification System for SignalsLoop
-- Run this in your Supabase SQL Editor

-- 1. Create email_preferences table
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255), -- For anonymous users
  
  -- Notification preferences
  status_change_emails BOOLEAN DEFAULT TRUE,
  comment_reply_emails BOOLEAN DEFAULT TRUE,
  vote_milestone_emails BOOLEAN DEFAULT TRUE, -- When post reaches 10, 25, 50 votes
  weekly_digest BOOLEAN DEFAULT FALSE,
  mention_emails BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  unsubscribe_token VARCHAR(255) UNIQUE, -- For one-click unsubscribe
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one preference per user/email
  UNIQUE(user_id),
  UNIQUE(email)
);

-- 2. Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Email details
  email_type VARCHAR(50) NOT NULL, -- 'status_change', 'comment', 'confirmation', 'vote_milestone', 'mention', 'weekly_digest'
  to_email VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) DEFAULT 'noreply@signalsloop.com',
  subject TEXT,
  
  -- Related entities
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Delivery tracking
  resend_id VARCHAR(255), -- Resend email ID for tracking
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Metadata
  metadata JSONB, -- Store additional data like old_status, new_status, etc.
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create email_batches table (for rate limiting and batching)
CREATE TABLE IF NOT EXISTS email_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email VARCHAR(255) NOT NULL,
  batch_date DATE DEFAULT CURRENT_DATE,
  email_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(to_email, batch_date)
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_preferences_email ON email_preferences(email);
CREATE INDEX IF NOT EXISTS idx_email_preferences_unsubscribe_token ON email_preferences(unsubscribe_token);

CREATE INDEX IF NOT EXISTS idx_email_logs_post_id ON email_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON email_logs(resend_id);

CREATE INDEX IF NOT EXISTS idx_email_batches_to_email_date ON email_batches(to_email, batch_date);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_batches ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for email_preferences
-- Users can view and update their own preferences
CREATE POLICY "Users can view own email preferences" ON email_preferences
  FOR SELECT USING (
    auth.uid() = user_id OR 
    email = auth.jwt()->>'email'
  );

CREATE POLICY "Users can update own email preferences" ON email_preferences
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    email = auth.jwt()->>'email'
  );

-- Anyone can create email preferences (for anonymous users)
CREATE POLICY "Anyone can create email preferences" ON email_preferences
  FOR INSERT WITH CHECK (true);

-- 7. RLS Policies for email_logs (admin only)
CREATE POLICY "Project owners can view email logs" ON email_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = email_logs.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- 8. Create function to check email rate limit
CREATE OR REPLACE FUNCTION public.check_email_rate_limit(
  p_email VARCHAR(255),
  p_max_per_day INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Get today's email count
  SELECT COALESCE(email_count, 0) INTO current_count
  FROM email_batches
  WHERE to_email = p_email
  AND batch_date = CURRENT_DATE;
  
  -- Return true if under limit
  RETURN (current_count < p_max_per_day);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to increment email count
CREATE OR REPLACE FUNCTION public.increment_email_count(
  p_email VARCHAR(255)
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO email_batches (to_email, batch_date, email_count)
  VALUES (p_email, CURRENT_DATE, 1)
  ON CONFLICT (to_email, batch_date) DO UPDATE SET
    email_count = email_batches.email_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to generate unsubscribe token
CREATE OR REPLACE FUNCTION public.generate_unsubscribe_token()
RETURNS VARCHAR(255) AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 11. Create function to check if user wants emails
CREATE OR REPLACE FUNCTION public.should_send_email(
  p_email VARCHAR(255),
  p_user_id UUID,
  p_email_type VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
  prefs RECORD;
  can_send BOOLEAN := FALSE;
BEGIN
  -- Get user preferences
  SELECT * INTO prefs
  FROM email_preferences
  WHERE (user_id = p_user_id OR email = p_email)
  AND unsubscribed_at IS NULL;
  
  -- If no preferences exist, default to TRUE (opt-in)
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific preference based on email type
  CASE p_email_type
    WHEN 'status_change' THEN can_send := prefs.status_change_emails;
    WHEN 'comment' THEN can_send := prefs.comment_reply_emails;
    WHEN 'vote_milestone' THEN can_send := prefs.vote_milestone_emails;
    WHEN 'mention' THEN can_send := prefs.mention_emails;
    WHEN 'weekly_digest' THEN can_send := prefs.weekly_digest;
    ELSE can_send := TRUE; -- Default for new types
  END CASE;
  
  RETURN can_send;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create trigger for updated_at on email_preferences
DROP TRIGGER IF EXISTS update_email_preferences_updated_at ON email_preferences;
CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

-- 13. Create trigger for updated_at on email_batches
DROP TRIGGER IF EXISTS update_email_batches_updated_at ON email_batches;
CREATE TRIGGER update_email_batches_updated_at
  BEFORE UPDATE ON email_batches
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Email notification system schema created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - email_preferences (user notification settings)';
  RAISE NOTICE '  - email_logs (delivery tracking)';
  RAISE NOTICE '  - email_batches (rate limiting)';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - check_email_rate_limit() - Prevent spam';
  RAISE NOTICE '  - increment_email_count() - Track daily sends';
  RAISE NOTICE '  - should_send_email() - Check preferences';
  RAISE NOTICE '  - generate_unsubscribe_token() - One-click unsubscribe';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next: Run this SQL script in Supabase!';
END $$;

