'use client';

import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AuthTestContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Checking authentication...');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const testAuth = async () => {
      try {
        // Create Supabase client
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Check for auth code in URL params
        const authCode = searchParams.get('auth_code');
        if (authCode) {
          setStatus(`Found auth code: ${authCode.substring(0, 20)}...`);
          
          // Exchange code for session
          const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
          
          if (error) {
            setStatus(`Auth error: ${error.message}`);
            return;
          }

          if (data.session && data.user) {
            setStatus('Authentication successful!');
            setUser(data.user);
          } else {
            setStatus('No session created');
          }
        } else {
          // Check for hash-based auth (access_token in URL hash)
          const hash = window.location.hash;
          if (hash && hash.includes('access_token')) {
            setStatus('Found access_token in hash, processing...');
            
            // Parse the hash to extract access_token
            const hashParams = new URLSearchParams(hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            
            if (accessToken) {
              // Set the session using the tokens from hash
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
              });
              
              if (error) {
                setStatus(`Hash auth error: ${error.message}`);
                return;
              }

              if (data.session && data.user) {
                setStatus('Hash-based authentication successful!');
                setUser(data.user);
                // Clear the hash from URL
                window.history.replaceState({}, document.title, window.location.pathname);
              } else {
                setStatus('No session created from hash');
              }
            } else {
              setStatus('No access_token found in hash');
            }
          } else {
            setStatus('No auth code or hash found');
          }
        }

        // Also check current auth state
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser && !user) { // Only update if we don't already have user
          setUser(currentUser);
          if (!authCode && !window.location.hash.includes('access_token')) {
            setStatus('Already authenticated');
          }
        }

      } catch (error) {
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    testAuth();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Auth Test Page</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Status</h2>
          <p className="text-gray-700">{status}</p>
        </div>

        {user && (
          <div className="bg-green-50 p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">User Info</h2>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>ID:</strong> {user.id}</p>
            <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
          </div>
        )}

        <div className="space-y-4">
          <Link href="/login" className="block">
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Go to Login
            </button>
          </Link>
          
          <Link href="/app" className="block">
            <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Go to App Dashboard
            </button>
          </Link>

          <Link href="/" className="block">
            <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
              Go to Home
            </button>
          </Link>
        </div>

        <div className="mt-8 bg-yellow-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
          <p><strong>Auth Code:</strong> {searchParams.get('auth_code') || 'None'}</p>
          <p><strong>Environment:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}

export default function AuthTestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading auth test...</p>
        </div>
      </div>
    }>
      <AuthTestContent />
    </Suspense>
  );
}
