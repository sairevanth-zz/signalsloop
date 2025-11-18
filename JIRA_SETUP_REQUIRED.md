# ⚠️ Jira Integration Setup Required

## Why You're Not Seeing the Jira UI

The Jira integration components have been successfully integrated into your codebase, but **the database migration has not been applied yet**. This means:

❌ The Jira database tables don't exist
❌ The React hooks can't fetch connection data
❌ The UI components don't render (they're conditionally hidden)

## What's Been Integrated

✅ **Settings Page** - JiraSettingsPanel component
✅ **Feedback Hunter** - CreateIssueButton on each feedback card
✅ **Theme Detail Page** - Bulk issue creator for themes
✅ **Theme Cluster View** - Bulk issue creator for clusters

All these components will appear automatically once the setup is complete.

## Quick Setup (3 Steps)

### Step 1: Apply Database Migration

**Option A: Via Supabase Dashboard** (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `migrations/202511171400_jira_integration.sql`
6. Paste into the editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. Verify success - you should see "Success. No rows returned"

**Option B: Via Supabase CLI**

```bash
# If you have Supabase CLI installed
supabase db push migrations/202511171400_jira_integration.sql
```

**Option C: Via npm script** (Not recommended - needs service role key)

```bash
npm run apply-jira-migration
```

### Step 2: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Jira OAuth (from Atlassian Developer Console)
JIRA_CLIENT_ID=your_client_id_here
JIRA_CLIENT_SECRET=your_client_secret_here
JIRA_REDIRECT_URI=https://yourdomain.com/api/integrations/jira/callback

# Encryption Key (generate with: openssl rand -hex 16)
ENCRYPTION_KEY=your_32_character_encryption_key_here

# OpenAI (for AI-powered issue generation)
OPENAI_API_KEY=sk-your_openai_api_key_here
```

**Don't have an Atlassian OAuth app yet?**
Follow the detailed setup guide in `JIRA_INTEGRATION_README.md`

### Step 3: Restart Your Development Server

```bash
# Stop your current server (Ctrl+C)
npm run dev
# or
yarn dev
```

## Verification

After completing the setup, you should see:

1. **Settings → Integrations Tab**
   - A "Jira Integration" card appears
   - "Connect to Jira" button is visible

2. **Feedback Hunter Dashboard**
   - After connecting Jira, each feedback card shows "Create Jira Issue" button

3. **Theme Pages**
   - "Create Issues" button appears on theme detail pages
   - "Create Issues" button on each cluster header

## Database Tables Created

The migration creates these tables:

- `jira_connections` - OAuth connections & encrypted tokens
- `jira_issue_links` - Feedback ↔ Jira issue mappings
- `jira_webhooks` - Webhook registrations for sync
- `jira_label_mappings` - Theme → Jira label mappings
- `jira_sync_logs` - Audit trail for all sync events
- `jira_oauth_states` - CSRF protection tokens

## Troubleshooting

### "I applied the migration but still don't see the UI"

1. **Check Environment Variables**: Ensure `.env.local` has all required variables
2. **Restart Server**: Stop and restart your dev server
3. **Clear Browser Cache**: Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
4. **Check Console**: Open browser DevTools → Console for any errors

### "Migration failed with permission error"

You may need to apply the migration with a service role key or database admin credentials.
Try the Supabase Dashboard method instead.

### "I see errors about missing tables"

The migration wasn't applied successfully. Verify by running this in SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'jira_%';
```

You should see 6 tables listed.

## Need Help?

- 📖 Full documentation: `JIRA_INTEGRATION_README.md`
- 🔧 Check migration file: `migrations/202511171400_jira_integration.sql`
- 🐛 Check for errors in browser console and server logs

---

**Pro Tip**: You can develop and test the integration with a free Atlassian Cloud account and Jira Software trial.
