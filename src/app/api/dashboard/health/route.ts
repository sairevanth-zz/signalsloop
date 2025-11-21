/**
 * Mission Control Health Check API
 * Verifies system requirements for dashboard functionality
 */

import { NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export async function GET() {
  const checks: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
  }[] = [];

  // Check 1: OpenAI API Key
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  checks.push({
    name: 'OpenAI API Key',
    status: hasOpenAIKey ? 'pass' : 'fail',
    message: hasOpenAIKey
      ? 'OpenAI API key is configured'
      : 'Missing OPENAI_API_KEY environment variable',
    details: hasOpenAIKey
      ? { key_prefix: process.env.OPENAI_API_KEY?.substring(0, 7) + '...' }
      : { required: 'Set OPENAI_API_KEY in your environment variables' },
  });

  // Check 2: Database Connection
  const supabase = getSupabaseServiceRoleClient();
  let dbConnected = false;
  let dbError = null;

  if (supabase) {
    try {
      const { data, error } = await supabase.from('projects').select('count').limit(1);
      dbConnected = !error;
      dbError = error?.message;
    } catch (e) {
      dbError = e instanceof Error ? e.message : 'Unknown database error';
    }
  }

  checks.push({
    name: 'Database Connection',
    status: dbConnected ? 'pass' : 'fail',
    message: dbConnected
      ? 'Successfully connected to Supabase database'
      : 'Failed to connect to database',
    details: dbError ? { error: dbError } : undefined,
  });

  // Check 3: daily_briefings table exists
  let tableExists = false;
  let tableError = null;

  if (supabase) {
    try {
      const { error } = await supabase.from('daily_briefings').select('count').limit(0);
      tableExists = !error;
      tableError = error?.message;
    } catch (e) {
      tableError = e instanceof Error ? e.message : 'Unknown table error';
    }
  }

  checks.push({
    name: 'Database Table: daily_briefings',
    status: tableExists ? 'pass' : 'fail',
    message: tableExists
      ? 'Table exists and is accessible'
      : 'Table does not exist or is not accessible',
    details: tableError
      ? {
          error: tableError,
          solution: 'Run the migration: migrations/202511201800_mission_control_clean.sql',
        }
      : undefined,
  });

  // Check 4: Database Functions
  let functionsExist = false;
  let functionError = null;

  if (supabase) {
    try {
      // Try calling get_today_briefing with a dummy UUID to see if function exists
      const dummyId = '00000000-0000-0000-0000-000000000000';
      const { error } = await supabase.rpc('get_today_briefing', {
        p_project_id: dummyId,
      });

      // Function exists if we don't get a "function does not exist" error
      functionsExist = !error || !error.message.includes('does not exist');
      functionError = error?.message;
    } catch (e) {
      functionError = e instanceof Error ? e.message : 'Unknown function error';
    }
  }

  checks.push({
    name: 'Database Functions',
    status: functionsExist ? 'pass' : 'fail',
    message: functionsExist
      ? 'Required functions are available'
      : 'Database functions are missing',
    details: functionError
      ? {
          error: functionError,
          required: ['get_today_briefing', 'get_dashboard_metrics'],
          solution: 'Run the migration: migrations/202511201800_mission_control_clean.sql',
        }
      : { functions: ['get_today_briefing', 'get_dashboard_metrics'] },
  });

  // Check 5: Test Project Exists
  let hasProjects = false;
  let projectCount = 0;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true });

      if (!error && data !== null) {
        projectCount = data.length || 0;
        hasProjects = projectCount > 0;
      }
    } catch (e) {
      // Ignore
    }
  }

  checks.push({
    name: 'Test Data',
    status: hasProjects ? 'pass' : 'warning',
    message: hasProjects
      ? `Found ${projectCount} project(s) in database`
      : 'No projects found - create a project to test the dashboard',
    details: { project_count: projectCount },
  });

  // Overall status
  const failedChecks = checks.filter((c) => c.status === 'fail').length;
  const warningChecks = checks.filter((c) => c.status === 'warning').length;
  const passedChecks = checks.filter((c) => c.status === 'pass').length;

  const overallStatus =
    failedChecks > 0 ? 'fail' : warningChecks > 0 ? 'warning' : 'pass';

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: passedChecks,
      warnings: warningChecks,
      failed: failedChecks,
    },
    checks,
    next_steps:
      failedChecks > 0
        ? [
            'Review failed checks above',
            'Run database migrations if tables/functions are missing',
            'Configure missing environment variables',
            'Restart your application after fixing issues',
          ]
        : [
            'All critical checks passed!',
            'Mission Control dashboard should be operational',
            'Create a project and test the dashboard',
          ],
  });
}
