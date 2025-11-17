/**
 * AI Roadmap Suggestions Page
 *
 * Main page for viewing and managing AI-generated product roadmap
 * Based on multi-factor analysis of all feedback themes
 */

import { RoadmapDashboard } from '@/components/roadmap';

export const metadata = {
  title: 'AI Roadmap | SignalsLoop',
  description: 'AI-powered product roadmap based on user feedback analysis'
};

export default async function RoadmapPage({
  searchParams
}: {
  searchParams: { projectId?: string }
}) {
  // In a real app, you'd get the projectId from the user's session/context
  // For now, we'll use the searchParams as a fallback
  const projectId = searchParams.projectId || '';

  if (!projectId) {
    return (
      <div className="container mx-auto py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">AI Roadmap Suggestions</h1>
          <p className="text-gray-600 mb-8">
            Please select a project to view roadmap suggestions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <RoadmapDashboard projectId={projectId} />
    </div>
  );
}
