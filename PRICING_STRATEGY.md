# SignalsLoop: Comprehensive Pricing Strategy

## Executive Summary

This document outlines a comprehensive pricing strategy for SignalsLoop, taking into account:
- Current pricing model and infrastructure costs
- AI API costs per feature
- Competitive landscape
- Target customer willingness to pay
- Recommended tier structure and pricing

---

## 📊 Current Pricing Model

### Existing Tiers

| Tier | Price | Key Limits |
|------|-------|------------|
| **Free** | $0 | 1 board, 50 posts, 10 AI requests/day |
| **Pro** | $19/mo ($15.20/mo annual) | Unlimited boards/posts, unlimited AI |

### Current Free Tier AI Limits (Monthly)
| Feature | Limit |
|---------|-------|
| Sentiment Analysis | 10 |
| Auto-Response | 25 |
| Duplicate Detection | 15 |
| Priority Scoring | 15 |
| Categorization | 50 |
| Writing Assistant | 100 |

### Current Pro Tier AI Limits (Monthly)
| Feature | Limit |
|---------|-------|
| Sentiment Analysis | 10,000 |
| Auto-Response | 5,000 |
| Duplicate Detection | 10,000 |
| Priority Scoring | 10,000 |
| Categorization | 50,000 |
| Writing Assistant | 20,000 |

---

## 💰 Cost Analysis: AI API Costs (COMPREHENSIVE AUDIT)

> ⚠️ **IMPORTANT**: SignalsLoop uses **GPT-4o** (expensive) for many advanced features, not just GPT-4o-mini. This significantly impacts costs.

### OpenAI Pricing (December 2024)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Notes |
|-------|----------------------|------------------------|-------|
| **GPT-4o** | $2.50 | $10.00 | Used for advanced features |
| **GPT-4o-mini** | $0.15 | $0.60 | Used for basic features |
| GPT-3.5-turbo | $0.50 | $1.50 | Legacy, being phased out |
| text-embedding-3-small | $0.02 | N/A | For vector search |

---

### Complete AI Feature Audit (20+ Features)

#### 🟢 GPT-4o-mini Features (Low Cost: $0.0001-0.002 per call)

| Feature | Input Tokens | Output Tokens | Cost/Call | Monthly Limit (Pro) |
|---------|-------------|---------------|-----------|---------------------|
| Auto-Categorization | ~500 | ~100 | ~$0.00014 | 50,000 |
| Sentiment Analysis | ~600 | ~150 | ~$0.00018 | 10,000 |
| Duplicate Detection (AI) | ~1,000 | ~200 | ~$0.00027 | 10,000 |
| Priority Scoring | ~800 | ~300 | ~$0.00030 | 10,000 |
| Auto-Response/Smart Replies | ~1,200 | ~400 | ~$0.00042 | 5,000 |
| Writing Assistant | ~1,500 | ~600 | ~$0.00059 | 20,000 |
| War Room Analysis | ~1,000 | ~500 | ~$0.00045 | Unlimited |
| Feedback Enrichment | ~800 | ~400 | ~$0.00036 | Unlimited |

**Worst Case Max Cost (GPT-4o-mini features at limit):**
- 50,000 categorizations: ~$7.00
- 10,000 sentiments: ~$1.80
- 10,000 duplicates: ~$2.70
- 10,000 priorities: ~$3.00
- 5,000 responses: ~$2.10
- 20,000 writing: ~$11.80
- **Subtotal: ~$28.40/month**

---

#### 🟡 GPT-4o Features (EXPENSIVE: $0.02-0.10 per call)

