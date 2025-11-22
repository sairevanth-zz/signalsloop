# Phase 2 Implementation Plan: Predictive & Proactive
**Status**: Planning
**Timeline**: Weeks 5-8
**Goal**: Transform from reactive to proactive product intelligence

## Overview

Phase 2 builds on Phase 1's automation by adding predictive capabilities. Instead of just processing feedback as it arrives, we'll forecast trends, predict risks, and proactively surface insights.

---

## Features

### 1. Predictive Analytics (Weeks 5-6) ⚡

**Goal**: Forecast trends and predict outcomes before they happen

#### 1.1 Sentiment Trend Forecasting
**What**: Predict sentiment trajectory for the next 7-30 days
**Why**: Catch deteriorating satisfaction before churn happens
**Impact**: 2-4 weeks earlier warning on sentiment issues

**Database Schema**:
```sql
-- Table: sentiment_forecasts
CREATE TABLE sentiment_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Forecast details
  forecast_date DATE NOT NULL,
  predicted_sentiment NUMERIC NOT NULL CHECK (predicted_sentiment BETWEEN -1 AND 1),
  confidence_interval_lower NUMERIC NOT NULL,
  confidence_interval_upper NUMERIC NOT NULL,
  confidence_score NUMERIC NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),

  -- Model metadata
  model_version TEXT DEFAULT 'v1',
  training_data_points INTEGER,
  features_used JSONB DEFAULT '{}'::jsonb,

  -- Actuals (filled in as real data arrives)
  actual_sentiment NUMERIC CHECK (actual_sentiment BETWEEN -1 AND 1),
  forecast_error NUMERIC,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate forecasts
  CONSTRAINT unique_forecast_per_date UNIQUE (project_id, forecast_date)
);

CREATE INDEX idx_sentiment_forecasts_project ON sentiment_forecasts(project_id, forecast_date DESC);
CREATE INDEX idx_sentiment_forecasts_accuracy ON sentiment_forecasts(project_id, forecast_error) WHERE forecast_error IS NOT NULL;
```

**API Endpoints**:
- `GET /api/predictions/sentiment?projectId=xxx&days=30` - Get sentiment forecast
- `POST /api/predictions/sentiment/train` - Retrain forecasting model
- `GET /api/predictions/sentiment/accuracy` - Model performance metrics

**AI Implementation**:
```typescript
// src/lib/ai/sentiment-forecasting.ts
import Anthropic from '@anthropic-ai/sdk'

interface SentimentDataPoint {
  date: string
  sentiment_score: number
  feedback_volume: number
  themes: string[]
}

export async function forecastSentiment(
  projectId: string,
  historicalData: SentimentDataPoint[],
  days: number = 30
): Promise<SentimentForecast[]> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  })

  // Prepare time series data
  const timeSeriesContext = historicalData.map(d =>
    `${d.date}: sentiment=${d.sentiment_score}, volume=${d.feedback_volume}, themes=[${d.themes.join(', ')}]`
  ).join('\n')

  const prompt = `You are a time series forecasting expert. Analyze the historical sentiment data below and predict the sentiment trajectory for the next ${days} days.

Historical Data (last 90 days):
${timeSeriesContext}

Instructions:
1. Identify trends, seasonality, and patterns
2. Consider feedback volume and theme changes
3. Provide daily predictions with confidence intervals
4. Flag any concerning downward trends
5. Explain the key drivers behind the forecast

