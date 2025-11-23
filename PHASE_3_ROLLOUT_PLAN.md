# Phase 3 Rollout Plan: Stakeholder Management & Experimentation Intelligence

**Date:** November 22, 2025
**Timeline:** Weeks 9-12 (3-4 weeks)
**Dependencies:** Phase 1 (Critical Gaps) ✅ and Phase 2 (Predictive & Proactive) ✅
**Status:** Ready to Begin

---

## Executive Summary

Phase 3 introduces two major capabilities that will:
1. **Reduce PM time on status updates by 80%** through automated stakeholder management
2. **Enable data-driven feature decisions** through experimentation intelligence

This phase transforms SignalsLoop from a reactive feedback tool into a proactive product intelligence platform that automatically manages stakeholder communications and validates product decisions through rigorous experimentation.

**Key Deliverables:**
- Automated stakeholder status reports (personalized by role)
- Self-service stakeholder portal with AI-powered Q&A
- Experiment design assistant with hypothesis generation
- Automated A/B test tracking and analysis
- Learning repository for institutional knowledge

---

## Table of Contents

1. [Phase 3 Overview](#phase-3-overview)
2. [Week 9-10: Stakeholder Management System](#week-9-10-stakeholder-management-system)
3. [Week 11-12: Experimentation Intelligence](#week-11-12-experimentation-intelligence)
4. [Technical Architecture](#technical-architecture)
5. [Implementation Checklist](#implementation-checklist)
6. [Success Metrics](#success-metrics)
7. [Risk Mitigation](#risk-mitigation)
8. [Post-Launch Optimization](#post-launch-optimization)

---

## Phase 3 Overview

### Strategic Goals

**Stakeholder Management (Weeks 9-10):**
- Eliminate manual status update creation (current: 5-8 hours/week per PM)
- Provide stakeholders with self-service access to product intelligence
- Proactively communicate relevant updates to the right people at the right time

**Experimentation Intelligence (Weeks 11-12):**
- Reduce experiment design time from 4 hours to 15 minutes
- Automatically track and analyze A/B tests
- Build institutional knowledge repository of learnings
- Enable data-driven prioritization decisions

### Current State vs. Target State

| Capability | Current State | Target State (Post Phase 3) |
|------------|--------------|----------------------------|
| Stakeholder Updates | Manual weekly emails (5-8 hrs/week) | Automated, personalized reports |
| Status Questions | PMs answer ad-hoc (10+ hrs/week) | Self-service AI portal |
| Experiment Design | Manual (4 hrs per experiment) | AI-assisted (15 mins) |
| A/B Test Tracking | Manual spreadsheets | Automated monitoring + alerts |
| Learning Capture | Scattered docs/Slack | Centralized knowledge base |

### Dependencies

**Prerequisites:**
- ✅ Phase 1 Complete (Triager Agent, Action Queue, Signal Correlation)
- ✅ Phase 2 Complete (Predictive Analytics, Anomaly Detection, Insight Synthesizer)
- ✅ Vector database operational (pgvector)
- ✅ Daily briefing system functional
- ✅ Roadmap intelligence active

**Required Integrations:**
- Email delivery service (existing)
- Feature flag platform (new: LaunchDarkly/Optimizely/Split.io)
- Authentication system (existing)

---

## Week 9-10: Stakeholder Management System

### Overview

Build an autonomous system that manages all stakeholder communications, replacing manual status updates with AI-generated, personalized reports and providing self-service access to product intelligence.

### 🎯 Week 9-10 Goals

1. **Auto-Generated Status Updates**: Personalized weekly reports for each stakeholder role
2. **Self-Service Portal**: AI-powered Q&A for stakeholders
3. **Proactive Notifications**: Alert stakeholders when relevant events occur

---

### Feature 1: Auto-Generated Status Updates

#### 1.1 Database Schema

**Migration:** `create_stakeholder_tables.sql`

```sql
-- Stakeholders table
CREATE TABLE stakeholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL, -- 'ceo', 'sales', 'engineering', 'marketing', 'customer_success'
  interests JSONB DEFAULT '[]'::jsonb, -- Array of topics: ['roadmap', 'competitive', 'metrics']
  notification_preferences JSONB DEFAULT '{
    "frequency": "weekly",
    "email_enabled": true,
    "slack_enabled": false,
    "include_sections": ["okrs", "roadmap", "competitive", "metrics", "feedback_themes"]
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stakeholder reports table (history)
CREATE TABLE stakeholder_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- 'weekly', 'monthly', 'ad_hoc'
  role TEXT NOT NULL,
  content JSONB NOT NULL, -- Structured report data
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0
);

-- Stakeholder interests tracking
CREATE TABLE stakeholder_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  interest_type TEXT NOT NULL, -- 'feature', 'competitor', 'customer', 'metric'
  interest_id UUID, -- ID of the feature/competitor/customer
  interest_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stakeholders_project ON stakeholders(project_id);
CREATE INDEX idx_stakeholder_reports_stakeholder ON stakeholder_reports(stakeholder_id);
CREATE INDEX idx_stakeholder_reports_generated ON stakeholder_reports(generated_at);
CREATE INDEX idx_stakeholder_interests_stakeholder ON stakeholder_interests(stakeholder_id);
```

#### 1.2 Report Generation Logic

**File:** `src/lib/stakeholders/report-generator.ts`

```typescript
import { openai } from '@/lib/openai';
import { supabase } from '@/lib/supabase';

export type StakeholderRole = 'ceo' | 'sales' | 'engineering' | 'marketing' | 'customer_success';

export interface ReportContext {
  // OKRs & Metrics
  okrs?: {
    current: Array<{ objective: string; progress: number; status: string }>;
    blockers: string[];
  };

  // Roadmap changes
  roadmap?: {
    new_items: Array<{ title: string; priority: string; rationale: string }>;
    completed: Array<{ title: string; impact: string }>;
    priority_changes: Array<{ title: string; old_priority: string; new_priority: string; reason: string }>;
  };

  // Feedback themes
  feedback?: {
    top_themes: Array<{ theme: string; count: number; sentiment: number; trend: string }>;
    enterprise_requests: Array<{ title: string; company: string; revenue_impact: number }>;
    urgent_issues: Array<{ title: string; severity: string; status: string }>;
  };

  // Competitive landscape
  competitive?: {
    new_threats: Array<{ competitor: string; move: string; impact: string }>;
    feature_gaps: Array<{ feature: string; gap_score: number }>;
    opportunities: Array<{ description: string; priority: string }>;
  };

  // Metrics
  metrics?: {
    sentiment_trend: { current: number; change: number; forecast: number };
    feedback_velocity: { current: number; change: number };
    feature_adoption: Array<{ feature: string; adoption_rate: number }>;
    churn_risk: { at_risk_count: number; high_value_accounts: string[] };
  };
}

export async function generateStakeholderReport(
  stakeholderId: string,
  role: StakeholderRole,
  projectId: string
): Promise<string> {

  // 1. Gather context based on role
  const context = await gatherReportContext(projectId, role);

  // 2. Generate role-specific report
  const report = await generateRoleBasedReport(role, context);

  // 3. Store report
  await supabase.from('stakeholder_reports').insert({
    stakeholder_id: stakeholderId,
    report_type: 'weekly',
    role,
    content: report
  });

  return report.html;
}

async function gatherReportContext(
  projectId: string,
  role: StakeholderRole
): Promise<ReportContext> {

  const context: ReportContext = {};

  // Get data from past week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // OKRs (if available)
  // TODO: Implement OKR tracking system

  // Roadmap changes
  const { data: roadmapChanges } = await supabase
    .from('roadmap_items')
    .select('*')
    .eq('project_id', projectId)
    .gte('updated_at', weekAgo.toISOString());

  context.roadmap = {
    new_items: roadmapChanges?.filter(i => i.created_at > weekAgo) || [],
    completed: roadmapChanges?.filter(i => i.status === 'completed') || [],
    priority_changes: [] // TODO: Track priority history
  };

  // Feedback themes
  const { data: themes } = await supabase
    .from('themes')
    .select('*')
    .eq('project_id', projectId)
    .order('frequency', { ascending: false })
    .limit(10);

  const { data: urgentFeedback } = await supabase
    .from('posts')
    .select('*, sentiment:sentiment_scores(*)')
    .eq('project_id', projectId)
    .lt('sentiment_scores.score', -0.7)
    .gte('created_at', weekAgo.toISOString());

  context.feedback = {
    top_themes: themes || [],
    enterprise_requests: [], // TODO: Filter by customer segment
    urgent_issues: urgentFeedback || []
  };

  // Competitive intelligence
  const { data: competitors } = await supabase
    .from('competitors')
    .select('*, mentions:competitive_mentions(*)')
    .eq('project_id', projectId)
    .gte('competitive_mentions.created_at', weekAgo.toISOString());

  context.competitive = {
    new_threats: competitors || [],
    feature_gaps: [], // TODO: Get from competitive analysis
    opportunities: [] // TODO: Get from opportunity detection
  };

  // Metrics (from dashboard)
  const { data: metrics } = await supabase
    .rpc('get_dashboard_metrics', { p_project_id: projectId });

  context.metrics = metrics;

  return context;
}

async function generateRoleBasedReport(
  role: StakeholderRole,
  context: ReportContext
): Promise<{ html: string; summary: string }> {

  const rolePrompts: Record<StakeholderRole, string> = {
    ceo: `Generate an executive summary focused on:
      - Strategic roadmap progress and rationale for changes
      - Competitive threats and opportunities
      - Key metrics: sentiment trends, churn risk, feature adoption
      - Revenue impact of product decisions
      - Critical blockers requiring executive attention
      Tone: Strategic, high-level, action-oriented. Max 500 words.`,

    sales: `Generate a sales-focused update on:
      - New features launched (with customer benefits)
      - Top customer requests and status
      - Competitive positioning updates (features to highlight)
      - Customer success stories from feedback
      - Upcoming launches (with GTM timeline)
      Tone: Customer-facing, benefit-driven, confidence-building. Max 400 words.`,

    engineering: `Generate an engineering-focused update on:
      - Roadmap priorities and technical dependencies
      - Feedback on technical debt / performance issues
      - Feature complexity estimates based on feedback
      - Urgent bugs and fixes deployed
      - Upcoming technical challenges
      Tone: Technical, specific, resource-aware. Max 400 words.`,

    marketing: `Generate a marketing-focused update on:
      - Feature launches ready for announcement
      - Customer feedback themes for positioning
      - Competitive differentiation points
      - Customer testimonials / success stories
      - Product narrative evolution
      Tone: Storytelling, positioning-focused, brand-aware. Max 400 words.`,

    customer_success: `Generate a customer success update on:
      - Customer feedback themes (pain points and wins)
      - At-risk accounts flagged by sentiment
      - Feature requests from high-value customers
      - Product improvements shipped this week
      - Resources needed to address customer concerns
      Tone: Empathetic, customer-centric, solution-oriented. Max 400 words.`
  };

  const prompt = `${rolePrompts[role]}

Context data:
${JSON.stringify(context, null, 2)}

Generate a well-structured HTML email report. Include:
1. Executive summary (3-5 bullet points)
2. Detailed sections based on role priorities
3. Action items (if any)
4. Key metrics visualization (describe charts/graphs needed)

Format as professional HTML email with good visual hierarchy.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an expert product intelligence analyst generating stakeholder reports.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });

  const html = response.choices[0].message.content || '';

  // Extract summary (first paragraph)
  const summary = html.match(/<p>(.*?)<\/p>/)?.[1] || '';

  return { html, summary };
}

export async function sendWeeklyReports(projectId: string): Promise<void> {
  // Get all stakeholders for project
  const { data: stakeholders } = await supabase
    .from('stakeholders')
    .select('*')
    .eq('project_id', projectId)
    .eq('notification_preferences->email_enabled', true);

  if (!stakeholders) return;

  // Generate and send reports
  for (const stakeholder of stakeholders) {
    const report = await generateStakeholderReport(
      stakeholder.id,
      stakeholder.role,
      projectId
    );

    // Send email
    await sendEmail({
      to: stakeholder.email,
      subject: `Weekly Product Intelligence Update - ${new Date().toLocaleDateString()}`,
      html: report,
      from: 'SignalsLoop <updates@signalsloop.com>'
    });

    // Update sent_at
    await supabase
      .from('stakeholder_reports')
      .update({ sent_at: new Date().toISOString() })
      .eq('stakeholder_id', stakeholder.id)
      .order('generated_at', { ascending: false })
      .limit(1);
  }
}
```

#### 1.3 Stakeholder Management UI

**File:** `src/app/[slug]/settings/stakeholders/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

export default function StakeholderManagementPage() {
  const [stakeholders, setStakeholders] = useState([]);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Stakeholder Management</h1>
          <p className="text-muted-foreground">
            Automate status updates and reports for key stakeholders
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)}>
          + Add Stakeholder
        </Button>
      </div>

      {/* Stakeholder List */}
      <div className="space-y-4">
        {stakeholders.map(stakeholder => (
          <StakeholderCard key={stakeholder.id} stakeholder={stakeholder} />
        ))}
      </div>

      {/* Add Stakeholder Modal */}
      {isAdding && (
        <AddStakeholderModal onClose={() => setIsAdding(false)} />
      )}
    </div>
  );
}

function StakeholderCard({ stakeholder }) {
  return (
    <Card className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{stakeholder.name}</h3>
          <p className="text-sm text-muted-foreground">{stakeholder.email}</p>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              {stakeholder.role}
            </span>
            <span className="text-xs text-muted-foreground">
              {stakeholder.notification_preferences.frequency} reports
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">Preview Report</Button>
          <Button variant="ghost" size="sm">Edit</Button>
        </div>
      </div>

      {/* Report History */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-sm font-medium mb-2">Recent Reports</p>
        <div className="text-xs text-muted-foreground">
          Last sent: Nov 20, 2025 • Opened: Yes • Clicks: 5
        </div>
      </div>
    </Card>
  );
}
```

---

### Feature 2: Self-Service Stakeholder Portal

#### 2.1 Portal Architecture

**File:** `src/app/stakeholder-portal/[token]/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { AskInterface } from '@/components/ask/AskInterface';
import { MetricsDashboard } from '@/components/stakeholder/MetricsDashboard';

export default function StakeholderPortalPage({ params }: { params: { token: string } }) {
  const [stakeholder, setStakeholder] = useState(null);

  // Verify token and load stakeholder
  // Token-based auth (no login required)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold">Product Intelligence Portal</h1>
          <p className="text-sm text-muted-foreground">
            Welcome, {stakeholder?.name}
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Quick Metrics */}
        <MetricsDashboard />

        {/* Ask Questions */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Ask About Product Status</h2>
          <AskInterface
            stakeholderMode={true}
            suggestedQuestions={[
              "What's the status of the mobile app launch?",
              "When will dark mode be released?",
              "How are customers responding to the pricing change?",
              "What are the top feature requests this month?"
            ]}
          />
        </div>
      </main>
    </div>
  );
}
```

#### 2.2 Stakeholder-Specific Query Handler

**File:** `src/lib/ask/stakeholder-queries.ts`

```typescript
import { openai } from '@/lib/openai';
import { searchFeedbackSemantic } from '@/lib/ask/retrieval';
import { supabase } from '@/lib/supabase';

export async function handleStakeholderQuery(
  query: string,
  projectId: string,
  stakeholderRole: string
): Promise<string> {

  // Classify query type
  const queryType = await classifyStakeholderQuery(query);

  switch (queryType) {
    case 'roadmap_status':
      return await handleRoadmapStatusQuery(query, projectId);

    case 'launch_timeline':
      return await handleLaunchTimelineQuery(query, projectId);

    case 'customer_feedback':
      return await handleCustomerFeedbackQuery(query, projectId);

    case 'metrics':
      return await handleMetricsQuery(query, projectId);

    default:
      return await handleGeneralQuery(query, projectId);
  }
}

async function handleRoadmapStatusQuery(query: string, projectId: string): Promise<string> {
  // Extract feature name from query
  const { data: roadmapItems } = await supabase
    .from('roadmap_items')
    .select('*')
    .eq('project_id', projectId)
    .textSearch('title', query);

  if (!roadmapItems || roadmapItems.length === 0) {
    return "I couldn't find any roadmap items matching that query. Could you rephrase or check the feature name?";
  }

  const item = roadmapItems[0];

  // Get linked feedback
  const { data: feedback } = await supabase
    .from('posts')
    .select('id')
    .eq('project_id', projectId)
    .contains('tags', [item.title]);

  const response = `
**${item.title}**

**Status:** ${item.status}
**Priority:** ${item.priority}
**Timeline:** ${item.timeline || 'Not set'}

**Progress:**
${item.description}

**Customer Interest:** ${feedback?.length || 0} feedback items linked

**Last Updated:** ${new Date(item.updated_at).toLocaleDateString()}
  `.trim();

  return response;
}

// Similar handlers for other query types...
```

---

### Feature 3: Proactive Stakeholder Notifications

#### 3.1 Interest Tracking

**File:** `src/lib/stakeholders/interest-tracking.ts`

```typescript
export async function trackStakeholderInterest(
  stakeholderId: string,
  interestType: 'feature' | 'competitor' | 'customer' | 'metric',
  interestId: string,
  interestName: string
): Promise<void> {

  await supabase.from('stakeholder_interests').insert({
    stakeholder_id: stakeholderId,
    interest_type: interestType,
    interest_id: interestId,
    interest_name: interestName
  });
}

export async function checkAndNotifyStakeholders(
  projectId: string,
  eventType: string,
  eventData: any
): Promise<void> {

  // Find stakeholders interested in this event
  const interestedStakeholders = await findInterestedStakeholders(
    projectId,
    eventType,
    eventData
  );

  for (const stakeholder of interestedStakeholders) {
    await sendProactiveNotification(stakeholder, eventType, eventData);
  }
}
```

#### 3.2 Enhanced Notification Agent

**File:** `src/lib/agents/notification-agent.ts` (update)

```typescript
// Add stakeholder notification logic to existing notification agent

export async function handleEvent(event: Event): Promise<void> {
  // Existing notification logic...

  // NEW: Check for stakeholder notifications
  await checkStakeholderNotifications(event);
}

async function checkStakeholderNotifications(event: Event): Promise<void> {
  const notificationRules = {
    'roadmap_item.status_changed': async (event) => {
      // Notify Sales VP when feature moves to "In Progress"
      if (event.payload.new_status === 'in_progress') {
        await notifyStakeholdersByInterest('feature', event.payload.item_id);
      }
    },

    'spec.auto_drafted': async (event) => {
      // Notify Engineering lead when spec is ready
      await notifyStakeholdersByRole('engineering', {
        title: 'New Spec Ready for Review',
        message: `Spec "${event.payload.title}" has been auto-generated`,
        link: `/specs/${event.payload.spec_id}`
      });
    },

    'competitor.mentioned': async (event) => {
      // Notify CEO on competitive threats
      await notifyStakeholdersByRole('ceo', {
        title: 'Competitive Intelligence Alert',
        message: `${event.payload.competitor_name} mentioned in customer feedback`,
        link: `/competitive/${event.payload.competitor_id}`
      });
    }
  };

  const handler = notificationRules[event.type];
  if (handler) {
    await handler(event);
  }
}
```

---

### Week 9-10 Implementation Tasks

#### Database & Schema (Day 1)
- [ ] Create stakeholder tables migration
- [ ] Create stakeholder_reports table
- [ ] Create stakeholder_interests table
- [ ] Add indexes for performance
- [ ] Test migrations on staging

#### Report Generation (Days 2-3)
- [ ] Build report-generator.ts
- [ ] Implement role-based report templates (CEO, Sales, Engineering, Marketing, CS)
- [ ] Create context gathering functions
- [ ] Build HTML email templates
- [ ] Test report generation with sample data

#### UI & Management (Days 4-5)
- [ ] Create stakeholder management page
- [ ] Build stakeholder CRUD operations
- [ ] Add report preview functionality
- [ ] Create report history view
- [ ] Add notification preferences UI

#### Self-Service Portal (Days 6-7)
- [ ] Build stakeholder portal pages
- [ ] Implement token-based authentication
- [ ] Create stakeholder query handler
- [ ] Add metrics dashboard for stakeholders
- [ ] Test portal access and queries

#### Proactive Notifications (Days 8-9)
- [ ] Implement interest tracking
- [ ] Update notification agent with stakeholder logic
- [ ] Create notification templates
- [ ] Add email/Slack delivery
- [ ] Test notification triggers

#### Cron & Automation (Day 10)
- [ ] Create weekly report cron job
- [ ] Add report scheduling logic
- [ ] Implement send-stakeholder-reports.ts script
- [ ] Test automated delivery
- [ ] Setup monitoring and alerts

---

## Week 11-12: Experimentation Intelligence

### Overview

Build a comprehensive experimentation system that helps PMs design, track, and learn from product experiments with AI assistance.

### 🎯 Week 11-12 Goals

1. **Experiment Design Assistant**: AI-powered hypothesis and test plan generation
2. **Automated Tracking**: Real-time A/B test monitoring with statistical analysis
3. **Learning Repository**: Searchable knowledge base of past experiments

---

### Feature 1: Experiment Design Assistant

#### 1.1 Database Schema

**Migration:** `create_experiments_tables.sql`

```sql
-- Experiments table
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Hypothesis
  hypothesis TEXT NOT NULL,
  expected_outcome TEXT,

  -- Design
  experiment_type TEXT NOT NULL, -- 'ab_test', 'multivariate', 'feature_flag'
  control_description TEXT,
  treatment_description TEXT,
  variants JSONB, -- For multivariate tests

  -- Metrics
  primary_metric TEXT NOT NULL,
  secondary_metrics JSONB DEFAULT '[]'::jsonb,
  success_criteria TEXT,
  sample_size_target INTEGER,
  minimum_detectable_effect DECIMAL,
  statistical_power DECIMAL DEFAULT 0.8,

  -- Execution
  status TEXT DEFAULT 'draft', -- 'draft', 'running', 'completed', 'cancelled'
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,

  -- Integration
  feature_flag_key TEXT, -- Reference to LaunchDarkly/Optimizely
  related_roadmap_item_id UUID REFERENCES roadmap_items(id),

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experiment results table
CREATE TABLE experiment_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,

  -- Metrics
  metric_name TEXT NOT NULL,
  variant TEXT NOT NULL, -- 'control', 'treatment', or variant name

  -- Results
  sample_size INTEGER NOT NULL,
  mean_value DECIMAL,
  std_dev DECIMAL,
  conversion_rate DECIMAL,

  -- Statistical analysis
  p_value DECIMAL,
  confidence_interval JSONB, -- { lower: X, upper: Y }
  statistical_significance BOOLEAN,

  -- Timestamps
  measured_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(experiment_id, metric_name, variant)
);

-- Experiment learnings table
CREATE TABLE experiment_learnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,

  -- Learning content
  learning_type TEXT NOT NULL, -- 'insight', 'recommendation', 'mistake', 'success'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,

  -- Impact
  impact_score INTEGER, -- 1-10
  applicable_to JSONB DEFAULT '[]'::jsonb, -- ['pricing', 'onboarding', 'features']

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experiment embeddings (for semantic search)
CREATE TABLE experiment_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_experiments_project ON experiments(project_id);
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiment_results_experiment ON experiment_results(experiment_id);
CREATE INDEX idx_experiment_learnings_experiment ON experiment_learnings(experiment_id);
CREATE INDEX idx_experiment_embeddings_experiment ON experiment_embeddings(experiment_id);

-- Vector index for semantic search
CREATE INDEX ON experiment_embeddings USING hnsw (embedding vector_cosine_ops);
```

#### 1.2 Experiment Design Generator

**File:** `src/lib/experiments/design-assistant.ts`

```typescript
import { openai } from '@/lib/openai';
import { generateEmbedding } from '@/lib/openai';

interface ExperimentDesign {
  hypothesis: string;
  expectedOutcome: string;
  primaryMetric: string;
  secondaryMetrics: string[];
  successCriteria: string;
  controlDescription: string;
  treatmentDescription: string;
  sampleSizeTarget: number;
  minimumDetectableEffect: number;
  estimatedDuration: string;
  risks: string[];
  implementation: string;
}

export async function generateExperimentDesign(
  featureIdea: string,
  projectId: string
): Promise<ExperimentDesign> {

  // 1. Get relevant context
  const context = await getExperimentContext(featureIdea, projectId);

  // 2. Generate design with GPT-4
  const prompt = `You are an expert product experimentation specialist. Design a rigorous A/B test for this feature idea:

Feature Idea: ${featureIdea}

Context:
- Past experiments: ${context.pastExperiments}
- Related feedback: ${context.feedbackThemes}
- Similar features: ${context.similarFeatures}

Generate a comprehensive experiment design including:
1. Hypothesis (If/Then statement)
2. Expected outcome
3. Primary metric (single, measurable)
4. Secondary metrics (2-3 supporting metrics)
5. Success criteria (when to ship/kill)
6. Control description (current state)
7. Treatment description (what changes)
8. Sample size estimate (based on typical conversion rates)
9. Minimum detectable effect (%)
10. Estimated duration
11. Potential risks
12. Implementation notes

Format as JSON.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at designing product experiments with statistical rigor.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 2000
  });

  const design = JSON.parse(response.choices[0].message.content || '{}');

  // 3. Refine sample size calculation
  design.sampleSizeTarget = calculateSampleSize(
    design.minimumDetectableEffect,
    0.8, // power
    0.05 // alpha
  );

  return design;
}

async function getExperimentContext(featureIdea: string, projectId: string) {
  // Search past experiments
  const embedding = await generateEmbedding(featureIdea);

  const { data: pastExperiments } = await supabase
    .rpc('search_experiments_semantic', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 3,
      p_project_id: projectId
    });

  // Get related feedback
  const { data: feedback } = await supabase
    .rpc('search_feedback_semantic', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 5,
      p_project_id: projectId
    });

  return {
    pastExperiments: pastExperiments?.map(e => e.hypothesis).join('\n') || 'None',
    feedbackThemes: feedback?.map(f => f.title).join('\n') || 'None',
    similarFeatures: '' // TODO: Get from roadmap
  };
}

function calculateSampleSize(
  mde: number, // minimum detectable effect
  power: number = 0.8,
  alpha: number = 0.05
): number {
  // Simplified sample size calculation
  // For more accuracy, use statistical libraries

  const z_alpha = 1.96; // Z-score for 95% confidence
  const z_beta = 0.84;  // Z-score for 80% power

  const p1 = 0.1; // Assumed baseline conversion rate
  const p2 = p1 * (1 + mde / 100);

  const pooled_p = (p1 + p2) / 2;

  const n = Math.ceil(
    2 * Math.pow(z_alpha + z_beta, 2) * pooled_p * (1 - pooled_p) / Math.pow(p2 - p1, 2)
  );

  return n;
}
```

#### 1.3 Experiment Designer UI

**File:** `src/app/[slug]/experiments/new/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

export default function NewExperimentPage() {
  const [featureIdea, setFeatureIdea] = useState('');
  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const response = await fetch('/api/experiments/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featureIdea })
    });
    const data = await response.json();
    setDesign(data.design);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Design New Experiment</h1>

      {!design ? (
        <Card className="p-6">
          <label className="block mb-2 font-medium">
            Describe your feature idea or hypothesis:
          </label>
          <Textarea
            value={featureIdea}
            onChange={(e) => setFeatureIdea(e.target.value)}
            placeholder="e.g., Adding a dark mode toggle will increase user engagement by 15%"
            rows={4}
            className="mb-4"
          />
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : '✨ Generate Experiment Design'}
          </Button>
        </Card>
      ) : (
        <ExperimentDesignView design={design} onEdit={setDesign} />
      )}
    </div>
  );
}

function ExperimentDesignView({ design, onEdit }) {
  return (
    <div className="space-y-6">
      {/* Hypothesis */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-2">Hypothesis</h2>
        <p className="text-lg">{design.hypothesis}</p>
      </Card>

      {/* Metrics */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Metrics</h2>
        <div className="space-y-2">
          <div>
            <span className="font-medium">Primary:</span> {design.primaryMetric}
          </div>
          <div>
            <span className="font-medium">Secondary:</span>
            <ul className="list-disc list-inside">
              {design.secondaryMetrics.map(m => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Design */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Control</h3>
          <p>{design.controlDescription}</p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Treatment</h3>
          <p>{design.treatmentDescription}</p>
        </Card>
      </div>

      {/* Sample Size & Duration */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Experiment Parameters</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Sample Size</p>
            <p className="text-2xl font-bold">{design.sampleSizeTarget.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Min Detectable Effect</p>
            <p className="text-2xl font-bold">{design.minimumDetectableEffect}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="text-2xl font-bold">{design.estimatedDuration}</p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button>Save Experiment</Button>
        <Button variant="outline">Export to Notion</Button>
        <Button variant="outline">Create Feature Flag</Button>
      </div>
    </div>
  );
}
```

---

### Feature 2: Automated Experiment Tracking

#### 2.1 Feature Flag Integration

**File:** `src/lib/integrations/feature-flags/launchdarkly.ts`

```typescript
import * as LaunchDarkly from '@launchdarkly/node-server-sdk';

const ldClient = LaunchDarkly.init(process.env.LAUNCHDARKLY_SDK_KEY!);

export async function createFeatureFlag(
  experimentId: string,
  experimentName: string
): Promise<string> {

  const flagKey = `exp_${experimentId}`;

  // Create flag via LaunchDarkly API
  const response = await fetch(`https://app.launchdarkly.com/api/v2/flags/${process.env.LAUNCHDARKLY_PROJECT_KEY}`, {
    method: 'POST',
    headers: {
      'Authorization': process.env.LAUNCHDARKLY_API_KEY!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: experimentName,
      key: flagKey,
      variations: [
        { value: 'control' },
        { value: 'treatment' }
      ],
      defaults: {
        onVariation: 0,
        offVariation: 0
      }
    })
  });

  return flagKey;
}