| Feature | Input Tokens | Output Tokens | Cost/Call | Typical Usage |
|---------|-------------|---------------|-----------|---------------|
| **Spec Generation** | ~3,000 | ~4,000 | **~$0.048** | 10-50/month |
| **Spec Quality Scorer** | ~4,000 | ~1,500 | **~$0.025** | Per spec |
| **Spec to Tickets** | ~3,000 | ~2,000 | **~$0.028** | Per spec |
| **Devil's Advocate/Red Team** | ~4,000 | ~2,500 | **~$0.035** | 10-30/month |
| **Call Intelligence Analysis** | ~6,000 | ~2,000 | **~$0.035** | 20-100/month |
| **Executive Brief Generation** | ~5,000 | ~3,000 | **~$0.043** | 4-8/month |
| **Outcome Attribution** | ~3,000 | ~1,500 | **~$0.023** | Per feature shipped |
| **Anomaly Detection** | ~4,000 | ~2,000 | **~$0.030** | Daily check |
| **Sentiment Forecasting** | ~5,000 | ~2,500 | **~$0.038** | Weekly |
| **Mission Control Briefing** | ~6,000 | ~4,000 | **~$0.055** | Daily |
| **Strategic Shift Detection** | ~4,000 | ~2,000 | **~$0.030** | Periodic |
| **Theme Detection** | ~5,000 | ~2,000 | **~$0.033** | Per analysis |
| **Ask SignalsLoop (complex)** | ~4,000 | ~2,000 | **~$0.030** | 50-200/month |
| **Roast Roadmap (with vision)** | ~8,000 | ~3,000 | **~$0.050** | 5-20/month |
| **Proactive Spec Writer** | ~3,000 | ~4,000 | **~$0.048** | Weekly |
| **Competitive Intel Analysis** | ~3,000 | ~2,000 | **~$0.028** | Per analysis |
| **Hunter Agent Actions** | ~2,000 | ~1,500 | **~$0.020** | Per action |

**Heavy Pro User GPT-4o Costs:**
- 30 spec generations: ~$1.44
- 30 quality scores: ~$0.75
- 20 devil's advocate: ~$0.70
- 50 call analyses: ~$1.75
- 4 executive briefs: ~$0.17
- 30 mission briefings: ~$1.65
- 100 ask queries: ~$3.00
- 10 roast roadmaps: ~$0.50
- Weekly theme detection (4): ~$0.13
- **Subtotal: ~$10.09/month**

---

#### 🔵 Embeddings (text-embedding-3-small: $0.02/1M tokens)

| Feature | Tokens/Call | Cost/Call | Usage |
|---------|-------------|-----------|-------|
| Spec Embeddings | ~2,000 | ~$0.00004 | Per spec |
| Duplicate Detection Embeddings | ~500 | ~$0.00001 | Per post |
| RAG Context Retrieval | ~1,000 | ~$0.00002 | Per query |

**Embedding costs are negligible: <$0.10/month even for heavy users**

---

#### 🟣 Claude/Anthropic Features (EXPENSIVE: $0.003-0.06 per call)

> You also have Anthropic API configured. Claude Sonnet 4 is used for specific features.

**Anthropic Pricing (December 2024):**
| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| **Claude Sonnet 4** | $3.00 | $15.00 |
| Claude 3.5 Sonnet | $3.00 | $15.00 |
| Claude 3 Haiku | $0.25 | $1.25 |

**Features Using Claude:**

| Feature | Model | Input Tokens | Output Tokens | Cost/Call | Usage |
|---------|-------|-------------|---------------|-----------|-------|
| **Weekly Insights Synthesizer** | Claude Sonnet 4 | ~8,000 | ~4,000 | **~$0.084** | Weekly |
| **Intent Parser (Ask SignalsLoop)** | Claude Sonnet 4 | ~2,000 | ~500 | **~$0.014** | Per query |
| **Stakeholder Response Generator** | Claude Sonnet 4 | ~4,000 | ~2,000 | **~$0.042** | Per response |
| **Stakeholder PRD Creation** | Claude Sonnet 4 | ~3,000 | ~4,000 | **~$0.069** | Per PRD |

**Claude Costs for Heavy User:**
- 4 weekly insights: ~$0.34
- 200 Ask queries (intent parsing): ~$2.80
- 20 stakeholder responses: ~$0.84
- 5 stakeholder PRDs: ~$0.35
- **Subtotal: ~$4.33/month**

---

### 📊 Revised Cost Per User Scenario

