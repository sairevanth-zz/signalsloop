'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';

export default function SimpleLoginPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGoogleLogin = async () => {
    console.log('Google login clicked');
    setLoading(true);
    setMessage('Starting Google login...');
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setMessage('Supabase not available');
        return;
      }

      const redirectUrl = window.location.origin + '/auth/callback?next=/app';
      console.log('Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) {
        console.error('OAuth error:', error);
        setMessage('Error: ' + error.message);
      } else {
        console.log('OAuth success:', data);
        setMessage('Redirecting to Google...');
      }
    } catch (err) {
      console.error('Exception:', err);
      setMessage('Exception: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Simple Login Test</h1>
      <p>This is a minimal login page to test Google OAuth without any complex React components.</p>
      
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
          backgroundColor: '#f0f0f0',
          border: '1px solid #ccc',
          borderRadius: '4px',
          margin: '10px 0'
        }}>
          <strong>Status:</strong> {message}
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Debug Info:</strong></p>
        <p>Origin: {typeof window !== 'undefined' ? window.location.origin : 'Unknown'}</p>
        <p>Redirect URL: {typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : 'Unknown'}</p>
      </div>
    </div>
  );
}