export async function getExperimentMetrics(flagKey: string): Promise<any> {
  // Fetch metrics from LaunchDarkly Experimentation
  const response = await fetch(`https://app.launchdarkly.com/api/v2/metrics/project/${process.env.LAUNCHDARKLY_PROJECT_KEY}/environment/${process.env.LAUNCHDARKLY_ENV_KEY}/flag/${flagKey}`, {
    headers: {
      'Authorization': process.env.LAUNCHDARKLY_API_KEY!
    }
  });

  return await response.json();
}
```

#### 2.2 Statistical Analysis Engine

**File:** `src/lib/experiments/statistical-analysis.ts`

```typescript
// Statistical analysis functions

export function calculateTTest(
  control: { mean: number; stdDev: number; n: number },
  treatment: { mean: number; stdDev: number; n: number }
): { tStatistic: number; pValue: number; significant: boolean } {

  // Welch's t-test (unequal variances)
  const pooledStdErr = Math.sqrt(
    (Math.pow(control.stdDev, 2) / control.n) +
    (Math.pow(treatment.stdDev, 2) / treatment.n)
  );

  const tStatistic = (treatment.mean - control.mean) / pooledStdErr;

  // Degrees of freedom (Welch-Satterthwaite equation)
  const df = Math.pow(
    Math.pow(control.stdDev, 2) / control.n +
    Math.pow(treatment.stdDev, 2) / treatment.n,
    2
  ) / (
    Math.pow(control.stdDev, 4) / (Math.pow(control.n, 2) * (control.n - 1)) +
    Math.pow(treatment.stdDev, 4) / (Math.pow(treatment.n, 2) * (treatment.n - 1))
  );

  // Calculate p-value (simplified - use stats library for accuracy)
  const pValue = calculatePValue(tStatistic, df);

  const significant = pValue < 0.05;

  return { tStatistic, pValue, significant };
}

