'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';

export default function AuthDebugPage() {
  const [authState, setAuthState] = useState<any>({});
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      addLog('❌ Supabase client not available');
      return;
    }

    addLog('✅ Supabase client initialized');

    // Check initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        addLog(`❌ Error getting session: ${error.message}`);
      } else {
        addLog(`✅ Session status: ${session ? 'EXISTS' : 'NONE'}`);
        if (session) {
          addLog(`✅ User: ${session.user.email}`);
          addLog(`✅ Expires: ${new Date(session.expires_at! * 1000).toISOString()}`);
        }
      }
      setAuthState({ session, error });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      addLog(`🔄 Auth state change: ${event}`);
      addLog(`🔄 Session: ${session ? 'EXISTS' : 'NONE'}`);
      if (session?.user) {
        addLog(`🔄 User: ${session.user.email}`);
      }
      setAuthState({ session, event });
    });

    return () => subscription.unsubscribe();
  }, []);

  const testMagicLink = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const testEmail = 'test@example.com';
    addLog(`📧 Sending magic link to: ${testEmail}`);
    
    const redirectUrl = `${window.location.origin}/auth/callback`;
    addLog(`🔗 Redirect URL: ${redirectUrl}`);

    const { error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      addLog(`❌ Magic link error: ${error.message}`);
    } else {
      addLog('✅ Magic link sent successfully');
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    addLog('🚪 Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      addLog(`❌ Sign out error: ${error.message}`);
    } else {
      addLog('✅ Signed out successfully');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Auth Debug Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Current Auth State */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(authState, null, 2)}
            </pre>
          </div>

          {/* Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
            <div className="space-y-4">
              <button
                onClick={testMagicLink}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Send Test Magic Link
              </button>
              <button
                onClick={signOut}
                className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
          </div>
        </div>

        {/* Environment Info */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Environment Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
            </div>
            <div>
              <strong>Supabase Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
            </div>
            <div>
              <strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}
            </div>
            <div>
              <strong>Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
