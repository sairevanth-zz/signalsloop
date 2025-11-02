-- Fix the sync_account_billing_from_project trigger to use correct PostgreSQL syntax
-- The issue is that account_billing_profiles can't be referenced directly in ON CONFLICT DO UPDATE
-- We need to use a subquery or restructure the logic

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_account_billing_from_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_plan TEXT;
BEGIN
  IF NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the existing plan if it exists
  SELECT plan INTO existing_plan
  FROM account_billing_profiles
  WHERE user_id = NEW.owner_id;

  -- Insert or update the billing profile
  INSERT INTO account_billing_profiles AS abp (
    user_id,
    plan,
    stripe_customer_id,
    subscription_id,
    subscription_status,
    current_period_end,
    cancel_at_period_end,
    trial_start_date,
    trial_end_date,
    trial_status,
    is_trial,
    trial_cancelled_at
  ) VALUES (
    NEW.owner_id,
    COALESCE(NEW.plan, 'free'),
    NEW.stripe_customer_id,
    NEW.subscription_id,
    NEW.subscription_status,
    NEW.current_period_end,
    COALESCE(NEW.cancel_at_period_end, false),
    NEW.trial_start_date,
    NEW.trial_end_date,
    NEW.trial_status,
    COALESCE(NEW.is_trial, false),
    NEW.trial_cancelled_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    -- Preserve pro plan if existing profile is pro and new project is not
    plan = CASE
      WHEN existing_plan = 'pro' AND EXCLUDED.plan <> 'pro' THEN existing_plan
      ELSE EXCLUDED.plan
    END,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    subscription_id = EXCLUDED.subscription_id,
    subscription_status = EXCLUDED.subscription_status,
    current_period_end = COALESCE(EXCLUDED.current_period_end, abp.current_period_end),
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    trial_start_date = EXCLUDED.trial_start_date,
    trial_end_date = EXCLUDED.trial_end_date,
    trial_status = EXCLUDED.trial_status,
    is_trial = EXCLUDED.is_trial,
    trial_cancelled_at = EXCLUDED.trial_cancelled_at;

  RETURN NEW;
END;
$$;

COMMIT;
