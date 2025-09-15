'use client';

import React, { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestApiKeysPage() {
  const [projectId, setProjectId] = useState('');
  const [keyName, setKeyName] = useState('Test Key');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = getSupabaseClient();

  const testApiKeyCreation = async () => {
    if (!projectId.trim()) {
      setResult('❌ Please enter a project ID');
      return;
    }

    setLoading(true);
    setResult('');

    try {
      // Generate a random API key
      const newKey = 'sk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      console.log('Generated key:', newKey);
      console.log('Base64 encoded:', btoa(newKey));
      
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          project_id: projectId,
          name: keyName,
          key_hash: btoa(newKey),
          usage_count: 0
        })
        .select()
        .single();

      if (error) {
        setResult(`❌ Error: ${error.message}`);
        console.error('API key creation error:', error);
      } else {
        setResult(`✅ API key created successfully! ID: ${data.id}`);
        console.log('API key created:', data);
      }
    } catch (err) {
      setResult(`❌ Exception: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const listApiKeys = async () => {
    setLoading(true);
    setResult('');

    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*');

      if (error) {
        setResult(`❌ Error listing keys: ${error.message}`);
      } else {
        setResult(`✅ Found ${data.length} API keys:\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      setResult(`❌ Exception: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API Keys Test Page</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test API Key Creation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Project ID:</label>
              <Input
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="Enter project ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Key Name:</label>
              <Input
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Enter key name"
              />
            </div>
            <div className="flex gap-4">
              <Button onClick={testApiKeyCreation} disabled={loading}>
                {loading ? 'Creating...' : 'Create API Key'}
              </Button>
              <Button onClick={listApiKeys} disabled={loading} variant="outline">
                {loading ? 'Loading...' : 'List API Keys'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm">{result}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
