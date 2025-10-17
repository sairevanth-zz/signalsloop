-- Reset the project back to free plan so you can test the checkout flow again
UPDATE projects
SET
  plan = 'free',
  stripe_customer_id = NULL,
  subscription_status = NULL
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
