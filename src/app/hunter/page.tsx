/**
 * AI Feedback Hunter Page
 * Main dashboard for the autonomous feedback discovery feature
 */

import { HunterDashboard } from '@/components/hunter';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export const metadata = {
  title: 'AI Feedback Hunter | SignalsLoop',
  description: 'Autonomous feedback discovery across multiple platforms',
};

export default async function HunterPage({
  searchParams,
}: {
  searchParams: { projectId?: string };
}) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get project ID from search params or use first project
  let projectId = searchParams.projectId;

  if (!projectId) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single();

    if (projects) {
      projectId = projects.id;
    }
  }

  if (!projectId) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">No Projects Found</h1>
          <p className="text-gray-600 mb-8">
            Create a project first to use the AI Feedback Hunter
          </p>
          <a
            href="/app/create"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Create Project
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <HunterDashboard projectId={projectId} />
    </div>
  );
}
