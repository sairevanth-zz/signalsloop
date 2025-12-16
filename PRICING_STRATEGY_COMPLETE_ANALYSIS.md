# SignalsLoop Pricing Strategy: Complete Analysis & Discussion

*A comprehensive record of pricing strategy brainstorming, decisions, and rationale*

---

## Executive Summary

This document consolidates the complete pricing strategy discussion for SignalsLoop, including cost analysis, competitive research, multiple pricing options, and strategic recommendations.

**Key Conclusions:**
- Current $19 pricing is likely unsustainable for heavy users
- AI costs range from $0.50/mo (light) to $150+/mo (power users)
- Target market should be focused on indie makers and early-stage startups (not enterprise yet)
- Recommended pricing: Free + $29 Pro + $79 Team (3-tier model)

---

## Part 1: AI Cost Analysis

### OpenAI API Costs (December 2024)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| **GPT-4o** | $2.50 | $10.00 |
| **GPT-4o-mini** | $0.15 | $0.60 |
| text-embedding-3-small | $0.02 | N/A |

### Anthropic API Costs

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| **Claude Sonnet 4** | $3.00 | $15.00 |
| Claude 3 Haiku | $0.25 | $1.25 |

---

### Feature Cost Breakdown

#### GPT-4o-mini Features (Cheap: $0.0001-0.002 per call)

| Feature | Cost/Call | 1,000 uses |
|---------|-----------|------------|
| Auto-Categorization | $0.00014 | $0.14 |
| Sentiment Analysis | $0.00018 | $0.18 |
| Duplicate Detection | $0.00027 | $0.27 |
| Smart Replies | $0.00042 | $0.42 |
| Writing Assistant | $0.00059 | $0.59 |
| War Room Analysis | $0.00045 | $0.45 |

#### GPT-4o Features (Expensive: $0.02-0.05 per call)

| Feature | Cost/Call | 10 uses |
|---------|-----------|---------|
| Spec Generation | $0.048 | $0.48 |
| Spec Quality Scorer | $0.025 | $0.25 |
| Devil's Advocate | $0.035 | $0.35 |
| Call Intelligence | $0.035 | $0.35 |
| Ask SignalsLoop | $0.030 | $0.30 |
| Theme Detection | $0.033 | $0.33 |
| Executive Brief | $0.043 | $0.43 |
| Mission Control | $0.055 | $0.55 |

#### Claude Features

| Feature | Cost/Call | Notes |
|---------|-----------|-------|
| Weekly Insights | $0.084 | Weekly |
| Intent Parser | $0.014 | Per Ask query |
| Stakeholder Response | $0.042 | Per response |

---

### Cost Per User Type

| User Type | Description | Monthly AI Cost |
|-----------|-------------|-----------------|
| **Light (Free)** | 50 items, basic AI only | $0.50-1.00 |
| **Moderate (Pro)** | 300 items, 10 specs | $5-12 |
| **Heavy (Pro)** | 1,000 items, 30 specs, full features | $30-50 |
| **Power (Pro)** | 3,000+ items, max usage | $100-200 |

### Critical Finding

At $19/mo Pro pricing:
- Moderate users: +$7-14 profit ✅
- Heavy users: -$11 to -$31 loss ❌
- Power users: -$81 to -$181 loss ❌

**If 20% of Pro users are heavy/power users, the $19 tier loses money.**

---

### Hunter Agent Reality (Current State)

> ⚠️ **Based on codebase audit - Only Reddit + Hacker News are available**

**Available Platforms:**

| Platform | Implementation | Cost | Status |
|----------|---------------|------|--------|
| **Reddit** | RSS feeds (no auth required) | $0 | ✅ Working |
| **Hacker News** | Algolia API (free, no auth) | $0 | ✅ Working |

**Not Available (No Plans to Implement):**
- Twitter/X, G2, Capterra, Product Hunt, App Store, LinkedIn, etc.

**Hunter Agent Cost:** Essentially $0
- Only cost is LLM processing of discovered posts
- ~$0.10-0.50/month per active Hunter user

**Marketing Guidance:**
- ✅ Say: "Hunter monitors Reddit and Hacker News for mentions of your product"
- ❌ Don't promise additional platforms

