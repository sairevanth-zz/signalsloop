# Account-Level Billing Migration Plan

This document captures the proposed approach for moving billing metadata off the `projects` table and onto an account-level data model before GA launch.

## 1. Current State Audit

- **Data storage**
  - `projects.plan`, `projects.stripe_customer_id`, `projects.subscription_status`, `projects.subscription_id`, `projects.current_period_end`, `projects.cancel_at_period_end`, trial fields, etc.
- **Backend touch points**
  - `src/app/api/stripe/portal/route.ts`
  - `src/app/api/stripe/yearly-checkout/route.ts`
  - `src/app/api/stripe/cancel-subscription/route.ts`
  - `src/app/api/stripe/webhook/route.ts`
  - `src/app/api/trial/cancel/route.ts`
  - `src/app/api/projects/pro-welcome/route.ts`
  - Upgrade helpers in `src/components/BillingDashboard.tsx`, `src/components/GlobalBanner.tsx`, `src/components/QuickActionsSidebar.tsx`
- **Front-end usage**
  - Billing dashboard (`/app/billing`, `/[slug]/billing-manage`, `/app/billing-manage`)
  - Global upgrade banners and CTA buttons
  - Feature gating utilities that read `plan` / `is_pro` from project records

## 2. Target Data Model

### 2.1 Table Selection
Use a dedicated table `account_billing_profiles` keyed by `user_id`. Rationale:
- Keeps `users` table lean (Supabase auth manages it)
- Avoids collisions if we ever support multiple owners per account or shared billing
- Easier to extend with additional columns without altering auth schema

### 2.2 Proposed Schema

```sql
CREATE TABLE account_billing_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  subscription_id TEXT,
  subscription_status TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  billing_cycle TEXT, -- 'monthly' | 'yearly' | 'gifted'
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  trial_status TEXT,
  is_trial BOOLEAN NOT NULL DEFAULT false,
  trial_cancelled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_billing_customer ON account_billing_profiles(stripe_customer_id);
CREATE INDEX idx_account_billing_plan ON account_billing_profiles(plan);
```

### 2.3 RLS & Access

- Enable RLS; allow owners to `SELECT` their own row, `INSERT/UPDATE` via service role only.
- API routes will use service role client; frontend only reads via RPC or views if required.

### 2.4 Backfill Strategy

1. Insert one row per owner by selecting the most recent `projects` record that has a non-null `stripe_customer_id`
2. Fallback to latest Pro project even if `stripe_customer_id` null (plan info only)
3. Sync gifted/trial fields from corresponding columns

```sql
INSERT INTO account_billing_profiles (...)
SELECT DISTINCT ON (owner_id) ... FROM projects ORDER BY owner_id, updated_at DESC;
```

4. For users without Pro projects, insert default `plan = 'free'`.

## 3. Rollout Strategy

1. **Phase 1: Schema + Backfill**
   - Create table, RLS, indexes
   - Backfill from `projects`
   - Add trigger to keep `account_billing_profiles` updated when `projects` mutate (temporary safety)

2. **Phase 2: Dual Read/Write**
   - Update API routes to read from account billing table first; fallback to project columns during transition
   - When writing (webhooks, upgrade flows), update both tables to stay in sync

3. **Phase 3: Flip Default Paths**
   - Frontend + backend use `account_billing_profiles` exclusively
   - Remove trigger/dual write
   - Optionally drop obsolete columns from `projects` after validation

## 4. Implementation Steps

1. Add SQL migration scripts (`migrations/YYYYMMDD_account_billing.sql`) with table creation, RLS, indexes.
2. Script backfill + verification queries (`sql/backfill-account-billing.sql`).
3. Add helper in `src/lib/billing.ts` to fetch account billing info by user ID.
4. Update APIs:
   - `/api/stripe/portal`
   - `/api/stripe/yearly-checkout`
   - `/api/stripe/cancel-subscription`
   - `/api/stripe/webhook`
   - `/api/trial/cancel`
   - `/api/projects/pro-welcome`
5. Update UI consumers (`BillingDashboard`, `GlobalBanner`, others) to use new helper via account context.
6. Add transitional sync (e.g., update project record when account record changes) until full removal.
7. Run migration + scripts locally, adjust tests.
8. Deploy with monitoring; once stable, drop legacy columns.

## 5. Testing Checklist

- **Database**
  - Run migration in staging; verify `account_billing_profiles` rows per auth user
  - Confirm RLS: authenticated user can `SELECT` their row, denied for others
  - Validate trigger keeps `projects` mirror fields in sync (update plan/stripe id and observe account table)
  - Backfill QA: spot-check Pro, gifted, and Trial accounts after migration

- **API**
  - `/api/stripe/portal`: supply `accountId` + `projectId`, ensure portal URL resolves for Pro, fails gracefully for gifted/free
  - `/api/stripe/yearly-checkout`: exercise with existing Stripe customer, new customer, and gifted plan (expect new checkout session)
  - `/api/stripe/cancel-subscription`: confirm account profile flips `cancel_at_period_end` and project mirrors
  - `/api/trial/cancel` & `/api/trial/start`: ensure account profile’s trial fields update and project stays consistent
  - Stripe webhook replay (subscription create/update/delete, invoice success/fail) updates account profile + project and emits billing events once

- **UI**
  - `/app/billing`, `/app/billing-manage`, `/{slug}/billing-manage`, and global banner should reflect account-level plan, handle gifted/no customer ID, and redirect via new APIs
  - Manage Billing CTA works for Pro accounts with real Stripe ID; shows support guidance for gifted
  - Account-level usage widgets still render (widget loads, posts, etc.)

- **Regression**
  - Feature gating (`FeatureGate`, `QuickActionsSidebar`, upgrade buttons) respect account plan after migration
  - No console errors in billing flows, especially during portal/checkout navigation
  - Existing analytics, email notifications, and webhook-driven automations continue to fire post-upgrade

## 6. Risks & Mitigations

- **Out-of-sync data**: run dual-write during migration, add verification query before removing columns.
- **Webhook race conditions**: ensure account fetch uses unique key (`stripe_customer_id`). Consider unique index.
- **Future multi-owner support**: structure allows extension by linking additional users to same billing record via joining table.

## 7. Open Questions

- Do we need to migrate historical billing events? (currently stored separately, unaffected)
- Should we expose account billing via RPC for client use? (likely yes once UI flips)
- Timeline for dropping project columns? (after stable release + monitoring)

---

Prepared Oct 26, 2025.
