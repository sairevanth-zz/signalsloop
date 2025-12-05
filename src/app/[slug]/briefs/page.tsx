/**
 * Executive Briefs Page
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { BriefsDashboard } from '@/components/briefs';

export default function BriefsPage() {
  const params = useParams();
  const projectSlug = params?.slug as string;
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects?slug=${projectSlug}`);
        const data = await response.json();
        if (data.projects?.[0]) {
          setProjectId(data.projects[0].id);
        }
      } catch (error) {
        console.error('[BriefsPage] Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (projectSlug) {
      fetchProject();
    }
  }, [projectSlug]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <BriefsDashboard projectId={projectId} />
      </div>
    </div>
  );
}
