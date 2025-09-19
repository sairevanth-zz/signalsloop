'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/lib/supabase-client';

export default function DebugRoadmap() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    setDebugInfo(null);

    try {
      const supabase = getSupabaseClient();
      
      // Test 1: Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      const info = {
        timestamp: new Date().toISOString(),
        user: user ? {
          id: user.id,
          email: user.email,
          authenticated: true
        } : {
          authenticated: false,
          error: userError?.message
        },
        supabase: !!supabase,
        window: typeof window !== 'undefined',
        router: typeof window !== 'undefined' ? 'available' : 'not available'
      };

      setDebugInfo(info);
    } catch (error) {
      setDebugInfo({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roadmap Debug Info</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={runDebug} disabled={loading}>
          {loading ? 'Running Debug...' : 'Run Debug Check'}
        </Button>
        
        {debugInfo && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Debug Results:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
