/**
 * Diagnostic page to help users find their Mission Control dashboards
 * Route: /app/mission-control-help
 */

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ExternalLink } from 'lucide-react';

export default async function MissionControlHelpPage() {
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold">Database Error</h1>
          <p className="text-slate-400">Unable to connect to database</p>
        </div>
      </div>
    );
  }

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/app/mission-control-help');
  }

  // Get user's projects
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-white">Mission Control Dashboard</h1>
          <p className="text-slate-400">
            AI-powered executive briefings for your products
          </p>
        </div>

        {/* System Health Check */}
        <div className="mb-8 rounded-xl border border-blue-800 bg-blue-900/20 p-6">
          <h2 className="mb-4 text-xl font-semibold text-blue-400">System Health Check</h2>
          <p className="mb-4 text-sm text-slate-300">
            If you're experiencing issues, check the system health to diagnose problems:
          </p>
          <Link
            href="/api/dashboard/health"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <ExternalLink className="h-4 w-4" />
            Run Health Check
          </Link>
        </div>

        {/* Instructions */}
        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">How to Access</h2>
          <div className="space-y-4 text-slate-300">
            <p>
              The Mission Control Dashboard is specific to each project. Here are the ways to access it:
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <strong>From Project Cards:</strong> Go to{' '}
                <Link href="/app" className="text-blue-400 hover:underline">
                  /app
                </Link>
                , then click the sparkles (✨) button on any project card
              </li>
              <li>
                <strong>From Project Board:</strong> While viewing a project's feedback board, click
                "Mission Control" in the header
              </li>
              <li>
                <strong>Direct URL:</strong> Navigate to{' '}
                <code className="rounded bg-slate-800 px-2 py-1 text-sm">
                  /{'{'}project-slug{'}'}/dashboard
                </code>
              </li>
            </ol>
          </div>
        </div>

        {/* Setup Requirements */}
        <div className="mb-8 rounded-xl border border-amber-800 bg-amber-900/20 p-6">
          <h2 className="mb-4 text-xl font-semibold text-amber-400">Setup Requirements</h2>
          <div className="space-y-4 text-slate-300">
            <p>Mission Control requires the following to function properly:</p>
            <ol className="list-decimal space-y-3 pl-5">
              <li>
                <strong>OpenAI API Key:</strong> Configure the{' '}
                <code className="rounded bg-slate-800 px-2 py-1 text-sm">OPENAI_API_KEY</code>{' '}
                environment variable. The dashboard uses GPT-4o to generate daily briefings.
              </li>
              <li>
                <strong>Database Migration:</strong> Run the migration file{' '}
                <code className="rounded bg-slate-800 px-2 py-1 text-sm">
                  migrations/202511201800_mission_control_clean.sql
                </code>{' '}
                to create required tables and functions.
              </li>
              <li>
                <strong>Active Project:</strong> Create at least one project with some feedback data
                to see meaningful insights.
              </li>
            </ol>
            <div className="mt-4 rounded-lg border border-amber-700 bg-amber-900/30 p-4">
              <p className="text-sm text-amber-300">
                <strong>Tip:</strong> Use the System Health Check above to verify all requirements
                are met.
              </p>
            </div>
          </div>
        </div>

        {/* User's Projects */}
        {projects && projects.length > 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">Your Projects</h2>
            <p className="mb-4 text-sm text-slate-400">
              Click on a project to open its Mission Control Dashboard:
            </p>
            <div className="space-y-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/${project.slug}/dashboard`}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-all hover:border-blue-500 hover:bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-blue-400" />
                    <div>
                      <div className="font-medium text-white">{project.name}</div>
                      <div className="text-sm text-slate-400">/{project.slug}/dashboard</div>
                    </div>
                  </div>
                  <ExternalLink className="h-5 w-5 text-slate-400" />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center">
            <p className="text-slate-400">You don't have any projects yet.</p>
            <Link
              href="/app/create"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
            >
              Create Your First Project
            </Link>
          </div>
        )}

        {/* Back button */}
        <div className="mt-8 text-center">
          <Link href="/app" className="text-slate-400 hover:text-white">
            ← Back to Projects
          </Link>
        </div>
      </div>
    </div>
  );
}
