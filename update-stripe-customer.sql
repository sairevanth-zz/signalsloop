-- Update the project with the Stripe customer ID from the successful checkout
UPDATE projects
SET
  plan = 'pro',
  stripe_customer_id = 'cus_TFVnmWbDqMACOS',
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
  subscription_status,
  owner_id
FROM projects
WHERE owner_id = (
  SELECT id FROM auth.users WHERE email = 'biorevanth@gmail.com'
);
