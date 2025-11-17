# Background Jobs for AI Roadmap Suggestions

## Overview

The AI Roadmap Suggestions feature requires background jobs to:
1. Automatically regenerate roadmap when new themes are detected
2. Generate AI reasoning asynchronously (rate-limited due to OpenAI API)
3. Weekly refresh to keep roadmap up-to-date
4. Notify via Slack when critical themes emerge

## Implementation Options

### Option 1: Inngest (Recommended)

If your project uses Inngest for background jobs:

```typescript
// lib/jobs/roadmap-jobs.ts
import { inngest } from './client';
import { generateRoadmapSuggestions, generateAllReasoning } from '@/lib/roadmap';

export const regenerateRoadmap = inngest.createFunction(
  { name: 'Regenerate Roadmap Suggestions' },
  { event: 'roadmap.regenerate' },
  async ({ event, step }) => {
    const projectId = event.data.project_id;

    await step.run('calculate-scores', async () => {
      return await generateRoadmapSuggestions(projectId);
    });

    await step.run('generate-reasoning', async () => {
      return await generateAllReasoning(projectId);
    });
  }
);

export const weeklyRoadmapRefresh = inngest.createFunction(
  { name: 'Weekly Roadmap Refresh' },
  { cron: '0 6 * * 1' }, // Monday 6 AM
  async ({ step }) => {
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('status', 'active');

    for (const project of projects || []) {
      await inngest.send({
        name: 'roadmap.regenerate',
        data: { project_id: project.id }
      });
    }
  }
);
```

### Option 2: Vercel Cron Jobs

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/roadmap-refresh",
    "schedule": "0 6 * * 1"
  }]
}
```

Create API endpoint:

```typescript
// src/app/api/cron/roadmap-refresh/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Regenerate roadmap for all active projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id');

  for (const project of projects || []) {
    await generateRoadmapSuggestions(project.id);
    await generateAllReasoning(project.id);
  }

  return Response.json({ success: true });
}
```

### Option 3: Event-Driven Triggers

Trigger roadmap regeneration when themes change significantly:

```typescript
// In your theme detection completion handler
if (newThemesDetected > 10) {
  // Trigger roadmap regeneration
  await fetch('/api/roadmap/generate', {
    method: 'POST',
    body: JSON.stringify({ projectId, generateReasoning: true })
  });
}
```

## Integration Points

### 1. Theme Detection Complete
When theme detection finishes, trigger roadmap update:

```typescript
// After theme clustering/detection
await inngest.send({
  name: 'roadmap.regenerate',
  data: { project_id: projectId }
});
```

### 2. Slack Notifications
Send Slack alert when critical themes emerge:

```typescript
const { data: critical } = await supabase
  .from('roadmap_suggestions')
  .select('*')
  .eq('project_id', projectId)
  .eq('priority_level', 'critical')
  .is('manual_priority_adjustment', null);

if (critical && critical.length > 0) {
  await sendSlackNotification({
    channel: project.slack_channel,
    message: `🚨 ${critical.length} new critical roadmap items detected!`
  });
}
```

### 3. Jira Integration
Auto-create Jira epics for high-priority themes:

```typescript
for (const suggestion of highPrioritySuggestions) {
  await createJiraIssue({
    projectKey: jiraConfig.project_key,
    summary: suggestion.themes.theme_name,
    description: suggestion.reasoning_text,
    priority: 'High'
  });
}
```

## Rate Limiting

AI reasoning generation is rate-limited to avoid OpenAI API limits:

```typescript
// In generateAllReasoning()
for (const suggestion of suggestions) {
  await generateAIReasoning(suggestion.id, input);

  // Rate limit: 1 request per second
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

## Monitoring

Track generation performance:

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as runs,
  AVG(generation_time_ms) as avg_time_ms,
  SUM(gpt4_tokens_used) as total_tokens,
  SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_runs
FROM roadmap_generation_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```
