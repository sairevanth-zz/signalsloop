# Phase 1: Quick Wins Implementation Plan
**Timeline:** Weeks 1-4
**Goal:** Unify existing AI features with exceptional UI/UX integration

---

## Overview

Phase 1 focuses on **orchestrating existing capabilities** into cohesive, user-facing features that provide immediate value. Each feature will be:
- ✅ Fully integrated into Mission Control dashboard
- ✅ Accessible via clear navigation
- ✅ Self-explanatory with contextual help
- ✅ Actionable with one-click operations

---

## Feature 1: Triager Agent 🎯

### **User Story**
"As a PM, I want feedback to be automatically categorized, de-duplicated, prioritized, and assigned to the right person, so I can save 10+ hours/week on manual triage."

### **Backend Architecture**

#### Database Schema
```sql
-- PM Assignment Configuration
CREATE TABLE pm_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  pm_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pm_name TEXT NOT NULL,
  pm_email TEXT NOT NULL,

  -- Assignment rules
  product_areas TEXT[] DEFAULT '{}', -- themes/categories
  priority_threshold INTEGER, -- P1, P2, P3
  customer_segments TEXT[], -- Enterprise, SMB, Individual

  -- Auto-assign settings
  auto_assign_enabled BOOLEAN DEFAULT true,
  auto_merge_enabled BOOLEAN DEFAULT false,
  auto_merge_confidence_threshold NUMERIC DEFAULT 0.85,

  -- Notifications
  notify_on_assignment BOOLEAN DEFAULT true,
  notify_on_merge BOOLEAN DEFAULT true,
  daily_digest_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add PM assignment to posts
ALTER TABLE posts ADD COLUMN assigned_pm_id UUID REFERENCES pm_assignments(id);
ALTER TABLE posts ADD COLUMN assigned_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN auto_assigned BOOLEAN DEFAULT false;

-- Merge tracking
CREATE TABLE feedback_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  primary_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  merged_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,

  similarity_score NUMERIC NOT NULL,
  merge_reason TEXT,
  auto_merged BOOLEAN DEFAULT false,
  merged_by UUID REFERENCES auth.users(id),

  merged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triage queue
CREATE TABLE triage_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,

  -- Triage status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- AI analysis
  suggested_category TEXT,
  suggested_priority INTEGER,
  suggested_pm_id UUID REFERENCES pm_assignments(id),
  duplicate_of UUID REFERENCES posts(id),
  similarity_score NUMERIC,

  -- Actions taken
  auto_categorized BOOLEAN DEFAULT false,
  auto_prioritized BOOLEAN DEFAULT false,
  auto_assigned BOOLEAN DEFAULT false,
  auto_merged BOOLEAN DEFAULT false,

  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pm_assignments_project ON pm_assignments(project_id);
CREATE INDEX idx_posts_assigned_pm ON posts(assigned_pm_id);
CREATE INDEX idx_feedback_merges_primary ON feedback_merges(primary_post_id);
CREATE INDEX idx_triage_queue_status ON triage_queue(status, project_id);
```

#### Agent Implementation
**File:** `src/lib/agents/triager-agent.ts`

