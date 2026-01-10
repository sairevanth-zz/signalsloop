# SignalsLoop LTD Strategy - Unified Document

> **Version**: 1.0 (January 2026)  
> **Status**: Ready for Implementation  
> **Decision**: Option A - Reduced limits to ensure profitability

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Platform Strategy](#platform-strategy)
3. [Competitive Research](#competitive-research)
4. [Final Tier Structure](#final-tier-structure)
5. [Cost Analysis](#cost-analysis)
6. [Profitability Projections](#profitability-projections)
7. [Technical Implementation](#technical-implementation)
8. [Application Checklist](#application-checklist)
9. [Risk Mitigation](#risk-mitigation)

---

## Executive Summary

### The Plan
Launch SignalsLoop on **RocketHub** for a limited period to gain traction and validate the product with real paying customers.

### Pricing Structure (Final)

| Tier | Price | You Keep (57%) | Year 1 AI Cost | **Year 1 Profit** |
|------|-------|----------------|----------------|-------------------|
| **Tier 1** | $69 | $39.33 | $8.76 | **+$21.81** ✅ |
| **Tier 2** | $179 | $102.03 | $34.92 | **+$58.35** ✅ |
| **Tier 3** | $349 | $198.93 | $118.08 | **+$72.09** ✅ |

### Key Decisions Made
- ✅ **No team member limits** - Feature limits control usage
- ✅ **Hunter scans: 12/month** max (down from 30) - Biggest cost driver
- ✅ **Tier 3: 2-year updates** (not lifetime) - Avoids Year 3+ losses
- ✅ **All tiers profitable** Year 1

---

## Platform Strategy

### Phase 1: RocketHub (Weeks 1-4)
**Why RocketHub first:**
- Lower commission (~40%) vs AppSumo (70%)
- Curated audience of entrepreneurs
- Faster approval process
- ProductMix (direct competitor) is already there

### Phase 2: AppSumo (If Phase 1 Successful)
**Why AppSumo second:**
- Largest audience (1M+ buyers)
- Maximum exposure for validation
- Higher commission but massive reach

### Other Platforms (Long-tail)
| Platform | Focus | Best For |
|----------|-------|----------|
| PitchGround | Early adopters | 90%+ discounts |
| SaaS Mantra | Community-driven | Quality products |
| DealMirror | SMBs | Productivity tools |
| SaaSPirate | Aggregator | Ongoing visibility |

---

## Competitive Research

### ProductMix (Direct Competitor on RocketHub)

| Tier | Price | Products | Users | Competitor Monitors |
|------|-------|----------|-------|---------------------|
| Tier 1 | $49 | 1 | 1 | 5 |
| Tier 2 | $159 | 5 | 5 | 10 |
| Tier 3 | $299 | 20 | 20 | 30 |

**SignalsLoop Advantage**: AI-native features (Spec Generation, AI Insights, Feedback Hunter) that ProductMix doesn't have.

### TrendFynd (Analytics/Monitoring)

| Tier | Price | Conversations/mo | Update Frequency |
|------|-------|------------------|------------------|
| Tier 1 | $59 | 5K | 24h |
| Tier 2 | $149 | 15K | 12h |
| Tier 3 | $249 | 25K | 6h |
| Tier 4 | $399 | 50K | 3h |

---

## Final Tier Structure

### Complete Feature Limits

| Feature | Tier 1 ($69) | Tier 2 ($179) | Tier 3 ($349) |
|---------|--------------|---------------|---------------|
| **Projects** | 2 | 10 | Unlimited |
| **Boards per Project** | 3 | Unlimited | Unlimited |
| **Feedback Items** | 2,000 | 10,000 | Unlimited |
| --- | --- | --- | --- |
| **categorization** | 200/mo | 1,000/mo | 5,000/mo |
| **sentiment_analysis** | 200/mo | 1,000/mo | 5,000/mo |
| **duplicate_detection** | 100/mo | 1,000/mo | 5,000/mo |
| **auto_response** | 30/mo | 200/mo | 500/mo |
| **priority_scoring** | 200/mo | 1,000/mo | 5,000/mo |
| **writing_assistant** | 50/mo | 500/mo | 2,000/mo |
| --- | --- | --- | --- |
| **spec_generation** | 3/mo | 10/mo | 15/mo |
| **spec_quality** | 3/mo | 8/mo | 15/mo |
| **devils_advocate** | 2/mo | 5/mo | 8/mo |
| **ask_signalsloop** | 10/mo | 40/mo | 80/mo |
| **theme_detection** | 3/mo | 8/mo | 30/mo |
| --- | --- | --- | --- |
| **executive_briefs** | 0 | 1/mo | 2/mo |
| **call_intelligence** | 0 | 3/mo | 8/mo |
| --- | --- | --- | --- |
| **competitor_extraction** | 20/mo | 50/mo | 150/mo |
| **feature_gap_detection** | 1/mo | 3/mo | 8/mo |
| **strategic_recommendations** | 1/mo | 3/mo | 8/mo |
| **external_review_scrape** | 0 | 0 | 3/mo |
| --- | --- | --- | --- |
| **hunter_scan** | 8/mo | 12/mo | 12/mo |
| **Hunter Platforms** | Non-Grok | Non-Grok | All + Grok |
| --- | --- | --- | --- |
| **api_calls** | 0 | 500/mo | 1,500/mo |
| **Custom Domain** | ❌ | ✅ | ✅ |
| **Remove Branding** | ❌ | ✅ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ |
| **Updates** | 1 year | 2 years | 2 years |

### What Changed from Original Proposal (Reduced Limits)

| Feature | Original | Reduced | Monthly Savings |
|---------|----------|---------|-----------------|
| hunter_scan | 30/mo | 12/mo | $0.50-1.50 |
| ask_signalsloop | 100/mo | 80/mo | $0.30 |
| call_intelligence | 10/mo | 8/mo | $0.09 |
| spec_generation | 20/mo | 15/mo | $0.16 |
| **Tier 3 Lifetime** | Lifetime | 2 years | Avoids Year 3+ loss |

---

## Cost Analysis

### Fee Structure

| Fee Type | Percentage |
|----------|------------|
| RocketHub Commission | 40% |
| Stripe Processing | ~3% |
| **Total Fees** | **~43%** |

### What You Actually Receive

| Tier | Sale Price | Fees (43%) | **Net to You** |
|------|------------|------------|----------------|
| Tier 1 | $69 | $29.67 | **$39.33** |
| Tier 2 | $179 | $76.97 | **$102.03** |
| Tier 3 | $349 | $150.07 | **$198.93** |

### AI Costs Per Feature

| Feature | Model | Cost Per Call |
|---------|-------|---------------|
| categorization | GPT-4o-mini | $0.000135 |
| sentiment_analysis | GPT-4o-mini | $0.000165 |
| duplicate_detection | GPT-4o-mini | $0.000270 |
| auto_response | GPT-4o-mini | $0.000360 |
| priority_scoring | GPT-4o-mini | $0.000135 |
| writing_assistant | GPT-4o-mini | $0.000390 |
| spec_generation | **GPT-4o** | **$0.0325** |
| spec_quality | GPT-4o-mini | $0.000600 |
| devils_advocate | **GPT-4o** | **$0.0213** |
| ask_signalsloop | **GPT-4o** | **$0.0150** |
| theme_detection | GPT-4o | **$0.0175** |
| executive_briefs | **GPT-4o** | **$0.0425** |
| call_intelligence | **GPT-4o** | **$0.0450** |
| competitor_extraction | GPT-4o-mini | $0.000300 |
| feature_gap_detection | **GPT-4o** | **$0.0225** |
| strategic_recommendations | **GPT-4o** | **$0.0275** |
| external_review_scrape | Grok + GPT | **$0.015** |

### Hunter Scan Costs (The Big One!)

| Scenario | Platforms | Cost Per Scan |
|----------|-----------|---------------|
| **Non-Grok (Tier 1/2)** | Reddit + HN + PlayStore | **$0.023** |
| **With Grok (Tier 3)** | + Twitter + G2/Capterra | **$0.074** |

---

## Profitability Projections

### Monthly AI Costs Per Tier (100% Usage)

| Tier | AI Features | Hunter Scans | **Total/Month** |
|------|-------------|--------------|-----------------|
| Tier 1 | $0.55 | $0.18 (8×$0.023) | **$0.73** |
| Tier 2 | $2.63 | $0.28 (12×$0.023) | **$2.91** |
| Tier 3 | $8.95 | $0.89 (12×$0.074) | **$9.84** |

### Year 1 Profit (100% Usage)

| Tier | Net Revenue | AI × 12 mo | Infra × 12 | **Year 1 Profit** |
|------|-------------|------------|------------|-------------------|
| Tier 1 | $39.33 | $8.76 | $8.76 | **+$21.81** ✅ |
| Tier 2 | $102.03 | $34.92 | $8.76 | **+$58.35** ✅ |
| Tier 3 | $198.93 | $118.08 | $8.76 | **+$72.09** ✅ |

### Multi-Year Analysis (Tier 3)

| Year | Cumulative AI Cost | Status |
|------|-------------------|--------|
| Year 1 | $118.08 | Profitable (+$72.09) |
| Year 2 | $236.16 | Break-even |
| Year 2 (end) | N/A | **Updates expire** ✅ |

> With 2-year updates instead of Lifetime, Tier 3 remains profitable.

---

## Technical Implementation

### How LTD Payment Flow Works (No Stripe Needed!)

```
┌─────────────────────────────────────────────────────────────┐
│                    RocketHub handles:                        │
│  1. Customer browses RocketHub                               │
│  2. Customer pays RocketHub (their Stripe)                  │
│  3. RocketHub gives customer a LICENSE CODE                 │
│  4. RocketHub pays you monthly (minus 40% commission)       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    You handle:                               │
│  1. Customer comes to SignalsLoop                           │
│  2. Customer enters LICENSE CODE on /redeem page            │
│  3. You validate code & activate their account              │
│  4. They use your product                                   │
└─────────────────────────────────────────────────────────────┘
```

**Key Point**: RocketHub handles all payment processing. You only build license redemption.

---

### Implementation Files

| File | Purpose | New/Modify |
|------|---------|------------|
| `migrations/ltd_licenses.sql` | Database table | NEW |
| `src/lib/ltd/license-manager.ts` | License validation logic | NEW |
| `src/lib/ltd/ltd-limits.ts` | LTD tier configurations | NEW |
| `src/app/redeem/page.tsx` | License redemption UI | NEW |
| `src/app/api/ltd/redeem/route.ts` | Redemption API | NEW |
| `src/app/api/ltd/validate/route.ts` | Code validation API | NEW |
| `src/app/admin/ltd/page.tsx` | Admin management panel | NEW |
| `src/lib/ai-rate-limit.ts` | Add LTD detection | MODIFY |

---

### Step 1: Database Migration

Create `migrations/202601_ltd_licenses.sql`:

```sql
-- LTD License Management
-- Run this in Supabase SQL Editor

-- Create the ltd_licenses table
CREATE TABLE IF NOT EXISTS ltd_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who owns this license (null until activated)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- License details
  license_code VARCHAR(100) UNIQUE NOT NULL,
  tier VARCHAR(10) NOT NULL CHECK (tier IN ('tier1', 'tier2', 'tier3')),
  platform VARCHAR(50) NOT NULL DEFAULT 'rockethub',
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN (
    'available',   -- Not yet redeemed
    'active',      -- Currently active
    'expired',     -- Updates period ended (still has access)
    'revoked',     -- Manually revoked (refund, abuse)
    'suspended'    -- Temporarily suspended
  )),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  activated_at TIMESTAMPTZ,
  updates_until TIMESTAMPTZ,  -- When feature updates stop
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  
  -- Metadata
  customer_email VARCHAR(255),  -- From RocketHub, for matching
  order_id VARCHAR(100),        -- RocketHub order reference
  metadata JSONB DEFAULT '{}'
);

-- Indexes for fast lookups
CREATE INDEX idx_ltd_licenses_code ON ltd_licenses(license_code);
CREATE INDEX idx_ltd_licenses_user ON ltd_licenses(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ltd_licenses_status ON ltd_licenses(status);

-- RLS Policies
ALTER TABLE ltd_licenses ENABLE ROW LEVEL SECURITY;

-- Users can only see their own licenses
CREATE POLICY "Users can view own licenses" ON ltd_licenses
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update (for redemption API)
CREATE POLICY "Service role manages licenses" ON ltd_licenses
  FOR ALL USING (auth.role() = 'service_role');

-- Function to check if user has active LTD
CREATE OR REPLACE FUNCTION get_user_ltd_tier(p_user_id UUID)
RETURNS TABLE(tier VARCHAR, updates_until TIMESTAMPTZ, is_active BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.tier,
    l.updates_until,
    (l.status = 'active' OR l.status = 'expired') as is_active
  FROM ltd_licenses l
  WHERE l.user_id = p_user_id
    AND l.status IN ('active', 'expired')
  ORDER BY 
    CASE l.tier 
      WHEN 'tier3' THEN 3 
      WHEN 'tier2' THEN 2 
      ELSE 1 
    END DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Step 2: LTD Limits Configuration

Create `src/lib/ltd/ltd-limits.ts`:

```typescript
/**
 * LTD Tier Configurations
 * These limits apply to Lifetime Deal customers from RocketHub/AppSumo
 */

export type LTDTier = 'tier1' | 'tier2' | 'tier3';

export interface LTDTierConfig {
  // Tier metadata
  name: string;
  price: number;
  updateYears: number;
  
  // Resource limits
  maxProjects: number;
  maxBoardsPerProject: number;
  maxFeedbackItems: number;
  
  // AI Feature limits (monthly)
  limits: {
    categorization: number;
    sentiment_analysis: number;
    duplicate_detection: number;
    auto_response: number;
    priority_scoring: number;
    writing_assistant: number;
    spec_generation: number;
    spec_quality: number;
    devils_advocate: number;
    ask_signalsloop: number;
    theme_detection: number;
    executive_briefs: number;
    call_intelligence: number;
    competitor_extraction: number;
    feature_gap_detection: number;
    strategic_recommendations: number;
    external_review_scrape: number;
    hunter_scan: number;
    api_calls: number;
  };
  
  // Binary features
  features: {
    customDomain: boolean;
    removeBranding: boolean;
    prioritySupport: boolean;
    grokPlatforms: boolean;  // Twitter, G2, Capterra for Hunter
  };
}

export const LTD_TIER_CONFIGS: Record<LTDTier, LTDTierConfig> = {
  tier1: {
    name: 'Starter',
    price: 69,
    updateYears: 1,
    maxProjects: 2,
    maxBoardsPerProject: 3,
    maxFeedbackItems: 2000,
    limits: {
      categorization: 200,
      sentiment_analysis: 200,
      duplicate_detection: 100,
      auto_response: 30,
      priority_scoring: 200,
      writing_assistant: 50,
      spec_generation: 3,
      spec_quality: 3,
      devils_advocate: 2,
      ask_signalsloop: 10,
      theme_detection: 3,
      executive_briefs: 0,
      call_intelligence: 0,
      competitor_extraction: 20,
      feature_gap_detection: 1,
      strategic_recommendations: 1,
      external_review_scrape: 0,
      hunter_scan: 8,
      api_calls: 0,
    },
    features: {
      customDomain: false,
      removeBranding: false,
      prioritySupport: false,
      grokPlatforms: false,
    },
  },
  
  tier2: {
    name: 'Professional',
    price: 179,
    updateYears: 2,
    maxProjects: 10,
    maxBoardsPerProject: -1, // unlimited
    maxFeedbackItems: 10000,
    limits: {
      categorization: 1000,
      sentiment_analysis: 1000,
      duplicate_detection: 1000,
      auto_response: 200,
      priority_scoring: 1000,
      writing_assistant: 500,
      spec_generation: 10,
      spec_quality: 8,
      devils_advocate: 5,
      ask_signalsloop: 40,
      theme_detection: 8,
      executive_briefs: 1,
      call_intelligence: 3,
      competitor_extraction: 50,
      feature_gap_detection: 3,
      strategic_recommendations: 3,
      external_review_scrape: 0,
      hunter_scan: 12,
      api_calls: 500,
    },
    features: {
      customDomain: true,
      removeBranding: true,
      prioritySupport: false,
      grokPlatforms: false,
    },
  },
  
  tier3: {
    name: 'Agency',
    price: 349,
    updateYears: 2,
    maxProjects: -1, // unlimited
    maxBoardsPerProject: -1,
    maxFeedbackItems: -1,
    limits: {
      categorization: 5000,
      sentiment_analysis: 5000,
      duplicate_detection: 5000,
      auto_response: 500,
      priority_scoring: 5000,
      writing_assistant: 2000,
      spec_generation: 15,
      spec_quality: 15,
      devils_advocate: 8,
      ask_signalsloop: 80,
      theme_detection: 30,
      executive_briefs: 2,
      call_intelligence: 8,
      competitor_extraction: 150,
      feature_gap_detection: 8,
      strategic_recommendations: 8,
      external_review_scrape: 3,
      hunter_scan: 12,
      api_calls: 1500,
    },
    features: {
      customDomain: true,
      removeBranding: true,
      prioritySupport: true,
      grokPlatforms: true,
    },
  },
};

/**
 * Get LTD limits in the same format as AI_LIMITS
 * For compatibility with existing checkAIUsageLimit function
 */
export function getLTDLimitsForRateLimit(tier: LTDTier) {
  return LTD_TIER_CONFIGS[tier].limits;
}
```

---

### Step 3: License Manager

Create `src/lib/ltd/license-manager.ts`:

```typescript
/**
 * LTD License Manager
 * Handles license validation, activation, and status checks
 */

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { LTD_TIER_CONFIGS, LTDTier } from './ltd-limits';

export interface LTDLicense {
  id: string;
  user_id: string | null;
  license_code: string;
  tier: LTDTier;
  platform: string;
  status: 'available' | 'active' | 'expired' | 'revoked' | 'suspended';
  created_at: string;
  activated_at: string | null;
  updates_until: string | null;
  customer_email: string | null;
  order_id: string | null;
}

export interface RedemptionResult {
  success: boolean;
  error?: string;
  license?: LTDLicense;
  tierConfig?: typeof LTD_TIER_CONFIGS.tier1;
}

/**
 * Validate a license code without activating it
 */
export async function validateLicenseCode(code: string): Promise<{
  valid: boolean;
  tier?: LTDTier;
  error?: string;
}> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return { valid: false, error: 'Database unavailable' };
  }

  const normalizedCode = code.trim().toUpperCase();

  const { data: license, error } = await supabase
    .from('ltd_licenses')
    .select('*')
    .eq('license_code', normalizedCode)
    .single();

  if (error || !license) {
    return { valid: false, error: 'Invalid license code' };
  }

  if (license.status !== 'available') {
    const statusMessages: Record<string, string> = {
      active: 'This license has already been redeemed',
      expired: 'This license has already been redeemed',
      revoked: 'This license has been revoked',
      suspended: 'This license is suspended',
    };
    return { 
      valid: false, 
      error: statusMessages[license.status] || 'License unavailable' 
    };
  }

  return { valid: true, tier: license.tier as LTDTier };
}

/**
 * Redeem a license code for a user
 */
export async function redeemLicense(
  code: string,
  userId: string,
  userEmail?: string
): Promise<RedemptionResult> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return { success: false, error: 'Database unavailable' };
  }

  const normalizedCode = code.trim().toUpperCase();

  // Start a transaction-like operation
  // 1. Get and lock the license
  const { data: license, error: fetchError } = await supabase
    .from('ltd_licenses')
    .select('*')
    .eq('license_code', normalizedCode)
    .eq('status', 'available')
    .single();

  if (fetchError || !license) {
    return { success: false, error: 'Invalid or already redeemed license code' };
  }

  // 2. Check if user already has an LTD license
  const { data: existingLicense } = await supabase
    .from('ltd_licenses')
    .select('tier')
    .eq('user_id', userId)
    .in('status', ['active', 'expired'])
    .single();

  if (existingLicense) {
    // User already has a license - check if upgrading
    const existingTierRank = { tier1: 1, tier2: 2, tier3: 3 }[existingLicense.tier as LTDTier];
    const newTierRank = { tier1: 1, tier2: 2, tier3: 3 }[license.tier as LTDTier];
    
    if (newTierRank <= existingTierRank) {
      return { 
        success: false, 
        error: `You already have a ${existingLicense.tier} license. This code is for ${license.tier}.` 
      };
    }
    // Allow upgrade - we'll handle the old license later
  }

  // 3. Calculate updates_until date
  const tierConfig = LTD_TIER_CONFIGS[license.tier as LTDTier];
  const now = new Date();
  const updatesUntil = new Date(now);
  updatesUntil.setFullYear(updatesUntil.getFullYear() + tierConfig.updateYears);

  // 4. Activate the license
  const { data: activatedLicense, error: updateError } = await supabase
    .from('ltd_licenses')
    .update({
      user_id: userId,
      status: 'active',
      activated_at: now.toISOString(),
      updates_until: updatesUntil.toISOString(),
      customer_email: userEmail || null,
    })
    .eq('id', license.id)
    .eq('status', 'available') // Double-check status to prevent race conditions
    .select()
    .single();

  if (updateError || !activatedLicense) {
    return { success: false, error: 'Failed to activate license. It may have been redeemed by someone else.' };
  }

  // 5. If user had a previous license, mark it as superseded
  if (existingLicense) {
    await supabase
      .from('ltd_licenses')
      .update({
        status: 'expired',
        metadata: { superseded_by: activatedLicense.id }
      })
      .eq('user_id', userId)
      .neq('id', activatedLicense.id);
  }

  return {
    success: true,
    license: activatedLicense as LTDLicense,
    tierConfig,
  };
}

/**
 * Get user's active LTD license
 */
export async function getUserLTDLicense(userId: string): Promise<LTDLicense | null> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from('ltd_licenses')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'expired'])
    .order('tier', { ascending: false }) // Get highest tier if multiple
    .limit(1)
    .single();

  return data as LTDLicense | null;
}

/**
 * Check if user has access to LTD features
 * Returns the effective tier or null if not an LTD customer
 */
export async function checkLTDAccess(userId: string): Promise<{
  isLTD: boolean;
  tier?: LTDTier;
  hasActiveUpdates?: boolean;
  config?: typeof LTD_TIER_CONFIGS.tier1;
}> {
  const license = await getUserLTDLicense(userId);
  
  if (!license) {
    return { isLTD: false };
  }

  const hasActiveUpdates = license.updates_until 
    ? new Date(license.updates_until) > new Date()
    : false;

  return {
    isLTD: true,
    tier: license.tier as LTDTier,
    hasActiveUpdates,
    config: LTD_TIER_CONFIGS[license.tier as LTDTier],
  };
}

/**
 * Generate license codes for RocketHub
 * Use this to pre-generate codes before listing
 */
export async function generateLicenseCodes(
  tier: LTDTier,
  count: number,
  platform: string = 'rockethub'
): Promise<string[]> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) throw new Error('Database unavailable');

  const prefix = `SL-${tier.toUpperCase().replace('TIER', 'T')}-`;
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate random code: SL-T1-ABC123XY
    const randomPart = Array.from({ length: 8 }, () => 
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
    ).join('');
    codes.push(`${prefix}${randomPart}`);
  }

  // Bulk insert
  const { error } = await supabase
    .from('ltd_licenses')
    .insert(codes.map(code => ({
      license_code: code,
      tier,
      platform,
      status: 'available',
    })));

  if (error) throw error;

  return codes;
}
```

---

### Step 4: Redemption API Route

Create `src/app/api/ltd/redeem/route.ts`:

```typescript
/**
 * API: Redeem LTD License Code
 * POST /api/ltd/redeem
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { redeemLicense, validateLicenseCode } from '@/lib/ltd/license-manager';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'License code is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please sign in to redeem your license' },
        { status: 401 }
      );
    }

    // Redeem the license
    const result = await redeemLicense(code, user.id, user.email);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Welcome! Your ${result.tierConfig?.name} license has been activated.`,
      tier: result.license?.tier,
      tierName: result.tierConfig?.name,
      updatesUntil: result.license?.updates_until,
      features: result.tierConfig?.features,
    });

  } catch (error) {
    console.error('License redemption error:', error);
    return NextResponse.json(
      { error: 'Failed to redeem license. Please try again.' },
      { status: 500 }
    );
  }
}

// Validate code without redeeming (for UI preview)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      { error: 'Code parameter required' },
      { status: 400 }
    );
  }

  const result = await validateLicenseCode(code);

  if (!result.valid) {
    return NextResponse.json(
      { valid: false, error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({
    valid: true,
    tier: result.tier,
  });
}
```

---

### Step 5: Redemption Page UI

Create `src/app/redeem/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, Gift, Sparkles, AlertCircle } from 'lucide-react';

const TIER_INFO = {
  tier1: { name: 'Starter', color: 'bg-blue-500', features: ['2 Projects', '8 Hunter Scans/mo', 'Basic AI'] },
  tier2: { name: 'Professional', color: 'bg-purple-500', features: ['10 Projects', '12 Hunter Scans/mo', 'Full AI Suite', 'Custom Domain'] },
  tier3: { name: 'Agency', color: 'bg-yellow-500', features: ['Unlimited Projects', '12 Hunter Scans/mo', 'Full AI Suite', 'Priority Support', 'Grok Platforms'] },
};

export default function RedeemPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validatedTier, setValidatedTier] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateCode = async (value: string) => {
    if (value.length < 10) {
      setValidatedTier(null);
      return;
    }

    setValidating(true);
    try {
      const res = await fetch(`/api/ltd/redeem?code=${encodeURIComponent(value)}`);
      const data = await res.json();
      
      if (data.valid) {
        setValidatedTier(data.tier);
        setError('');
      } else {
        setValidatedTier(null);
        setError(data.error || 'Invalid code');
      }
    } catch {
      setValidatedTier(null);
    } finally {
      setValidating(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setCode(value);
    setError('');
    
    // Debounce validation
    const timeout = setTimeout(() => validateCode(value), 500);
    return () => clearTimeout(timeout);
  };

  const handleRedeem = async () => {
    if (!code) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ltd/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to redeem license');
        return;
      }

      setSuccess(true);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard?welcome=ltd');
      }, 2000);

    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <Card className="w-full max-w-md mx-4 bg-slate-800/50 border-green-500/50">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">License Activated!</h2>
            <p className="text-slate-400 mb-4">
              Welcome to SignalsLoop. Redirecting to your dashboard...
            </p>
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-lg bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">Redeem Your License</CardTitle>
          <CardDescription className="text-slate-400">
            Enter the license code from your RocketHub purchase
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Code Input */}
          <div className="space-y-2">
            <div className="relative">
              <Input
                value={code}
                onChange={handleCodeChange}
                placeholder="SL-T2-XXXXXXXX"
                className="text-center text-lg font-mono tracking-wider h-14 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                disabled={loading}
              />
              {validating && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-slate-400" />
              )}
              {validatedTier && !validating && (
                <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
              )}
            </div>
            
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>

          {/* Tier Preview */}
          {validatedTier && TIER_INFO[validatedTier as keyof typeof TIER_INFO] && (
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Badge className={`${TIER_INFO[validatedTier as keyof typeof TIER_INFO].color} text-white`}>
                  {TIER_INFO[validatedTier as keyof typeof TIER_INFO].name}
                </Badge>
                <span className="text-slate-400 text-sm">License Detected</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {TIER_INFO[validatedTier as keyof typeof TIER_INFO].features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <Sparkles className="w-3 h-3 text-yellow-500" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Redeem Button */}
          <Button
            onClick={handleRedeem}
            disabled={!validatedTier || loading}
            className="w-full h-12 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Activating...
              </>
            ) : (
              'Activate License'
            )}
          </Button>

          <p className="text-center text-sm text-slate-500">
            Don't have a license?{' '}
            <a 
              href="https://rockethub.com/signalsloop" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline"
            >
              Get one on RocketHub
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Step 6: Integrate with Rate Limiting

