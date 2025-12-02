/**
 * Unified Task Orchestrator
 *
 * This endpoint consolidates all scheduled tasks to work within Vercel's
 * free tier limitations (max 2 cron jobs, daily frequency minimum)
 *
 * Schedule in vercel.json:
 * - orchestrator?schedule=morning: "0 9 * * *" (9 AM daily)
 * - orchestrator?schedule=evening: "0 21 * * *" (9 PM daily)
 *
 * Both schedules run process-events first, then batch-specific tasks.
 * This ensures agents process events twice daily (9 AM and 9 PM).
 *
 * OR call manually with ?schedule=morning, ?schedule=evening, or ?schedule=weekly
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

interface TaskResult {
  taskId: string;
  success: boolean;
  duration: number;
  message?: string;
  error?: string;
}

/**
 * Execute a task by calling its API endpoint
 */
async function executeTask(
  taskPath: string,
  authHeader: string,
  timeout: number = 60000
): Promise<TaskResult> {
  const startTime = Date.now();
  const taskId = taskPath.split('/').pop() || 'unknown';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}${taskPath}`,
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;
    const result = await response.json();

    return {
      taskId,
      success: response.ok,
      duration,
      message: result.message || result.success ? 'Completed' : 'Failed',
      error: response.ok ? undefined : result.error,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      taskId,
      success: false,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Task schedule definitions
 * Both morning and evening batches run process-events first to ensure
 * agents react to events twice daily within Vercel free tier constraints
 */
const TASK_SCHEDULE = {
  morning: [
    // Run at 9 AM daily - Start with event processing, then intelligence tasks
    { path: '/api/cron/process-events', timeout: 60000 }, // 1 min - process agent events FIRST
    { path: '/api/cron/dynamic-roadmap', timeout: 180000 }, // 3 min - auto-adjust roadmap priorities
    { path: '/api/cron/proactive-spec-writer', timeout: 300000 }, // 5 min - auto-draft specs
    { path: '/api/cron/competitive-extraction', timeout: 180000 }, // 3 min - extract competitors
    { path: '/api/cron/detect-feature-gaps', timeout: 120000 }, // 2 min - feature gaps
    { path: '/api/cron/strategic-recommendations', timeout: 120000 }, // 2 min - strategic actions
    { path: '/api/cron/hunter-scan', timeout: 300000 }, // 5 min - scan external platforms
    { path: '/api/cron/calls-analyze', timeout: 180000 }, // 3 min - process call recordings
    { path: '/api/cron/daily-intelligence-digest', timeout: 120000 }, // 2 min - send email digest
    { path: '/api/cron/sync-experiments', timeout: 180000 }, // 3 min - sync experiment results
    { path: '/api/cron/sync-customers', timeout: 300000 }, // 5 min - sync customer data from CRM (Salesforce/HubSpot)
    { path: '/api/cron/send-stakeholder-reports', timeout: 120000 }, // 2 min - stakeholder reports (weekly on Mondays)
    { path: '/api/cron/outcome-metrics', timeout: 120000 }, // 2 min - update outcome attribution metrics
    { path: '/api/cron/outcome-classify', timeout: 300000 }, // 5 min - classify feature outcomes (T+30 days)
  ],
  evening: [
    // Run at 9 PM daily - Process events, then maintenance tasks
    { path: '/api/cron/process-events', timeout: 60000 }, // 1 min - process agent events FIRST
    { path: '/api/cron/daily-backup', timeout: 600000 }, // 10 min - database backup
  ],
  weekly: [
    // Run on Sunday mornings (9 AM) in addition to morning tasks
    { path: '/api/cron/scrape-external-reviews', timeout: 600000 }, // 10 min - G2/Capterra
    { path: '/api/cron/analyze-competitors', timeout: 300000 }, // 5 min - competitor analysis
    { path: '/api/cron/collect-feature-metrics', timeout: 180000 }, // 3 min - collect post-launch feature metrics
  ],
};

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine which tasks to run based on query params or time
    const { searchParams } = new URL(request.url);
    const scheduleParam = searchParams.get('schedule'); // 'morning', 'evening', or 'weekly'

    // Default: determine based on current time
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDay = now.getUTCDay(); // 0 = Sunday

    let tasksToRun: Array<{ path: string; timeout: number }> = [];
    let scheduleName = '';

    if (scheduleParam) {
      // Manual trigger via query param
      if (scheduleParam === 'morning') {
        tasksToRun = [...TASK_SCHEDULE.morning];
        scheduleName = 'Morning Batch (9 AM)';
      } else if (scheduleParam === 'evening') {
        tasksToRun = [...TASK_SCHEDULE.evening];
        scheduleName = 'Evening Batch (9 PM)';
      } else if (scheduleParam === 'weekly') {
        tasksToRun = [...TASK_SCHEDULE.morning, ...TASK_SCHEDULE.weekly];
        scheduleName = 'Morning + Weekly Batch (Sunday 9 AM)';
      }
    } else {
      // Auto-determine based on current time
      if (currentHour === 9) {
        // 9 AM UTC - Morning batch
        tasksToRun = [...TASK_SCHEDULE.morning];
        scheduleName = 'Morning Batch (9 AM)';

        // Add weekly tasks on Sundays
        if (currentDay === 0) {
          tasksToRun.push(...TASK_SCHEDULE.weekly);
          scheduleName = 'Morning + Weekly Batch (Sunday 9 AM)';
        }
      } else if (currentHour === 21) {
        // 9 PM UTC - Evening batch
        tasksToRun = [...TASK_SCHEDULE.evening];
        scheduleName = 'Evening Batch (9 PM)';
      } else {
        // Called at unexpected time - run nothing
        return NextResponse.json({
          success: true,
          message: `No tasks scheduled for hour ${currentHour}. Orchestrator runs at 9 AM and 9 PM UTC daily.`,
          schedule: 'None',
          note: 'Process-events runs as part of morning and evening batches',
        });
      }
    }

    if (tasksToRun.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tasks scheduled for this time',
        schedule: scheduleName,
      });
    }

    console.log(`🤖 Orchestrator: Running ${scheduleName} tasks (${tasksToRun.length} tasks)`);

    // Execute all tasks sequentially (to avoid overwhelming the system)
    const results: TaskResult[] = [];
    for (const task of tasksToRun) {
      console.log(`  → Starting: ${task.path}`);
      const result = await executeTask(task.path, authHeader!, task.timeout);
      results.push(result);
      console.log(`  ${result.success ? '✅' : '❌'} ${task.path} (${result.duration}ms)`);
    }

    // Summary
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`🤖 Orchestrator: Complete - ${successCount}/${results.length} succeeded (${totalDuration}ms total)`);

    return NextResponse.json({
      success: failedCount === 0,
      schedule: scheduleName,
      summary: {
        total: results.length,
        succeeded: successCount,
        failed: failedCount,
        totalDuration,
      },
      results,
    });
  } catch (error) {
    console.error('Orchestrator error:', error);
    return NextResponse.json(
      {
        error: 'Orchestrator failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