Respond in JSON format:
{
  "forecasts": [
    {
      "date": "YYYY-MM-DD",
      "predicted_sentiment": <-1 to 1>,
      "confidence_lower": <-1 to 1>,
      "confidence_upper": <-1 to 1>,
      "confidence_score": <0 to 1>
    }
  ],
  "trend": "improving|stable|declining",
  "risk_level": "low|medium|high",
  "key_drivers": ["driver1", "driver2"],
  "recommendations": ["action1", "action2"]
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4000,
    temperature: 0.3, // Lower for more consistent predictions
    messages: [{
      role: 'user',
      content: prompt
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  const result = JSON.parse(content.text)

  // Save forecasts to database
  await saveForecastsToDatabase(projectId, result.forecasts)

  return result
}
```

**UI Component**: Sentiment Forecast Chart (D3.js or Recharts)

---

#### 1.2 Churn Risk Prediction
**What**: Identify customers at risk of churning based on feedback patterns
**Why**: Enable proactive retention efforts
**Impact**: Reduce churn by 15-25%

**Database Schema**:
```sql
-- Table: churn_predictions
CREATE TABLE churn_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Customer identification
  customer_email TEXT NOT NULL,
  customer_name TEXT,

  -- Risk scoring
  churn_risk_score NUMERIC NOT NULL CHECK (churn_risk_score BETWEEN 0 AND 1),
  risk_category TEXT NOT NULL CHECK (risk_category IN ('low', 'medium', 'high', 'critical')),

  -- Risk factors
  risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  /*
  Example:
  [
    { "factor": "negative_sentiment_trend", "weight": 0.35, "value": "-0.6 over 30 days" },
    { "factor": "reduced_engagement", "weight": 0.25, "value": "60% drop in feedback" },
    { "factor": "unresolved_issues", "weight": 0.20, "value": "3 high-priority items" },
    { "factor": "competitor_mention", "weight": 0.20, "value": "mentioned switching" }
  ]
  */

  -- Recommended actions
  recommended_actions JSONB DEFAULT '[]'::jsonb,

  -- Tracking
  prediction_date TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Re-predict after this date

  -- Follow-up
  outreach_attempted BOOLEAN DEFAULT false,
  outreach_date TIMESTAMPTZ,
  outcome TEXT CHECK (outcome IN ('retained', 'churned', 'pending', NULL)),
  outcome_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_churn_predictions_project ON churn_predictions(project_id, churn_risk_score DESC);
CREATE INDEX idx_churn_predictions_risk ON churn_predictions(project_id, risk_category) WHERE outcome IS NULL;
CREATE INDEX idx_churn_predictions_customer ON churn_predictions(customer_email, project_id);
```

**Detection Logic**:
```typescript
// src/lib/ai/churn-detection.ts
export async function detectChurnRisk(projectId: string): Promise<ChurnPrediction[]> {
  // 1. Get all active customers with feedback
  const customers = await getCustomersWithActivity(projectId)

  const predictions: ChurnPrediction[] = []

  for (const customer of customers) {
    // 2. Calculate risk factors
    const factors = []

    // Factor 1: Sentiment trend (35% weight)
    const sentimentTrend = await calculateSentimentTrend(customer, 30)
    if (sentimentTrend.slope < -0.02) { // Declining
      factors.push({
        factor: 'negative_sentiment_trend',
        weight: 0.35,
        value: `${(sentimentTrend.slope * 100).toFixed(1)}% decline over 30 days`,
        score: Math.abs(sentimentTrend.slope) * 10
      })
    }

    // Factor 2: Engagement drop (25% weight)
    const engagementChange = await calculateEngagementChange(customer, 30)
    if (engagementChange < -0.4) { // 40% drop
      factors.push({
        factor: 'reduced_engagement',
        weight: 0.25,
        value: `${Math.abs(engagementChange * 100).toFixed(0)}% drop in feedback`,
        score: Math.abs(engagementChange)
      })
    }

    // Factor 3: Unresolved issues (20% weight)
    const unresolvedIssues = await getUnresolvedHighPriorityIssues(customer)
    if (unresolvedIssues.length > 0) {
      factors.push({
        factor: 'unresolved_issues',
        weight: 0.20,
        value: `${unresolvedIssues.length} high-priority items`,
        score: Math.min(unresolvedIssues.length / 5, 1)
      })
    }

    // Factor 4: Competitor mentions (20% weight)
    const competitorMentions = await checkCompetitorMentions(customer)
    if (competitorMentions.switching_intent) {
      factors.push({
        factor: 'competitor_mention',
        weight: 0.20,
        value: 'mentioned switching',
        score: 0.8
      })
    }

    // 3. Calculate overall risk score
    const riskScore = factors.reduce((sum, f) => sum + (f.weight * f.score), 0)

    // 4. Generate recommendations
    const recommendations = await generateRetentionRecommendations(customer, factors)

    if (riskScore > 0.3) { // Only save if significant risk
      predictions.push({
        customer_email: customer.email,
        customer_name: customer.name,
        churn_risk_score: riskScore,
        risk_category: getRiskCategory(riskScore),
        risk_factors: factors,
        recommended_actions: recommendations
      })
    }
  }

  // 5. Save to database
  await saveChurnPredictions(projectId, predictions)

  return predictions
}

function getRiskCategory(score: number): string {
  if (score >= 0.75) return 'critical'
  if (score >= 0.5) return 'high'
  if (score >= 0.3) return 'medium'
  return 'low'
}
```

**UI Component**: Churn Risk Dashboard Card
- Shows count of at-risk customers by category
- Click to see detailed risk factors
- One-click to initiate outreach workflow

---

#### 1.3 Feature Adoption Prediction
**What**: Predict which features will succeed/fail based on early signals
**Why**: Guide product decisions with data
**Impact**: Avoid investing in low-adoption features

**Database Schema**:
```sql
-- Table: feature_adoption_predictions
CREATE TABLE feature_adoption_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Feature details
  feature_name TEXT NOT NULL,
  feature_description TEXT,
  launch_date DATE,

  -- Predictions (made before/during launch)
  predicted_adoption_rate NUMERIC CHECK (predicted_adoption_rate BETWEEN 0 AND 1),
  predicted_sentiment NUMERIC CHECK (predicted_sentiment BETWEEN -1 AND 1),
  predicted_category TEXT CHECK (predicted_category IN ('hit', 'success', 'moderate', 'miss')),
  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),

  -- Prediction basis
  early_signals JSONB DEFAULT '{}'::jsonb,
  /*
  {
    "pre_launch_interest": 45,
    "beta_feedback_count": 12,
    "beta_avg_sentiment": 0.7,
    "similar_feature_performance": "moderate",
    "market_demand": "high"
  }
  */

  -- Actuals (filled in post-launch)
  actual_adoption_rate NUMERIC,
  actual_sentiment NUMERIC,
  actual_category TEXT,
  prediction_accuracy NUMERIC,

  -- Metadata
  prediction_date TIMESTAMPTZ DEFAULT NOW(),
  evaluation_date TIMESTAMPTZ, -- When we evaluate accuracy

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_predictions_project ON feature_adoption_predictions(project_id, launch_date DESC);
```

---

### 2. Anomaly Detection (Weeks 7-8) 🚨

**Goal**: Automatically detect unusual patterns and alert before escalation

#### 2.1 Real-Time Anomaly Monitoring

**Database Schema**:
```sql
-- Table: detected_anomalies
CREATE TABLE detected_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Anomaly classification
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN (
    'feedback_spike',
    'sentiment_drop',
    'theme_emergence',
    'engagement_drop',
    'velocity_change',
    'unusual_pattern'
  )),

  -- Severity
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Detection details
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  metric_name TEXT NOT NULL,
  current_value NUMERIC NOT NULL,
  expected_value NUMERIC NOT NULL,
  deviation_percentage NUMERIC NOT NULL,
  statistical_significance NUMERIC, -- p-value or z-score

  -- Context
  affected_entities JSONB DEFAULT '[]'::jsonb, -- Post IDs, theme names, etc.
  timeframe TEXT, -- "last 24 hours", "this week", etc.
  comparison_baseline TEXT, -- "last 7 days average", "historical norm", etc.

  -- AI analysis
  ai_explanation TEXT,
  potential_causes JSONB DEFAULT '[]'::jsonb,
  recommended_actions JSONB DEFAULT '[]'::jsonb,

  -- Alert management
  alerted BOOLEAN DEFAULT false,
  alert_sent_at TIMESTAMPTZ,
  alert_channels JSONB DEFAULT '[]'::jsonb, -- ["slack", "email"]

  -- Resolution
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anomalies_project ON detected_anomalies(project_id, detected_at DESC);
CREATE INDEX idx_anomalies_status ON detected_anomalies(project_id, status) WHERE status = 'open';
CREATE INDEX idx_anomalies_severity ON detected_anomalies(project_id, severity, detected_at DESC);
```

**Detection Function**:
```typescript
// src/lib/ai/anomaly-detector.ts
export async function detectAnomalies(projectId: string): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = []

  // 1. Feedback Volume Spike
  const volumeAnomaly = await detectFeedbackSpike(projectId)
  if (volumeAnomaly) anomalies.push(volumeAnomaly)

  // 2. Sentiment Drop
  const sentimentAnomaly = await detectSentimentDrop(projectId)
  if (sentimentAnomaly) anomalies.push(sentimentAnomaly)

  // 3. Emerging Theme
  const themeAnomaly = await detectEmergingTheme(projectId)
  if (themeAnomaly) anomalies.push(themeAnomaly)

  // 4. Engagement Drop
  const engagementAnomaly = await detectEngagementDrop(projectId)
  if (engagementAnomaly) anomalies.push(engagementAnomaly)

  // Save to database
  await saveAnomalies(projectId, anomalies)

  // Send alerts for critical/high severity
  for (const anomaly of anomalies) {
    if (['critical', 'high'].includes(anomaly.severity)) {
      await sendAnomalyAlert(projectId, anomaly)
    }
  }

  return anomalies
}

