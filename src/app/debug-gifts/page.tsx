'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getSupabaseClient } from '@/lib/supabase-client';

export default function DebugGiftsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, status: 'success' | 'error', message: string, details?: any) => {
    setResults(prev => [...prev, { test, status, message, details, timestamp: new Date().toISOString() }]);
  };

  const runDiagnostics = async () => {
    setLoading(true);
    setResults([]);
    
    const supabase = getSupabaseClient();

    try {
      // Test 1: Check if user is authenticated
      addResult('Authentication', 'info', 'Checking user authentication...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        addResult('Authentication', 'error', 'User not authenticated', userError);
        setLoading(false);
        return;
      }
      
      addResult('Authentication', 'success', `User authenticated: ${user.email}`);

      // Test 2: Check if gift_subscriptions table exists by trying to query it
      addResult('Database Schema', 'info', 'Checking if gift_subscriptions table exists...');
      const { data: giftTableTest, error: tableError } = await supabase
        .from('gift_subscriptions')
        .select('id')
        .limit(1);

      if (tableError && tableError.code === 'PGRST116') {
        addResult('Database Schema', 'error', 'gift_subscriptions table does not exist! Run add-gift-subscriptions-schema.sql');
      } else if (tableError) {
        addResult('Database Schema', 'error', 'Error checking gift_subscriptions table', tableError);
      } else {
        addResult('Database Schema', 'success', 'gift_subscriptions table exists');
      }

      // Test 3: Check if create_gift_subscription function exists by trying to call it
      addResult('Database Functions', 'info', 'Checking if create_gift_subscription function exists...');
      
      // First check if we have projects to test with
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      if (projectsError || !projects || projects.length === 0) {
        addResult('Database Functions', 'error', 'Need at least one project to test functions. Create a project first.');
      } else {
        // Try to call the function with invalid parameters to see if it exists
        const { data: functionTest, error: functionError } = await supabase.rpc('create_gift_subscription', {
          p_project_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
          p_recipient_email: 'test@example.com',
          p_duration_months: 1,
          p_gift_message: null
        });

        if (functionError && functionError.message.includes('function') && functionError.message.includes('does not exist')) {
          addResult('Database Functions', 'error', 'create_gift_subscription function does not exist! Run add-gift-subscriptions-schema.sql');
        } else if (functionError && functionError.message.includes('Unauthorized')) {
          addResult('Database Functions', 'success', 'create_gift_subscription function exists (got expected auth error)');
        } else if (functionError) {
          addResult('Database Functions', 'success', 'create_gift_subscription function exists (got function-specific error)', functionError);
        } else {
          addResult('Database Functions', 'success', 'create_gift_subscription function exists');
        }
      }

      // Test 4: Try to get user's projects (reuse from previous test)
      addResult('User Projects', 'info', 'Checking user projects...');
      const { data: userProjects, error: userProjectsError } = await supabase
        .from('projects')
        .select('id, name, slug')
        .eq('owner_id', user.id);

      if (userProjectsError) {
        addResult('User Projects', 'error', 'Error fetching projects', userProjectsError);
      } else if (userProjects.length === 0) {
        addResult('User Projects', 'error', 'No projects found. Create a project first.');
      } else {
        addResult('User Projects', 'success', `Found ${userProjects.length} project(s)`, userProjects);
      }

      // Test 5: Try to create a test gift (if we have projects)
      if (userProjects && userProjects.length > 0) {
        addResult('Gift Creation', 'info', 'Testing gift creation...');
        const testProject = userProjects[0];
        
        const { data, error } = await supabase.rpc('create_gift_subscription', {
          p_project_id: testProject.id,
          p_recipient_email: 'test@example.com',
          p_duration_months: 1,
          p_gift_message: 'Test gift from diagnostics'
        });

        if (error) {
          addResult('Gift Creation', 'error', 'Failed to create test gift', error);
        } else if (data && data.success) {
          addResult('Gift Creation', 'success', 'Test gift created successfully', data);
          
          // Clean up test gift
          await supabase
            .from('gift_subscriptions')
            .delete()
            .eq('id', data.gift_id);
          addResult('Cleanup', 'success', 'Test gift cleaned up');
        } else {
          addResult('Gift Creation', 'error', 'Unexpected response from gift creation', data);
        }
      }

    } catch (error) {
      addResult('General Error', 'error', 'Unexpected error during diagnostics', error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Gift Subscription Diagnostics</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={runDiagnostics} disabled={loading} className="w-full">
              {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((result, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1 ${
                      result.status === 'success' ? 'bg-green-500' : 
                      result.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{result.test}</h3>
                        <span className={`text-sm px-2 py-1 rounded ${
                          result.status === 'success' ? 'bg-green-100 text-green-800' : 
                          result.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {result.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                      {result.details && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-500">Details</summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Alert>
          <AlertDescription>
            <strong>If you see errors:</strong>
            <br />
            1. Make sure you're signed in to your account
            <br />
            2. Run the SQL schema file: <code>add-gift-subscriptions-schema.sql</code>
            <br />
            3. Create at least one project before testing gifts
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
