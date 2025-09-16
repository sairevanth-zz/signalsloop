'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';

export default function SupabaseTest() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testSupabase = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setResult('❌ Supabase client not available');
        return;
      }

      // Test basic connection
      const { data, error } = await supabase.from('projects').select('id').limit(1);
      
      if (error) {
        setResult(`❌ Supabase connection error: ${error.message}`);
      } else {
        setResult('✅ Supabase connection successful');
      }
    } catch (err) {
      setResult(`❌ Exception: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const testMagicLink = async () => {
    setLoading(true);
    setResult('Sending test magic link...');
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setResult('❌ Supabase client not available');
        return;
      }

      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('Test magic link redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.signInWithOtp({
        email: 'test@example.com',
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) {
        setResult(`❌ Magic link error: ${error.message}`);
      } else {
        setResult('✅ Magic link sent successfully (check console for redirect URL)');
      }
    } catch (err) {
      setResult(`❌ Exception: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold text-center">Supabase Test</h1>
        
        <div className="space-y-2">
          <button
            onClick={testSupabase}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Test Supabase Connection
          </button>
          
          <button
            onClick={testMagicLink}
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
          >
            Test Magic Link
          </button>
        </div>
        
        <div className="bg-white p-4 rounded border">
          <h3 className="font-semibold mb-2">Result:</h3>
          <p className="text-sm">{result}</p>
        </div>
        
        <div className="bg-white p-4 rounded border">
          <h3 className="font-semibold mb-2">Environment:</h3>
          <p className="text-sm">
            <strong>Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}<br/>
            <strong>Hostname:</strong> {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}<br/>
            <strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'}<br/>
            <strong>Supabase Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}
          </p>
        </div>
      </div>
    </div>
  );
}
