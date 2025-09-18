'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';

export default function OAuthTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testGoogleOAuth = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const supabase = getSupabaseClient();
      
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      // Test the OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/oauth-test`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        setError(error.message);
        console.error('OAuth error:', error);
      } else {
        setResult({
          success: true,
          data: data,
          message: 'OAuth flow initiated successfully'
        });
        console.log('OAuth success:', data);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Test error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            OAuth Test Page
          </h1>
          <p className="text-gray-600">
            Test Google OAuth flow and debug authentication issues
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Test OAuth Flow</CardTitle>
              <CardDescription>
                Click the button below to test Google OAuth
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={testGoogleOAuth} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Testing OAuth...
                  </>
                ) : (
                  'Test Google OAuth'
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Environment Check</CardTitle>
              <CardDescription>
                Current environment configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Domain: {typeof window !== 'undefined' ? window.location.origin : 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Redirect URL: {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Google Client ID: {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'Set' : 'Missing'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-2">{error}</p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => copyToClipboard(error)}
                >
                  <Copy className="h-4 w-4 mr-1" /> Copy Error
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="border-green-200 bg-green-50 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                Success
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-green-700 mb-2">{result.message}</p>
              <div className="bg-white p-3 rounded border text-sm font-mono overflow-x-auto">
                <pre>{JSON.stringify(result.data, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>
              Useful information for debugging OAuth issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Current URL Parameters:</h4>
                <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                  {typeof window !== 'undefined' ? 
                    JSON.stringify(Object.fromEntries(new URLSearchParams(window.location.search)), null, 2) : 
                    'No parameters'
                  }
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Expected Redirect URLs:</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Google Cloud Console</Badge>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'Unknown'}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Supabase Dashboard</Badge>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'Unknown'}
                    </code>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Quick Links:</h4>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" /> Google Cloud Console
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" /> Supabase Dashboard
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => window.open('/auth-debug', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" /> Auth Debug Tool
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