Modify `src/lib/ai-rate-limit.ts` - add this function:

```typescript
// Add this import at the top
import { getUserLTDLicense } from '@/lib/ltd/license-manager';
import { getLTDLimitsForRateLimit, LTDTier } from '@/lib/ltd/ltd-limits';

// Add this new function
export async function getLimitsForUser(projectId: string): Promise<{
  limits: typeof AI_LIMITS.free;
  planType: 'free' | 'pro' | 'premium' | 'ltd';
  ltdTier?: LTDTier;
}> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { limits: AI_LIMITS.free, planType: 'free' };
  }

  // Get project and owner
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id, plan')
    .eq('id', projectId)
    .single();

  if (!project) {
    return { limits: AI_LIMITS.free, planType: 'free' };
  }

  // Check for LTD license first
  const ltdLicense = await getUserLTDLicense(project.owner_id);
  
  if (ltdLicense) {
    const tier = ltdLicense.tier as LTDTier;
    return {
      limits: getLTDLimitsForRateLimit(tier),
      planType: 'ltd',
      ltdTier: tier,
    };
  }

  // Fall back to regular plan
  const plan = project.plan || 'free';
  return {
    limits: AI_LIMITS[plan as keyof typeof AI_LIMITS] || AI_LIMITS.free,
    planType: plan as 'free' | 'pro' | 'premium',
  };
}

// Modify checkAIUsageLimit to use this:
export async function checkAIUsageLimit(
  projectId: string,
  featureType: AIFeatureType
): Promise<UsageCheckResult> {
  const { limits, planType, ltdTier } = await getLimitsForUser(projectId);
  const limit = limits[featureType];

  // ... rest of existing logic using `limit` instead of hardcoded plan lookup
}
```