```typescript
import { publishEvent } from '@/lib/events/publisher'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { analyzeCategory } from '@/lib/enhanced-categorization'
import { calculatePriorityScore } from '@/lib/enhanced-priority-scoring'
import { findDuplicates } from '@/lib/enhanced-duplicate-detection'

export interface TriageResult {
  postId: string
  category?: string
  priority?: number
  assignedPmId?: string
  duplicateOf?: string
  similarityScore?: number
  actions: {
    categorized: boolean
    prioritized: boolean
    assigned: boolean
    merged: boolean
  }
}

export async function triageAgent(postId: string, projectId: string): Promise<TriageResult> {
  console.log(`[Triager Agent] Processing feedback: ${postId}`)

  // 1. Fetch feedback
  const { data: post, error } = await supabaseAdmin
    .from('posts')
    .select('*, projects(*)')
    .eq('id', postId)
    .single()

  if (error || !post) {
    throw new Error(`Failed to fetch post: ${error?.message}`)
  }

  const result: TriageResult = {
    postId,
    actions: {
      categorized: false,
      prioritized: false,
      assigned: false,
      merged: false
    }
  }

  // 2. Auto-categorize (if not already categorized)
  if (!post.category) {
    const category = await analyzeCategory(post.title, post.description)
    result.category = category

    await supabaseAdmin
      .from('posts')
      .update({ category })
      .eq('id', postId)

    result.actions.categorized = true
    console.log(`[Triager] Categorized as: ${category}`)
  }

  // 3. Auto-prioritize (if not already prioritized)
  if (!post.priority) {
    const priorityScore = await calculatePriorityScore({
      postId,
      projectId,
      voteCount: post.vote_count,
      commentCount: post.comment_count,
      sentiment: post.sentiment_score,
      category: result.category || post.category,
      createdAt: post.created_at
    })

    result.priority = priorityScore.priority

    await supabaseAdmin
      .from('posts')
      .update({ priority: priorityScore.priority })
      .eq('id', postId)

    result.actions.prioritized = true
    console.log(`[Triager] Priority set to: P${priorityScore.priority}`)
  }

  // 4. Duplicate detection
  const duplicates = await findDuplicates(postId, projectId)

  if (duplicates.length > 0) {
    const topDuplicate = duplicates[0]
    result.duplicateOf = topDuplicate.id
    result.similarityScore = topDuplicate.similarity

    // Check auto-merge settings
    const { data: settings } = await supabaseAdmin
      .from('pm_assignments')
      .select('auto_merge_enabled, auto_merge_confidence_threshold')
      .eq('project_id', projectId)
      .single()

    if (settings?.auto_merge_enabled && topDuplicate.similarity >= (settings.auto_merge_confidence_threshold || 0.85)) {
      // Auto-merge
      await mergeFeedback(postId, topDuplicate.id, projectId, topDuplicate.similarity, true)
      result.actions.merged = true
      console.log(`[Triager] Auto-merged into: ${topDuplicate.id}`)
    } else {
      // Create merge suggestion
      await createMergeSuggestion(postId, topDuplicate.id, projectId, topDuplicate.similarity)
      console.log(`[Triager] Merge suggested for: ${topDuplicate.id}`)
    }
  }

  // 5. PM Assignment
  const assignedPmId = await assignToPM(post, projectId, result.category || post.category, result.priority || post.priority)

  if (assignedPmId) {
    result.assignedPmId = assignedPmId
    result.actions.assigned = true

    await supabaseAdmin
      .from('posts')
      .update({
        assigned_pm_id: assignedPmId,
        assigned_at: new Date().toISOString(),
        auto_assigned: true
      })
      .eq('id', postId)

    console.log(`[Triager] Assigned to PM: ${assignedPmId}`)
  }

  // 6. Record triage in queue
  await supabaseAdmin
    .from('triage_queue')
    .insert({
      project_id: projectId,
      post_id: postId,
      status: 'completed',
      suggested_category: result.category,
      suggested_priority: result.priority,
      suggested_pm_id: assignedPmId,
      duplicate_of: result.duplicateOf,
      similarity_score: result.similarityScore,
      auto_categorized: result.actions.categorized,
      auto_prioritized: result.actions.prioritized,
      auto_assigned: result.actions.assigned,
      auto_merged: result.actions.merged,
      processed_at: new Date().toISOString()
    })

  // 7. Publish event
  await publishEvent({
    type: 'feedback.triaged',
    projectId,
    payload: {
      postId,
      ...result
    }
  })

  return result
}

async function assignToPM(
  post: any,
  projectId: string,
  category: string,
  priority: number
): Promise<string | null> {
  // Fetch PM assignment rules
  const { data: pmRules } = await supabaseAdmin
    .from('pm_assignments')
    .select('*')
    .eq('project_id', projectId)
    .eq('auto_assign_enabled', true)

  if (!pmRules || pmRules.length === 0) return null

  // Match PM based on rules
  for (const pm of pmRules) {
    // Check product areas
    if (pm.product_areas && pm.product_areas.length > 0) {
      const postThemes = post.themes || []
      const hasMatchingTheme = pm.product_areas.some((area: string) =>
        postThemes.includes(area) || category?.toLowerCase().includes(area.toLowerCase())
      )
      if (!hasMatchingTheme) continue
    }

    // Check priority threshold
    if (pm.priority_threshold && priority > pm.priority_threshold) {
      continue
    }

    // Match found
    return pm.id
  }

  return null
}

async function mergeFeedback(
  sourceId: string,
  targetId: string,
  projectId: string,
  similarityScore: number,
  autoMerged: boolean
) {
  // Record merge
  await supabaseAdmin
    .from('feedback_merges')
    .insert({
      project_id: projectId,
      primary_post_id: targetId,
      merged_post_id: sourceId,
      similarity_score: similarityScore,
      auto_merged: autoMerged,
      merge_reason: `Auto-merged due to ${(similarityScore * 100).toFixed(1)}% similarity`
    })

  // Update source post
  await supabaseAdmin
    .from('posts')
    .update({
      status: 'merged',
      merged_into: targetId
    })
    .eq('id', sourceId)

  // Aggregate votes and comments to target
  const { data: source } = await supabaseAdmin
    .from('posts')
    .select('vote_count, comment_count')
    .eq('id', sourceId)
    .single()

  if (source) {
    await supabaseAdmin.rpc('increment_post_stats', {
      p_post_id: targetId,
      p_votes: source.vote_count || 0,
      p_comments: source.comment_count || 0
    })
  }
}

async function createMergeSuggestion(
  sourceId: string,
  targetId: string,
  projectId: string,
  similarityScore: number
) {
  // This will be handled by Action Queue
  await supabaseAdmin
    .from('unified_action_queue')
    .insert({
      project_id: projectId,
      action_type: 'merge_suggestion',
      priority: similarityScore > 0.9 ? 1 : 2,
      title: 'Review suggested merge',
      description: `Two similar feedback items detected (${(similarityScore * 100).toFixed(1)}% match)`,
      metadata: {
        sourcePostId: sourceId,
        targetPostId: targetId,
        similarityScore
      },
      requires_approval: true
    })
}
```