#### Light User (Indie/Small Startup) - Free Tier
- ~50 feedback items/month
- 10 AI requests/day (basic features)
- No spec generation, no advanced features
- **AI Cost: ~$0.50-1.00/month**
- **You LOSE money on active free users**

#### Moderate User (Early Stage Team) - Pro
- ~300 feedback items/month
- Regular categorization, sentiment, duplicates
- 5-10 specs/month
- 2 executive briefs/month
- Light Ask SignalsLoop usage (20 queries)
- **AI Cost: ~$5.00-10.00/month**
- **Margin on $19: 47-74%**

#### Heavy User (Growing PM Team) - Pro
- ~1,000 feedback items/month
- All basic AI at moderate usage
- 20-30 specs/month + quality scoring
- Devil's advocate on 15 specs
- 30 call transcripts analyzed
- 4 executive briefs/month
- 100+ Ask queries (uses Claude for intent parsing)
- Hunter agent active
- Weekly insights reports (Claude)
- **AI Cost: ~$30.00-50.00/month** (includes ~$4-5 Claude)
- **⚠️ NEGATIVE MARGIN on $19 plan**

#### Power User (Enterprise Team) - Pro
- ~3,000+ feedback items/month
- All features at maximum usage
- 50+ specs/month
- 100+ call transcripts
- Daily mission briefings
- Full competitive intel
- Heavy Ask SignalsLoop (200+ queries with Claude intent parsing)
- Weekly insights synthesis (Claude)
- Stakeholder management features (Claude)
- **AI Cost: ~$100.00-200.00/month** (includes ~$10-15 Claude)
- **⚠️ SIGNIFICANT LOSS on $19 plan**

---

### ⚠️ Critical Finding: Current Pricing May Not Be Sustainable

| User Type | Monthly AI Cost | $19 Revenue | Profit/Loss |
|-----------|----------------|-------------|-------------|
| Light (Free) | $0.50-1.00 | $0 | **-$0.50-1.00** |
| Moderate (Pro) | $5-12 | $19 | **+$7-14** |
| Heavy (Pro) | $30-50 | $19 | **-$11 to -$31** |
| Power (Pro) | $100-200 | $19 | **-$81 to -$181** |

**Cost Breakdown by Provider (Heavy User):**
| Provider | Features | Est. Monthly Cost |
|----------|----------|-------------------|
| OpenAI GPT-4o | Specs, Briefs, Mission Control, etc. | ~$10-15 |
| OpenAI GPT-4o-mini | Basic categorization, sentiment, etc. | ~$15-25 |
| Anthropic Claude | Insights, Intent Parsing, Stakeholders | ~$4-8 |
| OpenAI Embeddings | Vector search, RAG | ~$0.10 |
| **Total** | All AI features | **~$30-50** |

**If 20% of Pro users are "heavy" or "power" users, you will lose significant money on them.**

---

## 🏢 Other Infrastructure Costs

### Supabase (Database & Auth)
- **Free Tier**: 500MB database, 1GB file storage
- **Pro**: $25/month (8GB database, 100GB storage)
- **Team**: $599/month (for scale)

### Vercel (Hosting)
- **Hobby**: Free
- **Pro**: $20/user/month
- **Enterprise**: Custom

### Other Services
- **Resend (Email)**: $0-$20/month based on volume
- **Stripe Fees**: 2.9% + $0.30 per transaction

### Fixed Monthly Infrastructure Cost (Current)
| Service | Estimated Cost |
|---------|---------------|
| Supabase Pro | $25 |
| Vercel Pro | $20 |
| Resend | $10 |
| Domain/SSL | $2 |
| **Total Fixed** | **~$57/month** |

---

## 🎯 Competitor Analysis

### Feedback Management Tools