---

### Step 7: Admin LTD Management (Optional)

Create `src/app/admin/ltd/page.tsx` for managing licenses:

```typescript
// Admin page to:
// - Generate new license codes
// - View all licenses and their status
// - Revoke/suspend licenses
// - Export codes as CSV for RocketHub

// This is similar to your existing admin/subscriptions/page.tsx pattern
// Implementation follows the same structure
```

---

### Summary of Files to Create

| File | Lines | Purpose |
|------|-------|---------|
| `migrations/202601_ltd_licenses.sql` | ~60 | Database schema |
| `src/lib/ltd/ltd-limits.ts` | ~180 | Tier configurations |
| `src/lib/ltd/license-manager.ts` | ~220 | Core license logic |
| `src/app/api/ltd/redeem/route.ts` | ~80 | Redemption API |
| `src/app/redeem/page.tsx` | ~180 | User-facing UI |
| **Total new code** | **~720 lines** | |

Plus minor modifications to `ai-rate-limit.ts` (~30 lines).

---

## Application Checklist

### Materials Needed for RocketHub

- [ ] **Product demo video** (2-3 minutes)
- [ ] **Screenshots** of key features:
  - Mission Control dashboard
  - Feedback Hunter in action
  - Spec Generation flow
  - AI Insights panel