async function detectFeedbackSpike(projectId: string): Promise<Anomaly | null> {
  // Get last 24 hours
  const last24h = await getFeedbackCount(projectId, 24)

  // Get baseline (last 7 days average)
  const baseline = await getAverageDailyFeedback(projectId, 7)

  const deviation = ((last24h - baseline) / baseline) * 100

  // Trigger if >200% of normal
  if (deviation > 200) {
    return {
      anomaly_type: 'feedback_spike',
      severity: deviation > 400 ? 'critical' : 'high',
      metric_name: 'feedback_volume',
      current_value: last24h,
      expected_value: baseline,
      deviation_percentage: deviation,
      ai_explanation: `Feedback volume is ${deviation.toFixed(0)}% higher than normal. This spike may indicate a new issue or strong reaction to a recent change.`,
      recommended_actions: [
        'Review recent feedback for common themes',
        'Check for recent product changes or incidents',
        'Monitor sentiment to assess if spike is positive or negative'
      ]
    }
  }

  return null
}
```

**UI Component**: Anomaly Alert Dashboard
- Real-time anomaly feed
- Severity-based filtering
- One-click to investigate
- Resolution tracking

---

### 3. Insight Synthesizer Agent (Week 8) 🧠

**Goal**: Weekly intelligence reports with strategic recommendations

**Database Schema**:
```sql
-- Table: weekly_insights
CREATE TABLE weekly_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Report metadata
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- Insights
  content JSONB NOT NULL,
  /*
  {
    "executive_summary": "This week showed...",
    "key_trends": [
      {
        "trend": "Mobile performance complaints increasing",
        "magnitude": "high",
        "recommendation": "Prioritize mobile optimization"
      }
    ],
    "strategic_opportunities": [...],
    "risk_alerts": [...],
    "competitive_intel": [...],
    "product_recommendations": [...]
  }
  */

  -- Distribution
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  sent_to JSONB DEFAULT '[]'::jsonb, -- Email addresses

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_weekly_report UNIQUE (project_id, week_start_date)
);

