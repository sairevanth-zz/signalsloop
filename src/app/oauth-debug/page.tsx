'use client';

import { useState } from 'react';

export default function OAuthDebugPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testOAuth = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/test-supabase-google');
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ error: 'Failed to test OAuth configuration' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>OAuth Debug Page</h1>
      
      <button 
        onClick={testOAuth}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Testing...' : 'Test OAuth Configuration'}
      </button>

      {testResult && (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          padding: '20px',
          whiteSpace: 'pre-wrap'
        }}>
          <h3>Test Results:</h3>
          {JSON.stringify(testResult, null, 2)}
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h3>Environment Variables:</h3>
        <ul>
          <li>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</li>
          <li>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</li>
          <li>SUPABASE_SERVICE_ROLE: {process.env.SUPABASE_SERVICE_ROLE ? '✅ Set' : '❌ Missing'}</li>
          <li>NEXT_PUBLIC_GOOGLE_CLIENT_ID: {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Next Steps:</h3>
        <ol>
          <li>Check Supabase Dashboard → Authentication → Providers</li>
          <li>Ensure Google provider is enabled</li>
          <li>Verify Client ID and Client Secret are set</li>
          <li>Check redirect URL: https://signalsloop.vercel.app/auth/callback</li>
          <li>Verify Google Cloud Console has correct redirect URIs</li>
        </ol>
      </div>
    </div>
  );
}
