<!-- 5f4bcf7d-1d8b-4145-a099-4b0bc852ff04 ab1a5689-a093-44c0-bd7b-0217ce5e8bcc -->
# SignalsLoop Phase 1-2: Detailed Implementation Plan

## Executive Summary

This document covers detailed technical architecture, MVP scope, success metrics, and implementation timeline for 4 priority features across Phase 1 and Phase 2.

**Timeline:** 16 weeks total

**Team assumption:** 1-2 full-stack engineers

---

## EXISTING INFRASTRUCTURE (Leverage Points)

Based on codebase analysis, we already have:

| Component | Location | Reusable For |

|-----------|----------|--------------|

| Hunter System | `src/lib/hunters/base-hunter.ts` | Universal Inbox - already pulls from Twitter, Reddit, G2, ProductHunt, HackerNews |

| Slack Integration | `src/lib/slack/` | Universal Inbox - Slack feedback |

| Discord Integration | `src/lib/discord.ts` | Universal Inbox - Discord feedback |

| CRM Integration | `src/lib/crm/hubspot.ts`, `salesforce.ts` | Churn Radar - revenue data |

| Mission Control Briefing | `src/lib/ai/mission-control.ts` | Executive Auto-Brief - briefing generation |

| Spec Writer | `src/lib/specs/` | Spec Quality Score - existing spec structure |

| AI Categorization | `src/lib/ai-categorization.ts` | Universal Inbox - feedback classification |

| Anomaly Detection | `src/lib/predictions/anomaly-detection.ts` | Churn Radar - pattern detection |

---

## FEATURE 1: The Universal Feedback Inbox

**Pain point:** Feedback scattered across Slack, email, Intercom, surveys

**What it does:**

- Single inbox that pulls from: Intercom, Zendesk, Slack, Discord, email, Twitter/X, G2, App Store reviews, Typeform, in-app widget
- AI auto-categorizes, deduplicates, and links related items
- "Same person complained on Twitter AND submitted a support ticket" - shows unified customer view
- One-click reply that posts back to the original channel

**Why customers pay:**

- Saves 3-5 hours/week scanning multiple tools
- Never miss feedback from ANY channel
- "We found a critical bug report buried in a G2 review"

**Pricing lever:** Number of connected sources (Free: 3, Pro: 10, Business: unlimited)

**Build cost:** 4-6 weeks (mostly integration work)

**Revenue impact:** This is table-stakes for PLG - drives initial conversion

---

## FEATURE 2: Executive Auto-Brief (Stakeholder Alignment Killer)

**Pain point:** Can't justify prioritization to executives

**What it does:**

- Weekly auto-generated PDF/Notion doc for executives
- Contains: Top themes, sentiment trends, customer quotes, competitive moves, recommended priorities with data backing
- "We should prioritize Feature X because: 47 customers requested it, it's blocking $50K ARR in deals (from CRM), competitor Y launched it 2 weeks ago"
- One-click Slack/email to stakeholders

**Why customers pay:**

- Turns 4-hour "prep for exec meeting" into 5 minutes
- Data-backed arguments win budget battles
- PMs look like heroes to leadership

**Pricing lever:** Premium feature ($49+/mo tier)

**Build cost:** 2-3 weeks (leverage existing briefing + CRM data)

**Revenue impact:** High upsell driver - this is what gets Pro conversions

**Example output:**

```
WEEKLY PRODUCT BRIEF - Dec 2-8

TOP INSIGHT: Payment flow friction mentioned by 23 customers
(up 340% from last week - triggered by v2.3 release)

REVENUE AT RISK: $12,400 ARR from 3 accounts mentioning churn
- Acme Corp ($5K): "Considering alternatives if X isn't fixed"
- Beta Inc ($4K): "Our team is frustrated with..."
- Gamma LLC ($3.4K): No response to last 2 tickets

COMPETITIVE ALERT: Competitor X launched SSO
- 8 of your customers mentioned wanting this
- Estimated effort: 2 weeks

RECOMMENDED PRIORITY: Fix payment flow (ROI: 340% based on at-risk revenue)
```

---

## FEATURE 3: Churn Radar (Customer Health Score That Works)

**Pain point:** Customers churn without warning

**What it does:**

- Daily-updated health score for each customer/account
- Combines: feedback sentiment, support ticket volume, feature usage, NPS responses, payment failures
- Proactive alerts: "3 accounts moved from green to yellow this week"
- Specific reasons: "Acme Corp: 2 negative support tickets + no logins in 14 days + mentioned competitor"
- Suggested actions: "Send check-in email" with AI-drafted template

**Why customers pay:**

- "We saved a $10K account because SignalsLoop warned us"
- Concrete ROI: prevented churn = money saved
- Even 1 saved customer/month pays for annual subscription

**Pricing lever:** Core feature, but alerts/actions limited on free tier

**Build cost:** 3-4 weeks (needs usage data integration)

**Revenue impact:** Highest retention driver - customers who use this don't churn from SignalsLoop

**Integration requirements:**

- Stripe/billing data (payment failures)
- Segment/Mixpanel (usage data)
- Intercom/Zendesk (ticket volume)

---

## FEATURE 4: Spec Quality Score + Auto-Fix

**Pain point:** Specs are unclear, causing engineering rework

**What it does:**

