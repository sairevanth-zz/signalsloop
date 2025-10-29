# Seed Production Database

The demo board on production (signalsloop.com) needs to be seeded with category and priority score data.

## Option 1: Via Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Link to your project:
   ```bash
   vercel link
   ```

4. Run seed script with production environment:
   ```bash
   vercel env pull .env.production
   npm run clear-seed-demo
   ```

## Option 2: Via Supabase SQL Editor (Manual)

1. Go to your **Production** Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run this SQL to update existing demo posts:

```sql
-- Update demo posts with categories and priority scores
UPDATE posts SET
  category = 'Feature Request',
  priority_score = 8.5,
  author_name = 'Sarah Chen'
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE posts SET
  category = 'Bug',
  priority_score = 9.2,
  author_name = 'Alex Kumar'
WHERE id = '00000000-0000-0000-0000-000000000002';

UPDATE posts SET
  category = 'Integration',
  priority_score = 7.8,
  author_name = 'Taylor Martinez'
WHERE id = '00000000-0000-0000-0000-000000000003';

UPDATE posts SET
  category = 'UI/UX',
  priority_score = 6.5,
  author_name = 'Jordan Lee'
WHERE id = '00000000-0000-0000-0000-000000000004';

UPDATE posts SET
  category = 'Feature Request',
  priority_score = 7.2,
  author_name = 'Morgan Davis'
WHERE id = '00000000-0000-0000-0000-000000000005';

UPDATE posts SET
  category = 'Feature Request',
  priority_score = 5.5,
  author_name = 'Riley Thompson'
WHERE id = '00000000-0000-0000-0000-000000000006';

UPDATE posts SET
  category = 'Improvement',
  priority_score = 8.0,
  author_name = 'Casey Wright'
WHERE id = '00000000-0000-0000-0000-000000000007';

UPDATE posts SET
  category = 'Feature Request',
  priority_score = 7.5,
  author_name = 'Sam Rivera'
WHERE id = '00000000-0000-0000-0000-000000000008';

UPDATE posts SET
  category = 'Integration',
  priority_score = 8.3,
  author_name = 'Jamie Park'
WHERE id = '00000000-0000-0000-0000-000000000009';

UPDATE posts SET
  category = 'Improvement',
  priority_score = 6.8,
  author_name = 'Avery Brooks'
WHERE id = '00000000-0000-0000-0000-000000000010';
```

## Option 3: Create API Endpoint for One-Time Seed

We can create a protected API route that seeds production when called. This is useful if you don't want to use SQL directly.

Let me know which option works best for you!

## Verify It Worked

After seeding, check:
```bash
curl https://signalsloop.com/api/demo/posts | jq '.posts[0] | {category, priority_score}'
```

Should show actual values instead of `null` and `0`.