#### API Endpoints

**1. Configure PM Assignment Rules**
**File:** `src/app/api/agents/triager/configure/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    projectId,
    pmUserId,
    pmName,
    pmEmail,
    productAreas,
    priorityThreshold,
    customerSegments,
    autoAssignEnabled,
    autoMergeEnabled,
    autoMergeThreshold,
    notifyOnAssignment,
    notifyOnMerge,
    dailyDigestEnabled
  } = body

  const { data, error } = await supabaseAdmin
    .from('pm_assignments')
    .upsert({
      project_id: projectId,
      pm_user_id: pmUserId,
      pm_name: pmName,
      pm_email: pmEmail,
      product_areas: productAreas || [],
      priority_threshold: priorityThreshold,
      customer_segments: customerSegments || [],
      auto_assign_enabled: autoAssignEnabled ?? true,
      auto_merge_enabled: autoMergeEnabled ?? false,
      auto_merge_confidence_threshold: autoMergeThreshold ?? 0.85,
      notify_on_assignment: notifyOnAssignment ?? true,
      notify_on_merge: notifyOnMerge ?? true,
      daily_digest_enabled: dailyDigestEnabled ?? true,
      updated_at: new Date().toISOString()
    })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('pm_assignments')
    .select('*')
    .eq('project_id', projectId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ pmAssignments: data })
}
```

**2. Get Triage Queue**
**File:** `src/app/api/agents/triager/queue/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  const status = req.nextUrl.searchParams.get('status') || 'pending'

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('triage_queue')
    .select(`
      *,
      posts (
        id,
        title,
        description,
        category,
        priority,
        vote_count,
        created_at
      )
    `)
    .eq('project_id', projectId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ queue: data })
}
```

