'use client';

import { useState, useEffect } from 'react';

export default function DebugOAuth() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const testGoogleOAuth = async () => {
    if (!isClient) return;
    
    setIsLoading(true);
    setLogs([]);
    
    try {
      addLog('Testing Google OAuth flow via API...');
      
      const response = await fetch('/api/test-google-flow');
      const data = await response.json();
      
      if (response.ok) {
        addLog(`SUCCESS: ${data.message}`);
        addLog(`Redirect URL: ${data.redirectUrl}`);
        addLog(`OAuth URL: ${data.oauthUrl}`);
        
        // Try to initiate the actual OAuth flow
        addLog('Attempting to redirect to Google OAuth...');
        window.location.href = data.oauthUrl;
      } else {
        addLog(`ERROR: ${data.error}`);
        if (data.message) addLog(`Details: ${data.message}`);
        if (data.details) addLog(`Full details: ${JSON.stringify(data.details)}`);
      }
      
    } catch (error) {
      addLog(`EXCEPTION: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCallback = async () => {
    if (!isClient) return;
    
    addLog('Testing callback URL...');
    
    try {
      const response = await fetch('/api/test-callback?test=1');
      const data = await response.json();
      addLog(`API Callback test: ${response.status} - ${JSON.stringify(data)}`);
    } catch (error) {
      addLog(`API Callback test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testActualCallback = async () => {
    if (!isClient) return;
    
    addLog('Testing actual auth callback route...');
    
    try {
      const response = await fetch('/auth/callback?test=1');
      addLog(`Auth callback response: ${response.status} - ${response.statusText}`);
      
      if (response.redirected) {
        addLog(`Redirected to: ${response.url}`);
      } else {
        const text = await response.text();
        addLog(`Response body: ${text.substring(0, 200)}...`);
      }
    } catch (error) {
      addLog(`Auth callback test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!isClient) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
        <h1>OAuth Debug Tool</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>OAuth Debug Tool</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testGoogleOAuth}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Testing...' : 'Test Google OAuth'}
        </button>
        
        <button 
          onClick={testCallback}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#34a853',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test API Callback
        </button>
        
        <button 
          onClick={testActualCallback}
          style={{
            padding: '10px 20px',
            backgroundColor: '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Auth Callback
        </button>
      </div>

      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '15px',
        borderRadius: '4px',
        maxHeight: '400px',
        overflowY: 'auto',
        border: '1px solid #ddd'
      }}>
        <h3>Debug Logs:</h3>
        {logs.length === 0 ? (
          <p>No logs yet. Click "Test Google OAuth" to start.</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '5px', fontSize: '12px' }}>
              {log}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Environment Info:</h3>
        <p>Origin: {window.location.origin}</p>
        <p>User Agent: {navigator.userAgent}</p>
        <p>Current URL: {window.location.href}</p>
      </div>
    </div>
  );
}