---

## Part 2: Competitive Analysis

### Market Pricing Comparison

| Competitor | Entry Price | Model | AI Features |
|------------|-------------|-------|-------------|
| Canny | $19/mo | Usage-based | None |
| Upvoty | $15/mo | Flat | None |
| Frill | $25/mo | Flat | None |
| Featurebase | $0-29/mo | Tiered | Some |
| Productboard | $19/maker/mo | Per-seat | Add-on ($20) |
| UserVoice | $699+/mo | Enterprise | Limited |

### Key Insights

1. Most feedback tools price at $15-29/mo entry
2. AI features are rare and command premium
3. Per-seat pricing is common but creates complexity
4. No competitor offers SignalsLoop's AI depth

---

## Part 3: Pricing Options Evaluated

### Option A: Original v2 Strategy ($0 / $49 / $129)

| Tier | Price | Seats | Key Features |
|------|-------|-------|--------------|
| Free | $0 | 1 | 1 board, 50 posts, 30 AI/day |
| Pro | $49/mo | 5 | Unlimited boards, 30 specs/mo, Hunter (Reddit/HN/PH) |
| Business | $129/mo | 20 | Full AI, War Room, SSO, Call Intel |

**Pros:**
- Good margins with caps (65-86%)
- Clean tier differentiation
- "Hybrid unlimited" model (unlimited cheap AI, capped expensive AI)

**Cons:**
- $49 may be too high for indie makers
- Business tier requires SOC 2/GDPR you don't have
- 20 seats implies enterprise buyers who won't pass security review

---

### Option B: Three-Tier with $25 Starter

| Tier | Price | Seats | Margin |
|------|-------|-------|--------|
| Free | $0 | 1 | -100% |
| Starter | $25/mo | 3 | 78% |
| Pro | $79/mo | 10 | 72% |
| Team | $199/mo | 25 | 65% |

**Limits at $25 for profitability:**
- 10 specs/month
- 5 devil's advocate
- 50 Ask queries
- 1 Hunter platform

**Pros:**
- Industry-standard entry price
- Creates stepping-stone upgrade path

**Cons:**
- 4 tiers may cause analysis paralysis
- $25 → $79 jump is 3.2x (might feel steep)

---

### Option C: Two-Tier Launch (Recommended for Day 1)

| Tier | Price | Seats | Target |
|------|-------|-------|--------|
| Free | $0 | 1 | Try before buy |
| Pro | $29-39/mo | 2-3 | Serious indie makers |

Add Team tier later when there's demand.

**Pros:**
- Simple to explain and sell
- Matches your current capacity (just you)
- Can expand tiers based on actual demand

**Cons:**
- Lower MRR ceiling initially
- No obvious upgrade path

---

### Option D: Reframed Three-Tier (Best Balance)

| Tier | Price | Seats | Target |
|------|-------|-------|--------|
| Free | $0 | 1 | Anyone testing |
| Pro | $29/mo | 2 | Indie makers, solo founders |
| Team | $79/mo | 10 | Small PM teams (3-10 people) |

