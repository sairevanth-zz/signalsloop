'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function TestLoginPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    console.log('Google login clicked');
    setLoading(true);
    setMessage('Starting Google login...');
    setError('');
    
    try {
      // Create Supabase client directly without using the hook
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        setError('Missing Supabase environment variables');
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const redirectUrl = window.location.origin + '/auth/callback?next=/app';
      
      console.log('Redirect URL:', redirectUrl);
      console.log('Supabase URL:', supabaseUrl);

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (oauthError) {
        console.error('OAuth error:', oauthError);
        setError('OAuth Error: ' + oauthError.message);
      } else {
        console.log('OAuth success:', data);
        setMessage('Redirecting to Google...');
      }
    } catch (err) {
      console.error('Exception:', err);
      setError('Exception: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <html>
      <head>
        <title>Test Login</title>
      </head>
      <body style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Test Login Page</h1>
        <p>This page bypasses all global providers and components to test OAuth directly.</p>
        
        <div style={{ margin: '20px 0' }}>
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: loading ? '#ccc' : '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Login with Google'}
          </button>
        </div>

        {message && (
          <div style={{
            padding: '10px',
            backgroundColor: '#e8f5e8',
            border: '1px solid #4caf50',
            borderRadius: '4px',
            margin: '10px 0'
          }}>
            <strong>Status:</strong> {message}
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px',
            backgroundColor: '#ffebee',
            border: '1px solid #f44336',
            borderRadius: '4px',
            margin: '10px 0'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          <p><strong>Debug Info:</strong></p>
          <p>Origin: {typeof window !== 'undefined' ? window.location.origin : 'Unknown'}</p>
          <p>Redirect URL: {typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : 'Unknown'}</p>
          <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}</p>
          <p>Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}</p>
        </div>
      </body>
    </html>
  );
}
