# Apply Comment Mentions Database Schema

## ⚠️ Important: You must apply the database schema for mentions to work

The mention/tagging feature requires database tables and functions. Follow these steps:

## Steps to Apply Schema:

### 1. Open Supabase Dashboard
Go to your Supabase project dashboard: https://supabase.com/dashboard

### 2. Navigate to SQL Editor
- Click on "SQL Editor" in the left sidebar
- Click "New Query"

### 3. Copy and Execute Schema
- Open the file: `add-comment-mentions-schema.sql`
- Copy the entire contents
- Paste into the SQL Editor
- Click "Run" to execute

### 4. Verify Installation
After running the schema, you can verify it was successful by running this query:

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'comment_mentions'
);

-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'get_post_participants',
  'extract_mentions_from_text',
  'process_comment_mentions'
);
```

## What This Schema Creates:

1. **`comment_mentions` table** - Stores mention records
2. **`get_post_participants()` function** - Finds users who have participated in a post
3. **`extract_mentions_from_text()` function** - Extracts @mentions from comment text
4. **`process_comment_mentions()` function** - Creates mention records and matches users
5. **RLS Policies** - Security policies for the mentions table

## After Applying Schema:

The mention feature will work immediately:
- Type `@` in comments to see participant suggestions
- Select a name to mention them
- They'll receive email notifications

## Troubleshooting:

If you see "No participants found":
1. Make sure the schema has been applied
2. Check that users have commented/voted on the post
3. Verify the database functions are created