export function calculateConfidenceInterval(
  mean: number,
  stdDev: number,
  n: number,
  confidence: number = 0.95
): { lower: number; upper: number } {

  const zScore = confidence === 0.95 ? 1.96 : 2.576; // 95% or 99%
  const margin = zScore * (stdDev / Math.sqrt(n));

  return {
    lower: mean - margin,
    upper: mean + margin
  };
}

export async function analyzeExperiment(experimentId: string): Promise<void> {
  // Fetch experiment results
  const { data: results } = await supabase
    .from('experiment_results')
    .select('*')
    .eq('experiment_id', experimentId);

  if (!results || results.length < 2) return;

  // Group by metric
  const metricGroups = results.reduce((acc, r) => {
    if (!acc[r.metric_name]) acc[r.metric_name] = {};
    acc[r.metric_name][r.variant] = r;
    return acc;
  }, {});

  // Analyze each metric
  for (const [metricName, variants] of Object.entries(metricGroups)) {
    const control = variants['control'];
    const treatment = variants['treatment'];

    if (!control || !treatment) continue;

    // Run t-test
    const stats = calculateTTest(
      {
        mean: control.mean_value,
        stdDev: control.std_dev,
        n: control.sample_size
      },
      {
        mean: treatment.mean_value,
        stdDev: treatment.std_dev,
        n: treatment.sample_size
      }
    );

    // Calculate confidence intervals
    const controlCI = calculateConfidenceInterval(
      control.mean_value,
      control.std_dev,
      control.sample_size
    );

    const treatmentCI = calculateConfidenceInterval(
      treatment.mean_value,
      treatment.std_dev,
      treatment.sample_size
    );

    // Update results
    await supabase
      .from('experiment_results')
      .update({
        p_value: stats.pValue,
        confidence_interval: controlCI,
        statistical_significance: stats.significant
      })
      .eq('experiment_id', experimentId)
      .eq('metric_name', metricName)
      .eq('variant', 'control');

    await supabase
      .from('experiment_results')
      .update({
        p_value: stats.pValue,
        confidence_interval: treatmentCI,
        statistical_significance: stats.significant
      })
      .eq('experiment_id', experimentId)
      .eq('metric_name', metricName)
      .eq('variant', 'treatment');
  }

  // Check if experiment reached significance
  await checkExperimentCompletion(experimentId);
}