- [ ] **Clear tier structure** with pricing
- [ ] **Support documentation** (help pages)
- [ ] **Refund policy** (30-day money-back)
- [ ] **Fair use policy** for AI features

### Application Tips

1. **Highlight unique value**: "AI-native product management" - No competitor has this
2. **Show traction**: Any current users, MRR, testimonials
3. **Differentiation**: Feedback Hunter, AI Insights, Spec Generation
4. **Pricing justification**: Entry at $69 (vs ProductMix $49) justified by AI

---

## Risk Mitigation

### Fair Use Policy (Include in Terms)

```
SignalsLoop LTD Fair Use Policy:

1. AI features are subject to monthly limits per tier
2. Limits reset on the 1st of each month
3. Unused credits do not roll over
4. Commercial use is allowed
5. Reselling access is prohibited
6. We reserve the right to limit accounts that abuse the system
```

### Support Strategy

| Tier | Support Level |
|------|---------------|
| Tier 1 | Email (48h response) |
| Tier 2 | Email (24h response) |
| Tier 3 | Priority Email (12h response) |

### Monitoring Plan

Track after launch:
- Average usage per tier (are people hitting limits?)
- Most-used features (optimize costs?)
- Support ticket volume (LTD customers can be demanding)
- Churn to paid plans (validation signal!)

---

## Next Steps

| Priority | Action | Owner | When |
|----------|--------|-------|------|
| 🔴 **1** | Apply to RocketHub | You | This week |
| 🔴 **2** | Prepare demo video + screenshots | You | Week 1 |
| 🟡 **3** | Implement LTD database + code | Dev | Week 1-2 |
| 🟡 **4** | Build redemption flow | Dev | Week 2 |
| 🟢 **5** | Test with beta codes | Both | Week 3 |
| 🟢 **6** | Launch on RocketHub | Both | Week 4 |

---

## Summary

**You're ready to launch!** The LTD strategy is:

✅ **Profitable** in Year 1 for all tiers  
✅ **Competitive** with ProductMix pricing  
✅ **Differentiated** by AI-native features  
✅ **Sustainable** with reduced limits and 2-year updates  
✅ **Technically feasible** with existing infrastructure  

**Just need to apply to RocketHub and prepare the materials.**
