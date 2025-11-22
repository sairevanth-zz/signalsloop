/**
 * Unified Task Orchestrator
 *
 * This single cron job runs all scheduled tasks, allowing us to use
 * only 1 Vercel cron slot instead of 10+
 *
 * Schedule in vercel.json:
 * - Hourly: "0 * * * *" (every hour)
 * - OR call manually with ?schedule=daily&time=09:00
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
 */
const TASK_SCHEDULE = {
  hourly: [
    { path: '/api/cron/hunter-scan', timeout: 300000 }, // 5 min
    { path: '/api/cron/calls-analyze', timeout: 180000 }, // 3 min
  ],
  daily_morning: [
    // Run at 9 AM
    { path: '/api/cron/proactive-spec-writer', timeout: 300000 },
    { path: '/api/cron/competitive-extraction', timeout: 180000 },
    { path: '/api/cron/detect-feature-gaps', timeout: 120000 },
    { path: '/api/cron/strategic-recommendations', timeout: 120000 },
  ],
  daily_night: [
    // Run at 2 AM
    { path: '/api/cron/daily-backup', timeout: 600000 }, // 10 min
  ],
  weekly: [
    // Run on Sundays
    { path: '/api/cron/scrape-external-reviews', timeout: 600000 },
    { path: '/api/cron/analyze-competitors', timeout: 300000 },
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
    const scheduleParam = searchParams.get('schedule'); // hourly, daily, weekly
    const timeParam = searchParams.get('time'); // e.g., "09:00"

    // Default: determine based on current time
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDay = now.getUTCDay(); // 0 = Sunday

    let tasksToRun: Array<{ path: string; timeout: number }> = [];
    let scheduleName = '';

    if (scheduleParam) {
      // Manual trigger via query param
      if (scheduleParam === 'hourly') {
        tasksToRun = TASK_SCHEDULE.hourly;
        scheduleName = 'Hourly';
      } else if (scheduleParam === 'daily' && timeParam === '09:00') {
        tasksToRun = TASK_SCHEDULE.daily_morning;
        scheduleName = 'Daily Morning';
      } else if (scheduleParam === 'daily' && timeParam === '02:00') {
        tasksToRun = TASK_SCHEDULE.daily_night;
        scheduleName = 'Daily Night';
      } else if (scheduleParam === 'weekly') {
        tasksToRun = TASK_SCHEDULE.weekly;
        scheduleName = 'Weekly';
      }
    } else {
      // Auto-determine based on current time
      if (currentHour === 2) {
        // 2 AM UTC - Daily backup
        tasksToRun = TASK_SCHEDULE.daily_night;
        scheduleName = 'Daily Night (2 AM)';
      } else if (currentHour === 9) {
        // 9 AM UTC - Morning tasks
        tasksToRun = TASK_SCHEDULE.daily_morning;
        scheduleName = 'Daily Morning (9 AM)';
      } else if (currentDay === 0 && currentHour === 10) {
        // Sunday 10 AM UTC - Weekly tasks
        tasksToRun = TASK_SCHEDULE.weekly;
        scheduleName = 'Weekly (Sunday 10 AM)';
      } else {
        // Every other hour - Hourly tasks
        tasksToRun = TASK_SCHEDULE.hourly;
        scheduleName = 'Hourly';
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
