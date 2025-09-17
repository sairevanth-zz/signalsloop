-- Add Discount Codes system to SignalsLoop
-- Run this in your Supabase SQL Editor

-- 1. Create discount_codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_amount DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  target_email VARCHAR(255), -- Email-specific discount codes
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create discount_code_usage table
CREATE TABLE IF NOT EXISTS discount_code_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_code_id UUID REFERENCES discount_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  amount_discounted DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(discount_code_id, user_id)
);

-- 3. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_codes_valid_dates ON discount_codes(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_discount_code_usage_code ON discount_code_usage(discount_code_id);
CREATE INDEX IF NOT EXISTS idx_discount_code_usage_user ON discount_code_usage(user_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_code_usage ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for discount_codes
-- Only authenticated users can view active discount codes
CREATE POLICY "Users can view active discount codes" ON discount_codes
  FOR SELECT USING (is_active = true AND NOW() BETWEEN valid_from AND COALESCE(valid_until, NOW() + INTERVAL '1 year'));

-- Only admins can manage discount codes (you can modify this based on your needs)
CREATE POLICY "Admins can manage discount codes" ON discount_codes
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email IN (
      'your-admin-email@example.com' -- Replace with your actual admin email
    )
  ));

-- 6. Create RLS policies for discount_code_usage
-- Users can view their own usage
CREATE POLICY "Users can view own usage" ON discount_code_usage
  FOR SELECT USING (user_id = auth.uid());

-- Users can create usage records
CREATE POLICY "Users can use discount codes" ON discount_code_usage
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can view all usage
CREATE POLICY "Admins can view all usage" ON discount_code_usage
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email IN (
      'your-admin-email@example.com' -- Replace with your actual admin email
    )
  ));

-- 7. Create function to validate discount code
CREATE OR REPLACE FUNCTION public.validate_discount_code(
  p_code VARCHAR(50),
  p_user_id UUID,
  p_amount DECIMAL(10,2)
)
RETURNS JSON AS $$
DECLARE
  discount_record discount_codes%ROWTYPE;
  usage_count INTEGER;
  discount_amount DECIMAL(10,2);
  final_discount DECIMAL(10,2);
  user_email VARCHAR(255);
BEGIN
  -- Get the discount code
  SELECT * INTO discount_record FROM discount_codes 
  WHERE code = p_code 
  AND is_active = true 
  AND NOW() BETWEEN valid_from AND COALESCE(valid_until, NOW() + INTERVAL '1 year');
  
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid or expired discount code');
  END IF;
  
  -- Get user email for email-specific code validation
  SELECT email INTO user_email FROM users WHERE id = p_user_id;
  
  -- Check if code is email-specific and if user email matches
  IF discount_record.target_email IS NOT NULL AND discount_record.target_email != user_email THEN
    RETURN json_build_object('valid', false, 'error', 'This discount code is not valid for your account');
  END IF;
  
  -- Check usage limit
  IF discount_record.usage_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO usage_count FROM discount_code_usage 
    WHERE discount_code_id = discount_record.id;
    
    IF usage_count >= discount_record.usage_limit THEN
      RETURN json_build_object('valid', false, 'error', 'Discount code usage limit exceeded');
    END IF;
  END IF;
  
  -- Check if user already used this code
  SELECT COUNT(*) INTO usage_count FROM discount_code_usage 
  WHERE discount_code_id = discount_record.id AND user_id = p_user_id;
  
  IF usage_count > 0 THEN
    RETURN json_build_object('valid', false, 'error', 'You have already used this discount code');
  END IF;
  
  -- Check minimum amount
  IF p_amount < discount_record.min_amount THEN
    RETURN json_build_object('valid', false, 'error', 'Minimum amount not met');
  END IF;
  
  -- Calculate discount amount
  IF discount_record.discount_type = 'percentage' THEN
    discount_amount := p_amount * (discount_record.discount_value / 100);
  ELSE
    discount_amount := discount_record.discount_value;
  END IF;
  
  -- Apply maximum discount limit
  IF discount_record.max_discount IS NOT NULL THEN
    final_discount := LEAST(discount_amount, discount_record.max_discount);
  ELSE
    final_discount := discount_amount;
  END IF;
  
  RETURN json_build_object(
    'valid', true,
    'discount_amount', final_discount,
    'discount_code_id', discount_record.id,
    'description', discount_record.description
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to apply discount code
CREATE OR REPLACE FUNCTION public.apply_discount_code(
  p_code VARCHAR(50),
  p_user_id UUID,
  p_project_id UUID,
  p_amount DECIMAL(10,2)
)
RETURNS JSON AS $$
DECLARE
  validation_result JSON;
  discount_amount DECIMAL(10,2);
  discount_code_id UUID;
BEGIN
  -- Validate the discount code
  SELECT public.validate_discount_code(p_code, p_user_id, p_amount) INTO validation_result;
  
  IF (validation_result->>'valid')::boolean = false THEN
    RETURN validation_result;
  END IF;
  
  -- Extract discount details
  discount_amount := (validation_result->>'discount_amount')::DECIMAL(10,2);
  discount_code_id := (validation_result->>'discount_code_id')::UUID;
  
  -- Record the usage
  INSERT INTO discount_code_usage (
    discount_code_id,
    user_id,
    project_id,
    amount_discounted
  ) VALUES (
    discount_code_id,
    p_user_id,
    p_project_id,
    discount_amount
  );
  
  -- Update usage count
  UPDATE discount_codes 
  SET usage_count = usage_count + 1
  WHERE id = discount_code_id;
  
  RETURN json_build_object(
    'success', true,
    'discount_amount', discount_amount,
    'final_amount', p_amount - discount_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create trigger for updated_at
DROP TRIGGER IF EXISTS update_discount_codes_updated_at ON discount_codes;
CREATE TRIGGER update_discount_codes_updated_at
    BEFORE UPDATE ON discount_codes
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

-- 10. Insert some sample discount codes
INSERT INTO discount_codes (code, description, discount_type, discount_value, usage_limit, valid_until) VALUES
('WELCOME20', 'Welcome discount for new users', 'percentage', 20, 100, NOW() + INTERVAL '1 year'),
('BETA50', 'Beta tester discount', 'percentage', 50, 50, NOW() + INTERVAL '6 months'),
('INFLUENCER100', 'Influencer partnership discount', 'fixed_amount', 100, 10, NOW() + INTERVAL '3 months'),
('STUDENT25', 'Student discount', 'percentage', 25, 200, NOW() + INTERVAL '1 year'),
('LAUNCH30', 'Launch week discount', 'percentage', 30, 500, NOW() + INTERVAL '1 month');
