-- Update with the new valid Stripe customer ID
UPDATE projects
SET
  plan = 'pro',
  stripe_customer_id = 'cus_TFjPd9xjfz49bb',
  subscription_status = 'active'
WHERE owner_id = (
  SELECT id FROM auth.users WHERE email = 'biorevanth@gmail.com'
);

-- Verify the update
SELECT
  id,
  slug,
  plan,
  stripe_customer_id,
  subscription_status
FROM projects
WHERE owner_id = (
  SELECT id FROM auth.users WHERE email = 'biorevanth@gmail.com'
);