| Competitor | Entry Price | Per-User? | AI Features | Target Market |
|------------|-------------|-----------|-------------|---------------|
| **Productboard** | $19/maker/mo | Yes | Add-on ($20/mo) | Mid-market/Enterprise |
| **Canny** | $19/mo (100 users) | Usage-based | None | Startups/Mid-market |
| **UserVoice** | $699-999/mo | No | Limited | Enterprise |
| **Aha!** | $59/user/mo | Yes | Limited | Enterprise |
| **Beamer** | $29/mo | No | None | Startups |
| **Upvoty** | $15/mo | No | None | Indie/Startups |
| **Frill** | $25/mo | No | None | Startups |
| **Featurebase** | Free-$49/mo | No | Some | Startups/Mid |

### Key Insights

1. **Per-user pricing is expensive**: Productboard Pro = $59/maker/mo × 5 users = $295/month
2. **Usage-based can escalate**: Canny Pro at 1,000 users = ~$500-660/month
3. **Enterprise tools are very expensive**: UserVoice starts at $699/month
4. **AI features are rare**: Most competitors don't have comprehensive AI
5. **No one offers your feature depth**: 8 AI agents is unique

### SignalsLoop Competitive Position

**You are significantly cheaper than:**
- Productboard (93% cheaper for 5-person team)
- Canny at scale (70% cheaper at 1,000 users)
- UserVoice (97% cheaper)
- Aha! (94% cheaper for 5-person team)

**You offer more features than:**
- All competitors in terms of AI automation
- Most in terms of competitive intelligence
- All in terms of integrated spec writing

---

## 🧮 Customer Willingness to Pay Analysis

### Target Segments & Price Sensitivity

| Segment | Company Size | Budget Range | Key Decision Factor |
|---------|-------------|--------------|---------------------|
| **Indie Makers** | 1-2 people | $0-20/mo | Must be cheap, value features |
| **Early Startups** | 3-10 people | $20-50/mo | ROI on time savings |
| **Growing Startups** | 10-50 people | $50-150/mo | Features, integrations |
| **Mid-Market** | 50-200 people | $150-500/mo | Scale, support, security |
| **Enterprise** | 200+ people | $500-2000+/mo | Compliance, custom, SLA |

### Research-Based Insights

1. **Newcomer Discount Expected**: New tools typically need to price 30-50% below established players to overcome switching costs

2. **Free Tier is Essential**: For developer/PM tools, a generous free tier is critical for adoption

3. **Value-Based Pricing Works**: Teams pay for outcomes (time saved, features shipped faster), not features

4. **AI Commands Premium**: Tools with AI automation can charge 20-40% more than traditional tools

---

## 💡 Recommended Pricing Strategy

### Option A: Current Model (Optimized)

Keep simple 2-tier model but adjust:

| Tier | Price | Target |
|------|-------|--------|
| **Free** | $0 | Indie makers, testing |
| **Pro** | $29/mo ($24/mo annual) | Small teams, startups |

**Rationale**: $19 may be too cheap given feature depth. $29 still competitive.

---

### Option B: Three-Tier Model (Recommended)

| Tier | Price | Target | Key Differentiators |
|------|-------|--------|---------------------|
| **Free** | $0 | Validation | 1 board, 50 posts, 10 AI/day |
| **Starter** | $19/mo | Bootstrapped/Indies | 3 boards, 500 posts, 100 AI/day |
| **Pro** | $49/mo | Growing teams | Unlimited, full AI, integrations |
| **Business** | $149/mo | Established teams | API, SSO, priority support, analytics |

**Detailed Breakdown:**

#### Free ($0)
- 1 feedback board
- 50 posts maximum
- 10 AI requests/day (all basic features)
- Public boards only
- Community support
- SignalsLoop branding

#### Starter ($19/month)
- 3 feedback boards
- 500 posts
- 100 AI requests/day
- Private boards
- Slack/Discord notifications
- CSV export
- Email support
- Remove branding