async function checkExperimentCompletion(experimentId: string): Promise<void> {
  const { data: experiment } = await supabase
    .from('experiments')
    .select('*, results:experiment_results(*)')
    .eq('id', experimentId)
    .single();

  if (!experiment) return;

  // Check if primary metric reached significance
  const primaryResult = experiment.results.find(
    r => r.metric_name === experiment.primary_metric && r.variant === 'treatment'
  );

  if (primaryResult?.statistical_significance) {
    // Send alert
    await publishEvent({
      type: 'experiment.significant_result',
      aggregate_type: 'experiment',
      aggregate_id: experimentId,
      payload: {
        experiment_name: experiment.name,
        metric: experiment.primary_metric,
        p_value: primaryResult.p_value,
        control_mean: experiment.results.find(r => r.variant === 'control')?.mean_value,
        treatment_mean: primaryResult.mean_value,
        improvement: ((primaryResult.mean_value - experiment.results.find(r => r.variant === 'control')?.mean_value) / experiment.results.find(r => r.variant === 'control')?.mean_value * 100).toFixed(2) + '%'
      }
    });
  }
}
```

---

### Feature 3: Learning Repository

#### 3.1 Learnings Extraction

**File:** `src/lib/experiments/knowledge-base.ts`

```typescript
export async function extractLearnings(experimentId: string): Promise<void> {
  // Get experiment details
  const { data: experiment } = await supabase
    .from('experiments')
    .select('*, results:experiment_results(*)')
    .eq('id', experimentId)
    .single();

  if (!experiment) return;

  // Use GPT-4 to extract learnings
  const prompt = `Analyze this completed experiment and extract key learnings:

Experiment: ${experiment.name}
Hypothesis: ${experiment.hypothesis}
Results: ${JSON.stringify(experiment.results, null, 2)}

Extract:
1. Top 3 insights (what we learned)
2. Recommendations (what to do next)
3. Mistakes to avoid (what didn't work)
4. Success factors (what worked well)
5. Applicable areas (where else can this apply?)

Format as JSON array of learnings.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at extracting product learnings from experiments.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7
  });

  const learnings = JSON.parse(response.choices[0].message.content || '{}');

  // Store learnings
  for (const learning of learnings.insights || []) {
    await supabase.from('experiment_learnings').insert({
      experiment_id: experimentId,
      learning_type: 'insight',
      title: learning.title,
      description: learning.description,
      impact_score: learning.impact_score,
      applicable_to: learning.applicable_areas
    });
  }

  // Generate embeddings for semantic search
  const content = `${experiment.name}\n${experiment.hypothesis}\n${experiment.description}\n${learnings.insights.map(l => l.description).join('\n')}`;
  const embedding = await generateEmbedding(content);

  await supabase.from('experiment_embeddings').insert({
    experiment_id: experimentId,
    content,
    embedding
  });
}

export async function searchExperimentKnowledge(
  query: string,
  projectId: string
): Promise<any[]> {

  const embedding = await generateEmbedding(query);

  const { data } = await supabase.rpc('search_experiments_semantic', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 5,
    p_project_id: projectId
  });

  return data || [];
}
```

---

### Week 11-12 Implementation Tasks

#### Database & Schema (Day 1)
- [ ] Create experiments tables migration
- [ ] Create experiment_results table
- [ ] Create experiment_learnings table
- [ ] Create experiment_embeddings table
- [ ] Add vector index
- [ ] Test migrations

#### Design Assistant (Days 2-4)
- [ ] Build design-assistant.ts
- [ ] Implement hypothesis generator
- [ ] Create metrics suggester
- [ ] Build sample size calculator
- [ ] Create experiment design UI
- [ ] Test design generation

#### Feature Flag Integration (Days 5-6)
- [ ] Setup LaunchDarkly/Optimizely account
- [ ] Build feature flag integration
- [ ] Create flag creation API
- [ ] Test flag management
- [ ] Document integration setup

#### Statistical Analysis (Days 7-8)
- [ ] Implement statistical analysis functions
- [ ] Build t-test calculator
- [ ] Create confidence interval calculator
- [ ] Add experiment monitoring
- [ ] Test statistical accuracy

#### Learning Repository (Days 9-10)
- [ ] Build knowledge-base.ts
- [ ] Implement learning extraction
- [ ] Create experiment search
- [ ] Build learnings UI
- [ ] Test semantic search

#### Cron & Monitoring (Day 11-12)
- [ ] Create experiment monitoring cron
- [ ] Add significance alerts
- [ ] Build experiment dashboard
- [ ] Add reporting
- [ ] Final testing and deployment

---

## Technical Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Phase 3 Architecture                      │
└─────────────────────────────────────────────────────────────┘

┌───────────────────┐         ┌───────────────────┐
│  Stakeholder Mgmt  │         │  Experimentation  │
│     System         │         │   Intelligence    │
└─────────┬──────────┘         └─────────┬─────────┘
          │                              │
          │                              │
     ┌────▼─────┐                   ┌────▼─────┐
     │ Report   │                   │ Design   │
     │Generator │                   │Assistant │
     └────┬─────┘                   └────┬─────┘
          │                              │
          │                              │
     ┌────▼─────────────────────────────▼─────┐
     │         OpenAI GPT-4 / Claude           │
     │  (Report Gen, Experiment Design, etc)   │
     └────┬─────────────────────────┬──────────┘
          │                         │
          │                         │
     ┌────▼─────┐              ┌────▼──────┐
     │Stakeholder│              │ Feature   │
     │  Portal   │              │   Flags   │
     │(Token Auth│              │(LD/Optim) │
     └────┬──────┘              └────┬──────┘
          │                          │
          │                          │
     ┌────▼──────────────────────────▼─────┐
     │        PostgreSQL + pgvector         │
     │   (Stakeholders, Experiments, etc)   │
     └──────────────────────────────────────┘
```

### Data Flow

**Stakeholder Reports:**
1. Cron triggers weekly report generation
2. Gather context from database (metrics, roadmap, feedback, competitive)
3. GPT-4 generates role-specific report
4. Store in stakeholder_reports table
5. Send via email/Slack
6. Track engagement (opens, clicks)

**Experimentation:**
1. PM inputs feature idea
2. AI generates experiment design (hypothesis, metrics, sample size)
3. Create feature flag in LaunchDarkly
4. Monitor experiment results in real-time
5. Run statistical analysis (t-test, confidence intervals)
6. Alert when significance reached
7. Extract learnings with AI
8. Store in knowledge base with embeddings

### Integration Points

**External Services:**
- **OpenAI GPT-4**: Report generation, experiment design, learning extraction
- **Email Service** (existing): Stakeholder report delivery
- **LaunchDarkly/Optimizely**: Feature flag management
- **Slack** (existing): Notifications

**Internal Systems:**
- **Vector Database**: Experiment knowledge search
- **Event System**: Stakeholder notifications
- **Ask SignalsLoop**: Stakeholder portal queries
- **Dashboard Metrics**: Report context

---

## Implementation Checklist

### Week 9: Stakeholder Management (Part 1)

#### Day 1-2: Database & Core Logic
- [ ] Create stakeholder tables migration
- [ ] Implement report-generator.ts
- [ ] Build role-based templates (CEO, Sales, Eng, Marketing, CS)
- [ ] Test report generation

#### Day 3-4: UI & Management
- [ ] Create stakeholder management page
- [ ] Build CRUD operations
- [ ] Add notification preferences UI
- [ ] Implement report preview

#### Day 5: Automation
- [ ] Create weekly report cron job
- [ ] Test automated delivery
- [ ] Setup monitoring

### Week 10: Stakeholder Management (Part 2)

#### Day 6-8: Self-Service Portal
- [ ] Build stakeholder portal pages
- [ ] Implement token authentication
- [ ] Create stakeholder query handler
- [ ] Add metrics dashboard

#### Day 9-10: Proactive Notifications
- [ ] Implement interest tracking
- [ ] Update notification agent
- [ ] Create notification templates
- [ ] Test notification triggers
- [ ] Full integration testing

### Week 11: Experimentation Intelligence (Part 1)

#### Day 1-2: Database & Design Assistant
- [ ] Create experiments tables
- [ ] Build design-assistant.ts
- [ ] Implement hypothesis generator
- [ ] Create sample size calculator
- [ ] Build experiment design UI

#### Day 3-4: Feature Flag Integration
- [ ] Setup LaunchDarkly/Optimizely
- [ ] Build integration layer
- [ ] Create flag creation API
- [ ] Test integration

#### Day 5: Statistical Analysis
- [ ] Implement t-test calculator
- [ ] Build confidence interval calculator
- [ ] Create analysis functions

### Week 12: Experimentation Intelligence (Part 2)

#### Day 6-8: Tracking & Monitoring
- [ ] Build experiment monitoring system
- [ ] Add significance detection
- [ ] Create alerts
- [ ] Build experiment dashboard

#### Day 9-10: Learning Repository
- [ ] Implement learning extraction
- [ ] Create semantic search
- [ ] Build learnings UI
- [ ] Test knowledge base

#### Day 11-12: Polish & Launch
- [ ] Full integration testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Team training
- [ ] Production deployment

---

## Success Metrics

### Stakeholder Management

**Efficiency Metrics:**
- **PM Time Saved**: Baseline 5-8 hrs/week → Target <1 hr/week (87% reduction)
- **Report Generation Time**: Baseline 2 hrs → Target <5 mins automated
- **Stakeholder Questions**: Baseline 10-15/week → Target <3/week (answered via portal)

**Quality Metrics:**
- **Report Personalization Score**: Target >80% (stakeholder-specific content)
- **Portal Usage**: Target 70% of stakeholders use self-service monthly
- **Stakeholder Satisfaction**: Survey score >8/10

**Engagement Metrics:**
- **Email Open Rate**: Target >60%
- **Report Click-Through Rate**: Target >40%
- **Portal Active Users**: Target 50% weekly active

### Experimentation Intelligence

**Efficiency Metrics:**
- **Experiment Design Time**: Baseline 4 hrs → Target 15 mins (93% reduction)
- **Design Quality**: AI-generated designs rated >7/10 by PMs
- **Knowledge Reuse**: 50% of experiments reference past learnings

**Adoption Metrics:**
- **Experiments Run**: Target 2-3x increase in experiment velocity
- **Experiment Completion Rate**: Target >80% (vs. baseline ~40%)
- **Learning Documentation**: 100% of experiments have extracted learnings

**Impact Metrics:**
- **Data-Driven Decisions**: Target >60% of features validated by experiments
- **Successful Experiments**: Target >40% show positive results
- **Time to Insight**: Baseline 2-4 weeks → Target 1-2 weeks

---

## Risk Mitigation

### Technical Risks

**Risk 1: Feature Flag Platform Integration Complexity**
- **Mitigation**: Start with LaunchDarkly (best docs), have fallback to custom solution
- **Contingency**: Build simple internal feature flag system if needed

**Risk 2: AI-Generated Reports Lack Quality**
- **Mitigation**: Manual review for first 2 weeks, tune prompts based on feedback
- **Contingency**: Hybrid approach - AI generates draft, PM approves before sending

**Risk 3: Statistical Analysis Accuracy**
- **Mitigation**: Use established libraries (scipy via Python microservice if needed)
- **Contingency**: Start with simple t-tests, expand later

**Risk 4: Stakeholder Portal Security**
- **Mitigation**: Token-based auth with expiration, rate limiting, audit logging
- **Contingency**: Add optional password protection for sensitive projects

### Product Risks

**Risk 5: Stakeholders Don't Trust AI Reports**
- **Mitigation**: Include "Reviewed by [PM Name]" stamp, show data sources
- **Contingency**: Keep manual reports as option, gradually transition

**Risk 6: Low Experiment Adoption**
- **Mitigation**: PM training sessions, champion users, showcase success stories
- **Contingency**: Focus on high-impact experiments first, build credibility

**Risk 7: Knowledge Base Not Used**
- **Mitigation**: Proactively surface relevant learnings in experiment design
- **Contingency**: Scheduled "learning review" sessions with team

### Timeline Risks

**Risk 8: Scope Creep**
- **Mitigation**: Strict MVP definition, defer nice-to-haves to Phase 4
- **Action**: Weekly scope review, ruthless prioritization

**Risk 9: Dependencies on External Services**
- **Mitigation**: Early integration testing, have backup options
- **Action**: Test LaunchDarkly integration Week 1, pivot if needed

---

## Post-Launch Optimization

### Week 13-14: Monitoring & Iteration

**Week 13: Data Collection**
- Monitor stakeholder report engagement
- Track experiment design usage
- Collect user feedback via surveys
- Identify pain points

**Week 14: Optimization**
- Tune AI prompts based on quality feedback
- Optimize report templates
- Improve experiment design suggestions
- Fix bugs and UX issues

### Phase 4 Enhancements (Future)

**Advanced Stakeholder Features:**
- Stakeholder interest auto-detection (analyze which reports they engage with)
- Custom report scheduling (daily/weekly/monthly options)
- Slack integration for stakeholder alerts
- Mobile app for stakeholder portal

**Advanced Experimentation:**
- Multi-armed bandit algorithms
- Bayesian A/B testing
- Experiment meta-analysis (what makes experiments successful?)
- Integration with analytics platforms (Mixpanel, Amplitude)

---

## Appendix

### A. API Endpoints

**Stakeholder Management:**
- `POST /api/stakeholders` - Create stakeholder
- `GET /api/stakeholders` - List stakeholders
- `PUT /api/stakeholders/:id` - Update stakeholder
- `DELETE /api/stakeholders/:id` - Delete stakeholder
- `POST /api/stakeholders/:id/reports/generate` - Generate report
- `GET /api/stakeholders/:id/reports` - Get report history
- `GET /api/stakeholder-portal/:token` - Access portal

**Experimentation:**
- `POST /api/experiments` - Create experiment
- `POST /api/experiments/design` - Generate design (AI)
- `GET /api/experiments/:id` - Get experiment
- `PUT /api/experiments/:id` - Update experiment
- `POST /api/experiments/:id/start` - Start experiment
- `POST /api/experiments/:id/stop` - Stop experiment
- `GET /api/experiments/:id/results` - Get results
- `POST /api/experiments/:id/analyze` - Run analysis
- `GET /api/experiments/:id/learnings` - Get learnings
- `POST /api/experiments/search` - Search knowledge base

### B. Database Functions

**Stakeholder Queries:**
```sql
-- Get stakeholder with report history
CREATE OR REPLACE FUNCTION get_stakeholder_with_reports(p_stakeholder_id UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'stakeholder', row_to_json(s.*),
    'reports', (
      SELECT json_agg(row_to_json(r.*))
      FROM stakeholder_reports r
      WHERE r.stakeholder_id = p_stakeholder_id
      ORDER BY r.generated_at DESC
      LIMIT 10
    )
  )
  FROM stakeholders s
  WHERE s.id = p_stakeholder_id;
$$ LANGUAGE SQL;
```

**Experiment Queries:**
```sql
-- Search experiments semantically
CREATE OR REPLACE FUNCTION search_experiments_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  p_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  experiment_id uuid,
  experiment_name text,
  hypothesis text,
  similarity float
) AS $$
  SELECT
    e.id,
    e.name,
    e.hypothesis,
    1 - (ee.embedding <=> query_embedding) as similarity
  FROM experiment_embeddings ee
  JOIN experiments e ON e.id = ee.experiment_id
  WHERE 1 - (ee.embedding <=> query_embedding) > match_threshold
    AND (p_project_id IS NULL OR e.project_id = p_project_id)
  ORDER BY similarity DESC
  LIMIT match_count;
$$ LANGUAGE SQL;
```

### C. Environment Variables

```bash
# Stakeholder Management
STAKEHOLDER_PORTAL_BASE_URL=https://stakeholder.signalsloop.com

# Experimentation
LAUNCHDARKLY_SDK_KEY=sdk-xxx
LAUNCHDARKLY_API_KEY=api-xxx
LAUNCHDARKLY_PROJECT_KEY=your-project
LAUNCHDARKLY_ENV_KEY=production

# OR Optimizely
OPTIMIZELY_SDK_KEY=xxx
OPTIMIZELY_API_KEY=xxx

# Email (existing)
RESEND_API_KEY=re_xxx
```

---

## Next Steps

### Immediate Actions (This Week)

1. **Review & Approve Plan**: Team review of rollout plan
2. **Resource Allocation**: Assign developers to Phase 3
3. **Environment Setup**:
   - Setup LaunchDarkly/Optimizely account
   - Create stakeholder portal subdomain
4. **Kickoff Meeting**: Align team on goals and timeline

### Week 9 Kickoff

1. **Day 1**: Database migrations for stakeholder system
2. **Day 2**: Start report generator development
3. **Week 9 Goal**: Automated stakeholder reports working

### Success Criteria

Phase 3 is considered successful when:
- ✅ 5+ stakeholders receiving automated weekly reports
- ✅ 80% reduction in PM time on status updates
- ✅ 3+ experiments designed with AI assistant
- ✅ 1+ experiment showing statistically significant results
- ✅ Learning repository has 5+ documented experiments

---

**Document Version:** 1.0
**Last Updated:** November 22, 2025
**Next Review:** Start of Week 9

---

Ready to transform SignalsLoop into a fully autonomous product intelligence platform! 🚀