- Analyzes spec and gives quality score (1-100)
- Flags specific issues: "Missing acceptance criteria for edge case X"
- "This user story is ambiguous - did you mean A or B?"
- Auto-suggests improvements: "Add: What happens when user has no payment method?"
- Engineer readability score: "Technical complexity: High - consider breaking into 2 specs"

**Why customers pay:**

- Engineering rework costs $$ (average 20% of sprint capacity)
- "Our specs used to bounce back 40% of the time, now it's 5%"
- Faster shipping = competitive advantage

**Pricing lever:** Included in Pro, unlimited in Business

**Build cost:** 2 weeks (enhance existing spec writer)

**Revenue impact:** Medium - nice differentiator, not primary buying reason

**Quality checklist it evaluates:**

- [ ] Clear user story format
- [ ] Acceptance criteria defined
- [ ] Edge cases covered
- [ ] Technical constraints noted
- [ ] Success metrics defined
- [ ] Dependencies identified

---

## FEATURE 5: Competitor War Room

**Pain point:** Find out about competitor moves too late

**What it does:**

- Real-time monitoring of competitor: websites, changelogs, app stores, social media, job postings
- Instant alerts: "Competitor X just launched Feature Y - here's what it does"
- Feature gap analysis: "You have 3 features they don't, they have 5 you don't"
- Customer impact: "12 of your customers also follow Competitor X on Twitter"
- Trend tracking: "Competitor is hiring 5 ML engineers - likely building AI features"

**Why customers pay:**

- "We matched a competitor feature within 2 weeks of their launch"
- Strategic advantage = revenue protection
- Job posting analysis is surprisingly valuable intelligence

**Pricing lever:** Premium add-on ($29/mo) or Business tier only

**Build cost:** 4-5 weeks (need scraping infrastructure)

**Revenue impact:** High perceived value, good upsell

**Alert examples:**

```
🚨 COMPETITOR ALERT: Acme Corp

WHAT: Launched "Smart Reports" feature
WHEN: 2 hours ago
DETAILS: Auto-generated analytics dashboards

YOUR CUSTOMER IMPACT:
- 8 customers have mentioned wanting this
- 2 accounts cited this as reason for evaluating Acme

RECOMMENDED RESPONSE:
- Your "Insights Dashboard" covers 70% of this
- Gap: They have scheduled email reports, you don't
- Effort to close gap: ~1 week
```

---

## FEATURE 6: The "Why" Button (AI Reasoning Layer)

**Pain point:** Can't explain AI decisions to stakeholders

**What it does:**

- Every AI recommendation has a "Why?" button
- Shows: data sources, reasoning chain, confidence level, assumptions
- "This feature is ranked #1 because: 47 requests (weight: 40%) + $30K revenue impact (weight: 35%) + aligns with Q1 OKR (weight: 25%)"
- Exportable to include in executive decks
- Adjustable weights: "I care more about revenue than request count"

**Why customers pay:**

- Trust in AI = actually using AI
- Stakeholder buy-in requires explainability
- Customizable weights = fits their process

**Pricing lever:** Basic "Why" free, customizable weights in Pro

**Build cost:** 2 weeks (mostly UI, AI reasoning partially exists)

**Revenue impact:** Trust builder - increases AI feature adoption

---

## Implementation Priority (Revenue-Optimized)

### Phase 1: Conversion Drivers (Next 8 weeks)

| Feature | Effort | Revenue Impact | Why Now |

|---------|--------|----------------|---------|

| Universal Inbox | 4-6 wks | High (conversion) | Table stakes for PLG |

| Spec Quality Score | 2 wks | Medium | Quick win, enhances existing |

### Phase 2: Upsell Drivers (Weeks 8-16)

| Feature | Effort | Revenue Impact | Why Now |

|---------|--------|----------------|---------|

| Executive Auto-Brief | 2-3 wks | High (Pro upsell) | Clear $49+ value |

| Churn Radar | 3-4 wks | High (retention) | Keeps customers paying |

### Phase 3: Premium/Enterprise (Weeks 16-24)

| Feature | Effort | Revenue Impact | Why Now |

|---------|--------|----------------|---------|

| Competitor War Room | 4-5 wks | Medium (add-on) | Differentiator |

| Why Button + Custom Weights | 2 wks | Medium (trust) | Enables AI adoption |

---

## Revenue Model Suggestion

Based on self-serve $20-100/mo:

| Tier | Price | Features |

|------|-------|----------|

| **Free** | $0 | 3 integrations, basic AI categorization, 100 feedback items/mo |

| **Pro** | $49/mo | 10 integrations, Executive Brief, Spec Quality, Churn Radar (5 accounts) |

| **Business** | $99/mo | Unlimited integrations, Competitor War Room, Churn Radar (unlimited), API access |

| **Add-on** | +$29/mo | Competitor War Room (for Pro users who want it) |

---

## What This Gets You

After implementing all 6 features:

1. **Clear differentiation**: No competitor has Universal Inbox + Churn Radar + Executive Brief together
2. **Viral loops**: Executive Brief gets shared with stakeholders who become buyers
3. **Retention moat**: Churn Radar creates "we can't leave, it saves us money" feeling
4. **Upsell path**: Free → Pro ($49) → Business ($99) with clear value at each tier
5. **Word of mouth**: "SignalsLoop warned us about a churning customer" = testimonial gold

### To-dos

- [ ] Select 3-4 features from the vision to prioritize for detailed planning
- [ ] Create technical architecture docs for selected features
- [ ] Define MVP scope and success metrics for each priority feature
- [ ] Create detailed implementation plan with timelines