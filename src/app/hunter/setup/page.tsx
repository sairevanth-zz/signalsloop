/**
 * Hunter Setup Page
 * Onboarding wizard for configuring the AI Feedback Hunter
 */

import { HunterSetup } from '@/components/hunter';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Setup AI Feedback Hunter | SignalsLoop',
  description: 'Configure autonomous feedback discovery',
};

export default async function HunterSetupPage({
  searchParams,
}: {
  searchParams: { projectId?: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get project ID
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
    redirect('/app/create');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Setup AI Feedback Hunter</h1>
          <p className="text-gray-600">
            Configure autonomous feedback discovery to find customer feedback across multiple
            platforms
          </p>
        </div>

        <HunterSetup
          projectId={projectId}
          onComplete={() => {
            window.location.href = `/hunter?projectId=${projectId}`;
          }}
        />
      </div>
    </div>
  );
}