CREATE INDEX idx_weekly_insights_project ON weekly_insights(project_id, week_start_date DESC);
```

**Agent Implementation**:
```typescript
// src/lib/agents/insight-synthesizer-agent.ts
export async function generateWeeklyInsights(projectId: string): Promise<WeeklyInsights> {
  // 1. Gather all data from the week
  const weekData = await gatherWeeklyData(projectId)

  // 2. Use Claude to synthesize insights
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You are a strategic product intelligence analyst. Analyze the past week's data and create an executive intelligence report.

Data Summary:
- Feedback: ${weekData.feedbackCount} items
- Average Sentiment: ${weekData.avgSentiment}
- Top Themes: ${weekData.topThemes.join(', ')}
- Anomalies Detected: ${weekData.anomalies.length}
- Churn Risks: ${weekData.churnRisks} customers
- Sentiment Forecast: ${weekData.sentimentTrend}

Detailed Data:
${JSON.stringify(weekData, null, 2)}

Create a strategic intelligence report with:
1. Executive Summary (2-3 sentences)
2. Key Trends (3-5 trends with magnitude and recommendations)
3. Strategic Opportunities (revenue/growth potential)
4. Risk Alerts (churn, sentiment, competitive)
5. Competitive Intelligence (if relevant)
6. Product Recommendations (prioritized action items)

Format as JSON with clear, actionable insights.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response')

  const insights = JSON.parse(content.text)

  // 3. Save to database
  await saveWeeklyInsights(projectId, insights)

  // 4. Send to stakeholders
  await distributeInsights(projectId, insights)

  return insights
}
```

**UI Component**: Weekly Insights Report Viewer
- Professional report layout
- Exportable to PDF
- Email distribution list management
- Historical report archive

---

## Implementation Order

### Week 5: Sentiment Forecasting
1. Create sentiment_forecasts table
2. Build forecasting algorithm
3. Create API endpoints
4. Build forecast visualization
5. Test with historical data

### Week 6: Churn Risk Prediction
1. Create churn_predictions table
2. Implement risk scoring logic
3. Build churn risk dashboard
4. Create alert workflow
5. Test retention recommendations

### Week 7: Anomaly Detection
1. Create detected_anomalies table
2. Implement detection algorithms
3. Build alerting system
4. Create anomaly dashboard
5. Test with synthetic anomalies

### Week 8: Insight Synthesizer
1. Create weekly_insights table
2. Build insight generation agent
3. Create report viewer UI
4. Implement email distribution
5. Schedule weekly cron job

---

## Success Metrics

**Predictive Analytics**:
- Forecast accuracy >70% for 7-day sentiment predictions
- Churn predictions identify 60%+ of actual churns
- Feature adoption predictions >65% accurate

**Anomaly Detection**:
- <5 minute detection latency
- <10% false positive rate
- >90% of critical issues detected

**Insight Synthesizer**:
- >80% of stakeholders find reports actionable
- 50% reduction in ad-hoc reporting requests
- PMs save 3+ hours/week on status updates

---

## Dependencies

**Required**:
- Phase 1 complete ✅
- Claude API with Sonnet 4 access
- PostgreSQL with pgvector
- Supabase Edge Functions for cron jobs

**Optional**:
- Slack integration for alerts
- Email service for report distribution
- Data visualization library (Recharts/D3.js)

---

## Risks & Mitigations

**Risk 1**: Prediction accuracy too low initially
**Mitigation**: Start with simple baselines, iterate based on accuracy metrics

**Risk 2**: Too many false positive alerts
**Mitigation**: Implement confidence thresholds, allow users to tune sensitivity

**Risk 3**: Weekly insights too generic
**Mitigation**: Include project-specific context, surface specific examples

---

Ready to start Phase 2 implementation?
