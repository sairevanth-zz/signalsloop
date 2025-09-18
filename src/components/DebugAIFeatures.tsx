'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/lib/supabase-client';

interface DebugInfo {
  projectPlan: string | null;
  userPlan: string | null;
  hasOpenAIKey: boolean;
  hasDatabaseSchema: boolean;
  projectId: string | null;
  userId: string | null;
}

interface DebugAIFeaturesProps {
  projectSlug: string;
}

export function DebugAIFeatures({ projectSlug }: DebugAIFeaturesProps) {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    projectPlan: null,
    userPlan: null,
    hasOpenAIKey: false,
    hasDatabaseSchema: false,
    projectId: null,
    userId: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkDebugInfo = async () => {
      try {
        const supabase = getSupabaseClient();
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get project info
        const { data: projectData } = await supabase
          .from('projects')
          .select('id, owner_id')
          .eq('slug', projectSlug)
          .single();
        
        // Get user plan
        const { data: userData } = await supabase
          .from('users')
          .select('plan')
          .eq('id', user?.id)
          .single();

        // Check if database schema exists (try to query new columns)
        let hasSchema = false;
        try {
          const { data: testData } = await supabase
            .from('posts')
            .select('priority_score')
            .limit(1);
          hasSchema = true;
        } catch (error) {
          console.log('Schema check failed:', error);
        }

        // Check if OpenAI key is available (client-side check)
        const hasOpenAIKey = process.env.NEXT_PUBLIC_OPENAI_AVAILABLE === 'true' || false;

        setDebugInfo({
          projectPlan: 'n/a', // No longer used
          userPlan: userData?.plan || 'unknown',
          hasOpenAIKey,
          hasDatabaseSchema: hasSchema,
          projectId: projectData?.id || null,
          userId: user?.id || null
        });
      } catch (error) {
        console.error('Debug info error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkDebugInfo();
  }, [projectSlug]);

  const updateUserToPro = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('No user found');
        return;
      }
      
      const { error } = await supabase
        .from('users')
        .update({ plan: 'pro' })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error updating user:', error);
        alert('Error updating user: ' + error.message);
      } else {
        alert('User updated to Pro! Refresh the page to see AI features.');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error);
    }
  };

  if (loading) {
    return <div>Loading debug info...</div>;
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-yellow-800">🐛 AI Features Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Project Plan:</strong>
            <Badge className={`ml-2 ${debugInfo.projectPlan === 'pro' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {debugInfo.projectPlan}
            </Badge>
          </div>
          
          <div>
            <strong>User Plan:</strong>
            <Badge className={`ml-2 ${debugInfo.userPlan === 'pro' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {debugInfo.userPlan}
            </Badge>
          </div>
          
          <div>
            <strong>Database Schema:</strong>
            <Badge className={`ml-2 ${debugInfo.hasDatabaseSchema ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {debugInfo.hasDatabaseSchema ? 'Ready' : 'Missing'}
            </Badge>
          </div>
          
          <div>
            <strong>OpenAI Key:</strong>
            <Badge className={`ml-2 ${debugInfo.hasOpenAIKey ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {debugInfo.hasOpenAIKey ? 'Available' : 'Missing'}
            </Badge>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p><strong>Project ID:</strong> {debugInfo.projectId || 'Not found'}</p>
          <p><strong>User ID:</strong> {debugInfo.userId || 'Not found'}</p>
        </div>

        {debugInfo.userPlan !== 'pro' && (
          <div className="p-4 bg-yellow-100 rounded-lg">
            <p className="text-sm text-yellow-800 mb-3">
              <strong>Issue Found:</strong> Your account is not set to Pro plan. AI features only show for Pro users.
            </p>
            <Button 
              onClick={updateUserToPro}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              size="sm"
            >
              Update User to Pro
            </Button>
          </div>
        )}

        {!debugInfo.hasDatabaseSchema && (
          <div className="p-4 bg-red-100 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Issue Found:</strong> Database schema is missing. Please run the SQL schema file in Supabase.
            </p>
          </div>
        )}

        <div className="text-xs text-gray-500">
          This debug component will be removed once AI features are working.
        </div>
      </CardContent>
    </Card>
  );
}
