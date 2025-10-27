-- Account-level billing migration: create profile table and backfill
-- Generated on 2025-10-26

BEGIN;

-- 1. Table creation ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_billing_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT UNIQUE,
  subscription_id TEXT,
  subscription_status TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  billing_cycle TEXT,
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  trial_status TEXT,
  is_trial BOOLEAN NOT NULL DEFAULT false,
  trial_cancelled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_account_billing_plan ON account_billing_profiles(plan);
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_billing_customer
  ON account_billing_profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION account_billing_profiles_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  IF TG_OP = 'INSERT' AND NEW.created_at IS NULL THEN
    NEW.created_at = NEW.updated_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_account_billing_profiles_updated_at ON account_billing_profiles;
CREATE TRIGGER trg_account_billing_profiles_updated_at
  BEFORE INSERT OR UPDATE ON account_billing_profiles
  FOR EACH ROW
  EXECUTE FUNCTION account_billing_profiles_set_updated_at();

-- 2. RLS policies -----------------------------------------------------------
ALTER TABLE account_billing_profiles ENABLE ROW LEVEL SECURITY;

-- Allow owners to read their own billing profile
DROP POLICY IF EXISTS select_own_billing_profile ON account_billing_profiles;
CREATE POLICY select_own_billing_profile
  ON account_billing_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- (Updates/Inserts are performed by service role which bypasses RLS)

-- 3. Backfill from existing project data -----------------------------------
WITH ranked_projects AS (
  SELECT
    p.owner_id AS user_id,
    COALESCE(p.plan, 'free') AS plan,
    p.stripe_customer_id,
    p.subscription_id,
    p.subscription_status,
    p.current_period_end,
    p.cancel_at_period_end,
    CASE
      WHEN p.plan = 'pro' AND p.stripe_customer_id IS NULL THEN 'gifted'
      WHEN p.plan = 'pro' AND p.current_period_end IS NOT NULL
        AND (p.current_period_end - timezone('utc', now())) > interval '300 days' THEN 'yearly'
      WHEN p.plan = 'pro' AND p.current_period_end IS NOT NULL
        AND (p.current_period_end - timezone('utc', now())) BETWEEN interval '25 days' AND interval '35 days' THEN 'monthly'
      ELSE NULL
    END AS billing_cycle,
    p.trial_start_date,
    p.trial_end_date,
    p.trial_status,
    p.is_trial,
    p.trial_cancelled_at,
    ROW_NUMBER() OVER (
      PARTITION BY p.owner_id
      ORDER BY
        CASE WHEN p.stripe_customer_id IS NULL THEN 1 ELSE 0 END,
        p.updated_at DESC NULLS LAST,
        p.created_at DESC NULLS LAST
    ) AS rn
  FROM projects p
  WHERE p.owner_id IS NOT NULL
)
INSERT INTO account_billing_profiles (
  user_id,
  plan,
  stripe_customer_id,
  subscription_id,
  subscription_status,
  current_period_end,
  cancel_at_period_end,
  billing_cycle,
  trial_start_date,
  trial_end_date,
  trial_status,
  is_trial,
  trial_cancelled_at
)
SELECT
  rp.user_id,
  rp.plan,
  rp.stripe_customer_id,
  rp.subscription_id,
  rp.subscription_status,
  rp.current_period_end,
  COALESCE(rp.cancel_at_period_end, false),
  rp.billing_cycle,
  rp.trial_start_date,
  rp.trial_end_date,
  rp.trial_status,
  COALESCE(rp.is_trial, false),
  rp.trial_cancelled_at
FROM ranked_projects rp
WHERE rp.rn = 1
ON CONFLICT (user_id) DO UPDATE SET
  plan = EXCLUDED.plan,
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  subscription_id = EXCLUDED.subscription_id,
  subscription_status = EXCLUDED.subscription_status,
  current_period_end = EXCLUDED.current_period_end,
  cancel_at_period_end = EXCLUDED.cancel_at_period_end,
  billing_cycle = EXCLUDED.billing_cycle,
  trial_start_date = EXCLUDED.trial_start_date,
  trial_end_date = EXCLUDED.trial_end_date,
  trial_status = EXCLUDED.trial_status,
  is_trial = EXCLUDED.is_trial,
  trial_cancelled_at = EXCLUDED.trial_cancelled_at;

-- Ensure every user has a baseline billing profile
INSERT INTO account_billing_profiles (user_id)
SELECT au.id
FROM auth.users au
LEFT JOIN account_billing_profiles abp ON abp.user_id = au.id
WHERE abp.user_id IS NULL;

-- 4. Transitional sync trigger to keep projects and account profiles aligned
CREATE OR REPLACE FUNCTION sync_account_billing_from_project()
RETURNS trigger AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

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
    plan = EXCLUDED.plan,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    subscription_id = EXCLUDED.subscription_id,
    subscription_status = EXCLUDED.subscription_status,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    trial_start_date = EXCLUDED.trial_start_date,
    trial_end_date = EXCLUDED.trial_end_date,
    trial_status = EXCLUDED.trial_status,
    is_trial = EXCLUDED.is_trial,
    trial_cancelled_at = EXCLUDED.trial_cancelled_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_sync_billing ON projects;
CREATE TRIGGER trg_projects_sync_billing
  AFTER INSERT OR UPDATE OF plan, stripe_customer_id, subscription_id, subscription_status, current_period_end, cancel_at_period_end, trial_start_date, trial_end_date, trial_status, is_trial, trial_cancelled_at
  ON projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_account_billing_from_project();

COMMIT;