**Key changes from v2:**
- Renamed "Business" → "Team" (no enterprise implications)
- Dropped SSO/SAML (your buyers don't need it)
- Lowered seat caps to match realistic buyers
- Entry at $29 (psychological sweet spot)

---

## Part 4: Target Market Reality

### Who Can Actually Buy (Without SOC 2/GDPR)

| Customer Type | Security Needs | Can Buy? |
|---------------|---------------|----------|
| Solo indie maker | None | ✅ Yes |
| 2-5 person startup | None | ✅ Yes |
| 10-person seed stage | Usually none | ✅ Maybe |
| 20+ Series A | Security policy | ⚠️ Risky |
| 50+ mid-market | Security review | ❌ Unlikely |
| Enterprise | SOC 2 required | ❌ No |

**Realistic Day 1 customer:** Indie makers and early-stage startups (1-10 people)

### Indie Maker Budget Reality

Typical monthly SaaS spend: $100-200/mo total

| At $15-25 | "I'll try it" |
| At $29-39 | "Is it worth it?" (needs convincing) |
| At $49+ | "This is for real companies" |

---

## Part 5: Strategic Decisions Made

### Decisions Confirmed

| Decision | Rationale |
|----------|-----------|
| Kill $19 "death zone" tier | Margin too thin for GPT-4o features |
| Hybrid unlimited model | Market as "Unlimited AI" for cheap stuff, cap expensive stuff |
| Seat caps (not per-seat) | Simpler for SMB buyers |
| No add-ons | Cleaner decision path |
| Rename Business → Team | No enterprise compliance claims |

### Decisions Pending

| Question | Options |
|----------|---------|
| Entry price point | $25 vs $29 vs $39 |
| Number of tiers at launch | 2 (Free+Pro) vs 3 (Free+Pro+Team) |
| Hunter Agent frequency | 24hr vs 4hr for different tiers |
| Overage handling | Hard stop vs overage packs |

---

## Part 6: Strategic Recommendations

### For Day 1 Launch (Recommended)

| Tier | Price | Seats | AI Limits |
|------|-------|-------|-----------|
| **Free** | $0 | 1 | 30 AI/day, no specs |
| **Pro** | $29/mo | 2 | 8 specs, 30 Ask queries |
| **Team** | $79/mo | 10 | 30 specs, 100 Ask queries |

**Add later (when you have SOC 2):**
- Enterprise tier ($199+/mo)
- SSO/SAML
- Priority support

### Marketing Positioning

**Don't target:** Enterprises, mid-market companies with security requirements

**Do target:** 
- Indie makers with traction (>$1K MRR)
- Seed-stage startups (2-10 people)
- Solo PMs at small companies
- Product-led growth teams

**Value prop:** "The AI-powered feedback tool that saves you 5+ hours/week"

---

## Part 7: Financial Projections

### With Recommended Pricing ($0 / $29 / $79)

**Margin Analysis:**

| Tier | Revenue | Max AI Cost | Margin |
|------|---------|-------------|--------|
| Free | $0 | $0.80 | -100% (marketing) |
| Pro | $29 | $8 | 72% |
| Team | $79 | $25 | 68% |

**Break-even:** 2 Pro customers covers fixed costs (~$57/mo)

**Year 1 Projection (Conservative):**

| Month | Free | Pro | Team | MRR |
|-------|------|-----|------|-----|
| 3 | 100 | 15 | 2 | $593 |
| 6 | 250 | 40 | 5 | $1,555 |
| 12 | 500 | 100 | 15 | $4,085 |

---

## Part 8: Implementation Checklist

### Pre-Launch

- [ ] Finalize tier limits (specs, AI calls, seats)
- [ ] Update ai-rate-limit.ts with new caps
- [ ] Create Stripe products for Pro ($29) and Team ($79)
- [ ] Build usage tracking for expensive features
- [ ] Update pricing page UI
- [ ] Add limit warning notifications

### Launch

- [ ] Deploy new pricing
- [ ] Monitor AI costs per customer
- [ ] Track feature usage patterns
- [ ] Gather feedback on limit adequacy

### Post-Launch (Month 3+)

- [ ] Evaluate if limits are too restrictive
- [ ] Consider overage packs if users hit limits
- [ ] Add Team tier features if demand exists
- [ ] Begin SOC 2 process if enterprise interest grows

---

## Appendix: Key Arguments Summary

### Why $19 Is Risky

1. GPT-4o features cost $0.02-0.05 per call
2. Heavy user can generate $30-50/mo in AI costs
3. At $19 revenue, that's a loss
4. Creates unsustainable unit economics

### Why $29 Works

1. Still competitive with Canny ($19), Frill ($25)
2. Covers costs even for moderate-heavy users
3. Filters for serious buyers (not hobbyists)
4. Room to discount (annual, promotions)

### Why "Team" Not "Business"

1. "Business" implies enterprise features (SOC 2, SSO)
2. You don't have enterprise compliance yet
3. "Team" sets correct expectations (just more seats)
4. Can add "Enterprise" tier when ready

---

*Document Version: 1.0*
*Last Updated: December 15, 2024*
*Status: Ready for final decision*
