# SignalsLoop Phase 1-2 Features Documentation

This document describes the four major features implemented as part of the Phase 1-2 product roadmap.

## Table of Contents

1. [Universal Feedback Inbox](#universal-feedback-inbox)
2. [Spec Quality Score](#spec-quality-score)
3. [Executive Auto-Brief](#executive-auto-brief)
4. [Churn Radar](#churn-radar)

---

## Universal Feedback Inbox

### Overview
A unified inbox that aggregates customer feedback from multiple sources into a single, AI-powered interface.

### Supported Integrations
- **Communication**: Slack, Discord, Gmail, Outlook
- **Support**: Intercom, Zendesk
- **Reviews**: G2, App Store, Play Store
- **Social**: Twitter/X, Reddit, Product Hunt, Hacker News
- **Surveys**: Typeform
- **Custom**: In-app widget

### Key Features
- **Auto-Classification**: AI categorizes feedback as bug, feature request, praise, complaint, question, or churn risk
- **Sentiment Analysis**: Real-time sentiment scoring (-1 to +1)
- **Urgency Detection**: Priority scoring (1-5) with AI-generated reasoning
- **Deduplication**: Content hashing and semantic similarity detection
- **Customer Unification**: Links feedback to unified customer profiles
- **Reply Capability**: Respond directly from inbox, replies sent to original channel

### Database Tables
- `customers` - Unified customer profiles
- `feedback_integrations` - Integration configurations
- `unified_feedback_items` - All feedback items
- `inbox_sync_logs` - Sync operation tracking

### API Endpoints
```
GET  /api/inbox/items          - List feedback items
GET  /api/inbox/items/[id]     - Get single item
PATCH /api/inbox/items/[id]    - Update item status
GET  /api/inbox/stats          - Get inbox statistics
GET  /api/inbox/integrations   - List integrations
POST /api/inbox/integrations   - Create integration
POST /api/inbox/sync           - Trigger sync
GET  /api/inbox/customers      - List customers
```

### Components
- `InboxList` - Main inbox list view with filters
- `InboxItemDetail` - Detailed item view with reply
- `IntegrationWizard` - Integration setup wizard

### Page Route
`/[slug]/inbox`

---

## Spec Quality Score

### Overview
AI-powered quality evaluation for product specifications with actionable improvement suggestions and auto-fix capabilities.

### Quality Dimensions
1. **Completeness** (20%) - Are all required sections present?
2. **Clarity** (20%) - Is the language unambiguous?
3. **Acceptance Criteria** (20%) - Are criteria in proper Given/When/Then format?
4. **Edge Cases** (15%) - Are edge cases covered?
5. **Technical Detail** (10%) - Is there enough technical context?
6. **Success Metrics** (15%) - Are metrics defined and measurable?

### Grading System
- **A**: 90-100 (Excellent)
- **B**: 80-89 (Good)
- **C**: 70-79 (Acceptable)
- **D**: 60-69 (Needs Work)
- **F**: Below 60 (Poor)

### Key Features
- **Issue Detection**: Identifies critical, major, minor issues and suggestions
- **Auto-Fix**: AI-powered automatic issue resolution
- **Readability Score**: Engineer-focused readability assessment
- **Rework Risk**: Predicts likelihood of spec bouncing back
- **Improvement Generation**: Full spec rewrite with AI enhancements

### API Endpoint
```
POST /api/specs/quality
  - action: 'evaluate' | 'autofix' | 'improve'
```

### Components
- `SpecQualityScore` - Quality dashboard with dimensions and issues

---

## Executive Auto-Brief

### Overview
Automated weekly/monthly briefings for stakeholders with AI-generated insights, action items, and competitive intelligence.

### Brief Types
- **Daily**: Past 24 hours
- **Weekly**: Past 7 days
- **Monthly**: Past 30 days

### Content Sections
1. **Executive Summary** - AI-generated 2-3 sentence overview
2. **Key Metrics** - Sentiment, feedback, themes, health score
3. **Revenue at Risk** - Accounts with churn risk and their MRR
4. **Top Insights** - AI-identified patterns and opportunities
5. **Action Items** - Prioritized recommendations
6. **Competitor Moves** - Recent competitive intelligence
7. **Top Themes** - Most active feedback themes
8. **Top Requests** - Highest voted feature requests

### Output Formats
- **Markdown** - For internal use and Slack
- **HTML** - For email distribution
- **PDF** - For executive sharing (planned)

### Database Tables
- `brief_templates` - Customizable templates
- `executive_briefs` - Generated briefs
- `brief_schedules` - Automated schedules

### API Endpoints
```
GET  /api/briefs           - List briefs
POST /api/briefs           - Generate brief
GET  /api/briefs/[id]      - Get brief
POST /api/briefs/[id]      - Send brief
```

### Components
- `BriefsDashboard` - Brief list and generation
- `BriefPreview` - Full brief rendering with tabs

### Page Route
`/[slug]/briefs`

---

## Churn Radar

### Overview
Proactive customer health monitoring and churn prediction system with automated alerts.

### Health Score Components
| Signal | Weight | Description |
|--------|--------|-------------|
| Engagement | 25% | Login frequency, activity |
| Sentiment | 25% | Feedback sentiment, NPS |
| Support | 20% | Ticket volume, resolution time |
| Product Usage | 20% | Feature adoption rate |
| Payment | 10% | Payment failures, status |

### Risk Levels
- **Low** (70-100): Healthy customer
- **Medium** (50-69): Monitor closely
- **High** (30-49): At risk
- **Critical** (0-29): Immediate action needed

### Alert Types
- `health_drop` - Significant health score decrease
- `churn_risk_increase` - Risk level escalation
- `engagement_drop` - Login/activity decline
- `negative_feedback` - Multiple negative feedback items
- `payment_failure` - Payment issues detected
- `contract_expiring` - Renewal approaching

### Database Tables
- `customer_health` - Health scores and metrics
- `customer_health_history` - Score changes over time
- `churn_alerts` - Generated alerts
- `churn_alert_rules` - Configurable alert triggers

### API Endpoints
```
GET  /api/churn-radar               - Summary or customer list
POST /api/churn-radar               - Calculate health
GET  /api/churn-radar/[id]          - Get customer health
GET  /api/churn-radar/alerts        - List alerts
PATCH /api/churn-radar/alerts       - Update alert status
```

### Components
- `ChurnRadarDashboard` - Main dashboard with customers and alerts

### Page Route
`/[slug]/churn-radar`

---

## Database Migrations

All new features require the following migrations to be run:

```bash
# In order:
supabase/migrations/202512_universal_inbox.sql
supabase/migrations/202512_executive_briefs.sql
supabase/migrations/202512_churn_radar.sql
```

---

## Environment Variables

New environment variables needed:

```env
# For Gmail integration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# For Twitter integration
TWITTER_BEARER_TOKEN=your-twitter-bearer-token

# For G2 integration
G2_API_KEY=your-g2-api-key

# For Intercom integration
INTERCOM_ACCESS_TOKEN=your-intercom-token
```

---

## Pricing Impact

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 3 integrations, basic AI, 100 items/mo |
| Pro | $49/mo | 10 integrations, Executive Brief, Spec Quality, Churn Radar (5 accounts) |
| Business | $99/mo | Unlimited integrations, Churn Radar (unlimited), API access |

---

## Success Metrics

### Universal Inbox
- Reduce time scanning feedback channels by 3-5 hours/week
- 90%+ classification accuracy
- < 1% duplicate rate

### Spec Quality Score
- Reduce spec bounce rate from 40% to < 10%
- 80%+ specs achieve grade B or higher
- 50% reduction in engineering rework

### Executive Brief
- Transform 4-hour prep into 5 minutes
- 80%+ stakeholder engagement rate
- 2x increase in data-backed decisions

### Churn Radar
- Identify 90%+ of churning accounts before they leave
- Save 1+ customer/month worth subscription cost
- 30% reduction in surprise churn