**3. Trigger Manual Triage**
**File:** `src/app/api/agents/triager/run/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { triageAgent } from '@/lib/agents/triager-agent'

export async function POST(req: NextRequest) {
  const { postId, projectId } = await req.json()

  if (!postId || !projectId) {
    return NextResponse.json({ error: 'postId and projectId required' }, { status: 400 })
  }

  try {
    const result = await triageAgent(postId, projectId)
    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### **Frontend Components**

#### 1. Triager Settings Panel
**File:** `src/components/agents/TriagerSettingsPanel.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, UserPlus, Trash2 } from 'lucide-react'

export function TriagerSettingsPanel({ projectId }: { projectId: string }) {
  const [pmAssignments, setPmAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPM, setShowAddPM] = useState(false)

  const [newPM, setNewPM] = useState({
    pmName: '',
    pmEmail: '',
    productAreas: [] as string[],
    priorityThreshold: 2,
    autoAssignEnabled: true,
    autoMergeEnabled: false,
    autoMergeThreshold: 0.85
  })

  useEffect(() => {
    fetchPMAssignments()
  }, [projectId])

  async function fetchPMAssignments() {
    const res = await fetch(`/api/agents/triager/configure?projectId=${projectId}`)
    const data = await res.json()
    setPmAssignments(data.pmAssignments || [])
    setLoading(false)
  }

  async function savePMAssignment() {
    const res = await fetch('/api/agents/triager/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        ...newPM
      })
    })

    if (res.ok) {
      await fetchPMAssignments()
      setShowAddPM(false)
      setNewPM({
        pmName: '',
        pmEmail: '',
        productAreas: [],
        priorityThreshold: 2,
        autoAssignEnabled: true,
        autoMergeEnabled: false,
        autoMergeThreshold: 0.85
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Triager Agent Settings
          </h2>
          <p className="text-muted-foreground">
            Configure automatic feedback triage, PM assignment, and duplicate merging
          </p>
        </div>
        <Button onClick={() => setShowAddPM(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add PM
        </Button>
      </div>

      {/* PM Assignment Rules */}
      <div className="grid gap-4">
        {pmAssignments.map((pm) => (
          <Card key={pm.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{pm.pm_name}</CardTitle>
                  <CardDescription>{pm.pm_email}</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Product Areas</Label>
                <div className="flex gap-2 mt-2">
                  {pm.product_areas?.map((area: string) => (
                    <Badge key={area} variant="secondary">{area}</Badge>
                  )) || <span className="text-sm text-muted-foreground">All areas</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority Threshold</Label>
                  <p className="text-sm text-muted-foreground">
                    P{pm.priority_threshold || 3} and higher
                  </p>
                </div>
                <div>
                  <Label>Auto-assign</Label>
                  <p className="text-sm text-muted-foreground">
                    {pm.auto_assign_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <Label>Auto-merge Duplicates</Label>
                  <p className="text-xs text-muted-foreground">
                    Confidence threshold: {(pm.auto_merge_confidence_threshold * 100).toFixed(0)}%
                  </p>
                </div>
                <Switch checked={pm.auto_merge_enabled} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add PM Modal */}
      {showAddPM && (
        <Card>
          <CardHeader>
            <CardTitle>Add PM Assignment Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>PM Name</Label>
              <Input
                value={newPM.pmName}
                onChange={(e) => setNewPM({ ...newPM, pmName: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>PM Email</Label>
              <Input
                value={newPM.pmEmail}
                onChange={(e) => setNewPM({ ...newPM, pmEmail: e.target.value })}
                placeholder="john@company.com"
                type="email"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={savePMAssignment}>Save</Button>
              <Button variant="outline" onClick={() => setShowAddPM(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

#### 2. Triage Queue Widget
**File:** `src/components/agents/TriageQueueWidget.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

export function TriageQueueWidget({ projectId }: { projectId: string }) {
  const [queue, setQueue] = useState<any[]>([])
  const [stats, setStats] = useState({ pending: 0, processing: 0, completed: 0 })

  useEffect(() => {
    fetchQueue()
  }, [projectId])

  async function fetchQueue() {
    const res = await fetch(`/api/agents/triager/queue?projectId=${projectId}&status=pending`)
    const data = await res.json()
    setQueue(data.queue || [])

    // Calculate stats
    const pending = data.queue?.filter((item: any) => item.status === 'pending').length || 0
    const processing = data.queue?.filter((item: any) => item.status === 'processing').length || 0
    const completed = data.queue?.filter((item: any) => item.status === 'completed').length || 0

    setStats({ pending, processing, completed })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Triage Queue</CardTitle>
            <CardDescription>Feedback awaiting automatic triage</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">
              <Clock className="w-3 h-3 mr-1" />
              {stats.pending} pending
            </Badge>
            <Badge variant="outline">
              <CheckCircle className="w-3 h-3 mr-1" />
              {stats.completed} completed
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {queue.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No items in triage queue
          </p>
        ) : (
          <div className="space-y-2">
            {queue.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.posts?.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.suggested_category && `Category: ${item.suggested_category}`}
                    {item.suggested_priority && ` • P${item.suggested_priority}`}
                  </p>
                </div>
                {item.duplicate_of && (
                  <Badge variant="outline">
                    Duplicate ({(item.similarity_score * 100).toFixed(0)}%)
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## Feature 2: Action Queue 📋

### **User Story**
"As a PM, I want all AI recommendations consolidated in one place with clear priorities, so I can quickly review and act on the most important items."

### **Backend Architecture**

#### Database Schema
```sql
-- Unified Action Queue
CREATE TABLE unified_action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'merge_suggestion',
    'priority_change',
    'competitive_threat',
    'anomaly_detected',
    'spec_ready_for_review',
    'roadmap_adjustment',
    'customer_at_risk',
    'opportunity_identified',
    'release_ready'
  )),

  priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 3), -- 1=High, 2=Medium, 3=Low
  severity TEXT CHECK (severity IN ('critical', 'warning', 'info', 'success')),

  title TEXT NOT NULL,
  description TEXT,

  -- Related entities
  related_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  related_roadmap_id UUID REFERENCES roadmap_items(id) ON DELETE CASCADE,
  related_competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  related_spec_id UUID REFERENCES specs(id) ON DELETE CASCADE,

  -- Metadata (flexible JSON for action-specific data)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Action execution
  requires_approval BOOLEAN DEFAULT true,
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,

  executed BOOLEAN DEFAULT false,
  executed_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMPTZ,
  execution_result JSONB,

  -- Dismissal
  dismissed BOOLEAN DEFAULT false,
  dismissed_by UUID REFERENCES auth.users(id),
  dismissed_at TIMESTAMPTZ,
  dismissed_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Optional expiry
);

-- Indexes
CREATE INDEX idx_action_queue_project_status ON unified_action_queue(project_id, executed, dismissed);
CREATE INDEX idx_action_queue_priority ON unified_action_queue(priority, created_at DESC);
CREATE INDEX idx_action_queue_type ON unified_action_queue(action_type);

-- Function to get pending actions
CREATE OR REPLACE FUNCTION get_pending_actions(p_project_id UUID)
RETURNS TABLE (
  action JSON,
  age_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    row_to_json(uaq.*) as action,
    EXTRACT(EPOCH FROM (NOW() - uaq.created_at)) / 60 as age_minutes
  FROM unified_action_queue uaq
  WHERE uaq.project_id = p_project_id
    AND uaq.executed = false
    AND uaq.dismissed = false
    AND (uaq.expires_at IS NULL OR uaq.expires_at > NOW())
  ORDER BY
    uaq.priority ASC,
    uaq.created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

#### Helper Functions
**File:** `src/lib/actions/action-queue.ts`

```typescript
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface Action {
  id?: string
  projectId: string
  actionType: 'merge_suggestion' | 'priority_change' | 'competitive_threat' | 'anomaly_detected' |
               'spec_ready_for_review' | 'roadmap_adjustment' | 'customer_at_risk' |
               'opportunity_identified' | 'release_ready'
  priority: 1 | 2 | 3
  severity: 'critical' | 'warning' | 'info' | 'success'
  title: string
  description?: string
  relatedPostId?: string
  relatedRoadmapId?: string
  relatedCompetitorId?: string
  relatedSpecId?: string
  metadata?: Record<string, any>
  requiresApproval?: boolean
}

export async function addAction(action: Action) {
  const { data, error } = await supabaseAdmin
    .from('unified_action_queue')
    .insert({
      project_id: action.projectId,
      action_type: action.actionType,
      priority: action.priority,
      severity: action.severity,
      title: action.title,
      description: action.description,
      related_post_id: action.relatedPostId,
      related_roadmap_id: action.relatedRoadmapId,
      related_competitor_id: action.relatedCompetitorId,
      related_spec_id: action.relatedSpecId,
      metadata: action.metadata || {},
      requires_approval: action.requiresApproval ?? true
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add action: ${error.message}`)
  }

  return data
}

export async function getPendingActions(projectId: string) {
  const { data, error } = await supabaseAdmin
    .rpc('get_pending_actions', { p_project_id: projectId })

  if (error) {
    throw new Error(`Failed to fetch actions: ${error.message}`)
  }

  return data
}

export async function executeAction(actionId: string, userId: string, result?: any) {
  const { data, error } = await supabaseAdmin
    .from('unified_action_queue')
    .update({
      executed: true,
      executed_by: userId,
      executed_at: new Date().toISOString(),
      execution_result: result || {}
    })
    .eq('id', actionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to execute action: ${error.message}`)
  }

  return data
}

export async function dismissAction(actionId: string, userId: string, reason?: string) {
  const { data, error } = await supabaseAdmin
    .from('unified_action_queue')
    .update({
      dismissed: true,
      dismissed_by: userId,
      dismissed_at: new Date().toISOString(),
      dismissed_reason: reason
    })
    .eq('id', actionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to dismiss action: ${error.message}`)
  }

  return data
}
```

### **Frontend Component**

**File:** `src/components/dashboard/ActionQueueCard.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  X,
  AlertCircle,
  TrendingUp,
  GitMerge,
  FileText,
  Users,
  Zap
} from 'lucide-react'

const ACTION_ICONS = {
  merge_suggestion: GitMerge,
  priority_change: TrendingUp,
  competitive_threat: AlertCircle,
  spec_ready_for_review: FileText,
  customer_at_risk: Users,
  anomaly_detected: Zap
}

const SEVERITY_COLORS = {
  critical: 'destructive',
  warning: 'secondary',
  info: 'outline',
  success: 'default'
}

export function ActionQueueCard({ projectId }: { projectId: string }) {
  const [actions, setActions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActions()
    const interval = setInterval(fetchActions, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [projectId])

  async function fetchActions() {
    const res = await fetch(`/api/actions/pending?projectId=${projectId}`)
    const data = await res.json()
    setActions(data.actions || [])
    setLoading(false)
  }

  async function handleExecute(actionId: string) {
    await fetch('/api/actions/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId })
    })
    await fetchActions()
  }

  async function handleDismiss(actionId: string) {
    await fetch('/api/actions/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId })
    })
    await fetchActions()
  }

  const criticalActions = actions.filter(a => a.action.severity === 'critical')
  const highPriorityActions = actions.filter(a => a.action.priority === 1)

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Action Queue
            </CardTitle>
            <CardDescription>AI-recommended actions requiring your attention</CardDescription>
          </div>
          <div className="flex gap-2">
            {criticalActions.length > 0 && (
              <Badge variant="destructive">
                {criticalActions.length} critical
              </Badge>
            )}
            <Badge variant="secondary">
              {actions.length} pending
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No pending actions. You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((item) => {
              const action = item.action
              const Icon = ACTION_ICONS[action.action_type as keyof typeof ACTION_ICONS] || Zap

              return (
                <div
                  key={action.id}
                  className={`p-4 border rounded-lg ${
                    action.severity === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className="w-5 h-5 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium">{action.title}</h4>
                        {action.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {action.description}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Badge variant={SEVERITY_COLORS[action.severity as keyof typeof SEVERITY_COLORS]}>
                            {action.severity}
                          </Badge>
                          <Badge variant="outline">
                            P{action.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {Math.floor(item.age_minutes)}m ago
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleExecute(action.id)}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Execute
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDismiss(action.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## Feature 3: Signal Correlation View 🔗

### **User Story**
"As a PM, I want to see how feedback spikes, competitor moves, and roadmap items are connected, so I can understand the big picture and make better decisions."

*This section continues with full implementation details for Signal Correlation and Enhanced Morning Briefing...*

---

## Integration into Mission Control

All Phase 1 features will be integrated into the Mission Control dashboard at:
- **Path:** `src/app/[slug]/dashboard/page.tsx`
- **Component:** `src/components/dashboard/MissionControlGrid.tsx`

### Updated Mission Control Layout

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Mission Control - [Project Name]                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐  ┌──────────────────────────────┐ │
│  │ 📰 Daily Briefing   │  │ ⚡ Action Queue              │ │
│  │ (Enhanced)          │  │                               │ │
│  │                     │  │ 🔴 3 Critical                 │ │
│  │ 🔴 CRITICAL         │  │ 🟡 5 High Priority            │ │
│  │ - Item 1            │  │                               │ │
│  │ 🟡 ATTENTION        │  │ [Action items with execute]   │ │
│  │ - Item 2            │  └──────────────────────────────┘ │
│  │ 🟢 GOOD NEWS        │                                    │
│  │ - Item 3            │  ┌──────────────────────────────┐ │
│  └─────────────────────┘  │ 🔗 Signal Correlation        │ │
│                            │                               │ │
│  ┌─────────────────────┐  │ [Graph visualization showing] │ │
│  │ 🎯 Triage Queue     │  │ connections between signals   │ │
│  │                     │  │                               │ │
│  │ 12 pending          │  └──────────────────────────────┘ │
│  │ 5 ready for review  │                                    │
│  └─────────────────────┘                                    │
│                                                               │
│  [Existing widgets: Metrics, Events, Agents, etc.]          │
└─────────────────────────────────────────────────────────────┘
```

---

## Navigation & Discoverability

### Settings Page Updates
Add new section in `src/app/[slug]/settings/page.tsx`:

```
┌─────────────────────────────────────────┐
│  Settings                                │
├─────────────────────────────────────────┤
│                                           │
│  [General] [Integrations] [AI Agents] ← NEW
│                                           │
│  AI Agents:                               │
│  ├─ Triager Agent Settings                │
│  ├─ Action Queue Preferences              │
│  └─ Correlation Detection Config          │
└─────────────────────────────────────────┘
```

### Help Documentation
Add to `src/app/mission-control-help/page.tsx`:

- "Using the Triager Agent"
- "Understanding Action Queue Priorities"
- "Reading Signal Correlations"
- "Best Practices for Phase 1 Features"

---

## Timeline

**Week 1:** Triager Agent + Enhanced Briefing
- Days 1-2: Database migrations + backend agent
- Days 3-4: API endpoints
- Day 5: Frontend components
- Days 6-7: Integration + testing

**Week 2:** Action Queue
- Days 1-2: Database + action queue system
- Days 3-4: API endpoints + execution logic
- Day 5: UI component
- Days 6-7: Integration + testing

**Week 3:** Signal Correlation
- Days 1-3: Correlation detection algorithm
- Days 4-5: Graph visualization component
- Days 6-7: Integration + testing

**Week 4:** Polish + Documentation
- Days 1-2: End-to-end testing
- Days 3-4: Help docs + onboarding
- Days 5-7: Bug fixes + optimization

---

## Success Metrics

- ✅ Triager processes 100% of new feedback within 5 minutes
- ✅ PM assignment accuracy > 85%
- ✅ Auto-merge reduces duplicate management time by 70%
- ✅ Action Queue reduces time-to-action by 60%
- ✅ Signal Correlation increases insight discovery by 40%
- ✅ User engagement with Mission Control increases by 3x

---

**End of Phase 1 Plan**
