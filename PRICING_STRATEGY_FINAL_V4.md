# SignalsLoop: Final Pricing Strategy v4.1

**Decision: Free / $19 Pro / $79 Premium (Account-Based)**

---

## Final Pricing

| Tier | Monthly | Annual | Target |
|------|---------|--------|--------|
| **Free** | $0 | — | Testing |
| **Pro** | $19/mo | $15/mo ($180/yr) | Indie makers, solo founders |
| **Premium** | $79/mo | $63/mo ($756/yr) | PM teams (3-10 people) |

**Pricing Model:** Account-based (usage limits shared across all seats)

---

## Unit Economics

| Metric | Pro ($19) | Premium ($79) |
|--------|-----------|---------------|
| Revenue | $19.00 | $79.00 |
| Stripe fee (2.9% + $0.30) | -$0.85 | -$2.59 |
| AI costs (heavy user) | -$4.09 | -$12.47 |
| Infrastructure | -$0.50 | -$0.50 |
| **Net Revenue** | **$13.56** | **$63.44** |
| **Net Margin** | **71.4%** | **80.3%** |
| CAC Payback (~$38) | 2.8 months | 0.6 months |

---

## Pro Tier ($19/month) — Updated Limits

| Category | Feature | Limit |
|----------|---------|-------|
| **Resources** | Boards | **5** |
| | Posts | **1,000** |
| | Team Members | 2 |
| **Basic AI** | Categorization | 1,000/mo |
| | Sentiment | 1,000/mo |
| | Duplicates | **1,000/mo** |
| | Smart Replies | 200/mo |
| | Writing Assistant | 500/mo |
| **Advanced AI** | Spec Generation | **10/mo** |
| | Quality Scoring | 8/mo |
| | Devil's Advocate | **5/mo** |
| | Ask SignalsLoop | **50/mo** |
| | Theme Detection | **8/mo** |
| **Premium AI** | Executive Briefs | 1/mo |
| | Call Intelligence | 5/mo |
| **Hunter** | Reddit + HN | Every 24hr |
| **Integrations** | Jira, Slack | ✅ |
| | API calls | **1,000/mo** |

---

## Premium Tier ($79/month)

| Category | Feature | Limit |
|----------|---------|-------|
| **Resources** | Boards | Unlimited |
| | Posts | Unlimited |
| | Team Members | 10 |
| **Basic AI** | All | Unlimited |
| **Advanced AI** | Spec Generation | 30/mo |
| | Quality Scoring | 30/mo |
| | Devil's Advocate | 15/mo |
| | Ask SignalsLoop | 100/mo |
| | Theme Detection | Unlimited |
| **Premium AI** | Executive Briefs | 4/mo |
| | Call Intelligence | 20/mo |
| **Hunter** | Reddit + HN | Every 4hr |
| **Integrations** | All + Linear, Webhooks | ✅ |
| | API calls | 5,000/mo |
| **Team** | Role permissions | ✅ |
| **Support** | Priority (24hr) | ✅ |

---

## Free Tier ($0)

| Resource | Limit |
|----------|-------|
| Boards | 1 |
| Posts | 50 |
| Team | 1 |
| Basic AI | 30/day each |
| Advanced AI | ❌ |
| Hunter | ❌ |

---

## Feature Comparison Matrix

| Feature | Free | Pro ($19) | Premium ($79) |
|---------|:----:|:---------:|:-------------:|
| **Resources** |
| Boards | 1 | 5 | ∞ |
| Posts | 50 | 1,000 | ∞ |
| Team Members | 1 | 2 | 10 |
| **Hunter Agent** |
| Reddit + HN | ❌ | ✅ 24hr | ✅ 4hr |
| **AI — Basic** |
| Categorization | 30/day | 1K/mo | ∞ |
| Sentiment | 30/day | 1K/mo | ∞ |
| Duplicates | 10/day | 1K/mo | ∞ |
| Smart Replies | 5/day | 200/mo | 1K/mo |
| Writing Assistant | ❌ | 500/mo | ∞ |
| **AI — Advanced** |
| Spec Generation | ❌ | 10/mo | 30/mo |
| Quality Scoring | ❌ | 8/mo | 30/mo |
| Devil's Advocate | ❌ | 5/mo | 15/mo |
| Ask SignalsLoop | ❌ | 50/mo | 100/mo |
| Theme Detection | ❌ | 8/mo | ∞ |
| **AI — Premium** |
| Executive Briefs | ❌ | 1/mo | 4/mo |
| Call Intelligence | ❌ | 5/mo | 20/mo |
| **Competitive Intel** |
| War Room | ❌ | Basic | Full |
| **Integrations** |
| Widget | ✅ | ✅ | ✅ |
| Jira | ❌ | ✅ | ✅ |
| Slack | ❌ | ✅ | ✅ |
| Linear | ❌ | ❌ | ✅ |
| Webhooks | ❌ | ❌ | ✅ |
| API Calls | ❌ | 1K/mo | 5K/mo |
| **Platform** |
| Private Boards | ❌ | ✅ | ✅ |
| Custom Domain | ❌ | ✅ | ✅ |
| Remove Branding | ❌ | ✅ | ✅ |
| Team Permissions | ❌ | ❌ | ✅ |
| **Support** |
| Community | ✅ | ✅ | ✅ |
| Email (48hr) | ❌ | ✅ | ✅ |
| Priority (24hr) | ❌ | ❌ | ✅ |

---

## Stripe Products

| Product | Price ID | Amount |
|---------|----------|--------|
| Pro Monthly | `pro_monthly` | $19/mo |
| Pro Annual | `pro_annual` | $180/yr ($15/mo) |
| Premium Monthly | `premium_monthly` | $79/mo |
| Premium Annual | `premium_annual` | $756/yr ($63/mo) |

---

## Upgrade Triggers

**Free → Pro:**
- 50 posts limit
- Want Hunter Agent
- Want Spec Writer
- Want private boards

**Pro → Premium:**
- 10 specs/month limit
- Need 3+ team members
- Want 4hr scan frequency
- Need Linear/Webhooks
- Need full War Room

---

*Ready for implementation.*