#### Pro ($49/month)
- Unlimited boards
- Unlimited posts
- Unlimited AI (basic features)
- 50 advanced AI/day (Spec Writer, Devil's Advocate, Predictions)
- Hunter Agent (3 platforms)
- Jira/Linear integration
- Custom domain
- API access (10k requests/mo)
- Priority support

#### Business ($149/month)
- Everything in Pro
- Unlimited advanced AI
- Hunter Agent (all 8 platforms)
- Competitive Intelligence War Room
- Executive Briefs
- Churn Radar
- Call Intelligence (100 calls/mo)
- Full API access (100k requests/mo)
- SSO/SAML
- Dedicated support
- SLA guarantee

---

### Option C: Usage-Based Hybrid

Base subscription + usage credits:

| Tier | Base Price | AI Credits | Extra Credits |
|------|-----------|-----------|---------------|
| **Free** | $0 | 100/mo | N/A |
| **Pro** | $29/mo | 2,000/mo | $0.01 each |
| **Scale** | $99/mo | 10,000/mo | $0.005 each |
| **Enterprise** | Custom | Unlimited | Included |

**Pros**: Scales with usage, fair for light users
**Cons**: Unpredictable billing, customer friction

---

## 📈 Financial Projections

### With Option B (Three-Tier Model)

**Cost per Customer (Monthly)**
| Tier | Revenue | Est. AI Cost | Est. Margin |
|------|---------|--------------|-------------|
| Free | $0 | $0.50 | -$0.50 |
| Starter | $19 | $1.50 | $17.50 (92%) |
| Pro | $49 | $5.00 | $44.00 (90%) |
| Business | $149 | $20.00 | $129.00 (87%) |

**Break-Even Analysis**
- Fixed costs: ~$57/month
- Need ~3 Starter or ~1.5 Pro customers to cover fixed costs

**Scaling Projections (Monthly)**
| Customers | Free | Starter | Pro | Business | MRR | Est. AI Costs | Gross Margin |
|-----------|------|---------|-----|----------|-----|---------------|--------------|
| 100 | 70 | 20 | 8 | 2 | $1,070 | $85 | 92% |
| 500 | 350 | 100 | 40 | 10 | $5,350 | $425 | 92% |
| 1,000 | 700 | 200 | 80 | 20 | $10,700 | $850 | 92% |

---

## 🎯 Recommended Approach

### Phase 1: Launch (0-6 months)
**Keep it simple with current $19 Pro pricing**
- Focus on acquisition, not revenue optimization
- Generous free tier to build user base
- Collect usage data for pricing decisions

### Phase 2: Validation (6-12 months)
**Introduce Starter tier if needed**
- If churn is high at $19, add $9 tier
- If retention is strong, consider raising to $29

### Phase 3: Scale (12+ months)
**Add Business tier for larger teams**
- $99-149/month with enterprise features
- API access, SSO, priority support
- Volume discounts for annual

### Key Principles

1. **Don't raise prices on existing customers** - Grandfather them in
2. **Annual discounts work** - 20% off is standard and effective
3. **Free tier is marketing** - Budget for it as acquisition cost
4. **Value > Features** - Sell time saved, not AI calls

---

## 📋 Action Items

### Immediate
- [ ] Keep current Free/$19 Pro model for now
- [ ] Monitor AI usage costs per customer segment
- [ ] Track conversion rates Free → Pro

### 3-6 Months
- [ ] Evaluate if $19 is sustainable given feature depth
- [ ] Consider raising to $29 for new customers
- [ ] Add usage analytics for pricing decisions

### 6-12 Months
- [ ] Introduce Business tier ($99-149) if demand exists
- [ ] Consider Starter tier ($9-15) for price-sensitive segment
- [ ] Evaluate API/metered pricing for heavy users

---

## 📊 Summary Comparison

| Strategy | MRR at 500 Paid | Avg Revenue/User | Complexity |
|----------|-----------------|------------------|------------|
| Current ($19 Pro only) | $9,500 | $19 | Simple |
| Option A ($29 Pro) | $14,500 | $29 | Simple |
| Option B (3-tier) | $12,700 | $25.40 | Moderate |
| Option C (Usage-based) | Variable | Variable | Complex |

**Recommendation**: Start with current model, validate product-market fit, then move to **Option B (Three-Tier)** as you scale.

---

*Last Updated: December 14, 2025*
*Version: 1.0*
