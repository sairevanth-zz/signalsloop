-- Email Notification System for SignalsLoop
-- Run this in your Supabase SQL Editor
-- This version drops existing tables first to ensure clean setup

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS email_batches CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS email_preferences CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.check_email_rate_limit(VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS public.increment_email_count(VARCHAR);
DROP FUNCTION IF EXISTS public.generate_unsubscribe_token();
DROP FUNCTION IF EXISTS public.should_send_email(VARCHAR, UUID, VARCHAR);

-- 1. Create email_preferences table
CREATE TABLE email_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID, -- Optional: for registered users (no foreign key)
  email VARCHAR(255), -- For anonymous users and as fallback
  
  -- Notification preferences
  status_change_emails BOOLEAN DEFAULT TRUE,
  comment_reply_emails BOOLEAN DEFAULT TRUE,
  vote_milestone_emails BOOLEAN DEFAULT TRUE,
  weekly_digest BOOLEAN DEFAULT FALSE,
  mention_emails BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  unsubscribe_token VARCHAR(255) UNIQUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- At least one identifier must be provided
  CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

-- 2. Create email_logs table
CREATE TABLE email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Email details
  email_type VARCHAR(50) NOT NULL,
  to_email VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) DEFAULT 'noreply@signalsloop.com',
  subject TEXT,
  
  -- Related entities
  post_id UUID,
  comment_id UUID,
  project_id UUID,
  
  -- Delivery tracking
  resend_id VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Metadata
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create email_batches table (for rate limiting)
CREATE TABLE email_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email VARCHAR(255) NOT NULL,
  batch_date DATE DEFAULT CURRENT_DATE,
  email_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(to_email, batch_date)
);

-- 4. Create indexes for performance
CREATE INDEX idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX idx_email_preferences_email ON email_preferences(email);
CREATE INDEX idx_email_preferences_unsubscribe_token ON email_preferences(unsubscribe_token);

CREATE INDEX idx_email_logs_post_id ON email_logs(post_id);
CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX idx_email_logs_resend_id ON email_logs(resend_id);

CREATE INDEX idx_email_batches_to_email_date ON email_batches(to_email, batch_date);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_batches ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for email_preferences
-- Allow service role full access (for API)
CREATE POLICY "Service role full access" ON email_preferences
  FOR ALL USING (true) WITH CHECK (true);

-- 7. RLS Policies for email_logs
-- Allow service role full access (for API)
CREATE POLICY "Service role full access" ON email_logs
  FOR ALL USING (true) WITH CHECK (true);

-- 8. RLS Policies for email_batches
-- Allow service role full access (for API)
CREATE POLICY "Service role full access" ON email_batches
  FOR ALL USING (true) WITH CHECK (true);

-- 9. Create function to check email rate limit
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

-- 10. Create function to increment email count
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

-- 11. Create function to generate unsubscribe token
CREATE OR REPLACE FUNCTION public.generate_unsubscribe_token()
RETURNS VARCHAR(255) AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 12. Create function to check if user wants emails
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

-- 13. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Create triggers for updated_at on email_preferences
DROP TRIGGER IF EXISTS update_email_preferences_updated_at ON email_preferences;
CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

-- 15. Create triggers for updated_at on email_batches
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
  RAISE NOTICE '  - email_preferences';
  RAISE NOTICE '  - email_logs';
  RAISE NOTICE '  - email_batches';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - check_email_rate_limit()';
  RAISE NOTICE '  - increment_email_count()';
  RAISE NOTICE '  - should_send_email()';
  RAISE NOTICE '  - generate_unsubscribe_token()';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Email notification system is ready!';
END $$;

