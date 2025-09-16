'use client';

import { useState, useEffect } from 'react';

export default function AuthDebugPage() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    addLog('🔍 Starting auth debug...');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    addLog(`✅ Supabase URL: ${supabaseUrl ? 'SET' : 'MISSING'}`);
    addLog(`✅ Supabase Key: ${supabaseKey ? 'SET' : 'MISSING'}`);
    addLog(`✅ Current URL: ${window.location.href}`);
    addLog(`✅ Origin: ${window.location.origin}`);

    // Test if we can import and create Supabase client
    import('@/lib/supabase-client').then(({ getSupabaseClient }) => {
      const supabase = getSupabaseClient();
      if (supabase) {
        addLog('✅ Supabase client created successfully');
        
        // Test session
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase.auth.getSession().then((result: any) => {
          if (result.error) {
            addLog(`❌ Session error: ${result.error.message}`);
          } else {
            addLog(`✅ Session: ${result.data.session ? 'EXISTS' : 'NONE'}`);
            if (result.data.session?.user) {
              addLog(`✅ User: ${result.data.session.user.email}`);
            }
          }
        });

        // Listen for auth changes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
          addLog(`🔄 Auth event: ${event}`);
          addLog(`🔄 Session: ${session ? 'EXISTS' : 'NONE'}`);
        });

        return () => subscription.unsubscribe();
      } else {
        addLog('❌ Failed to create Supabase client');
      }
    }).catch((error) => {
      addLog(`❌ Import error: ${error.message}`);
    });
  }, []);

  const testAppAccess = async () => {
    addLog('🔍 Testing app access...');
    
    try {
      const response = await fetch('/app');
      addLog(`📡 App response status: ${response.status}`);
      addLog(`📡 App response URL: ${response.url}`);
      
      if (response.redirected) {
        addLog(`🔄 Redirected to: ${response.url}`);
      }
    } catch (error) {
      addLog(`❌ App access error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const signOut = async () => {
    addLog('🚪 Signing out...');
    
    try {
      const { getSupabaseClient } = await import('@/lib/supabase-client');
      const supabase = getSupabaseClient();
      
      if (!supabase) {
        addLog('❌ No Supabase client available');
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        addLog(`❌ Sign out error: ${error.message}`);
      } else {
        addLog('✅ Signed out successfully');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    } catch (error) {
      addLog(`❌ Sign out error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Auth Debug Page</h1>
        
        {/* Test Actions */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-x-4">
            <button
              onClick={testAppAccess}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Test App Access
            </button>
            <button
              onClick={signOut}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Debug Logs */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">Loading...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
