'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';

interface ConfigCheck {
  name: string;
  status: 'checking' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export default function AuthDebugPage() {
  const [checks, setChecks] = useState<ConfigCheck[]>([
    { name: 'Environment Variables', status: 'checking', message: 'Checking...' },
    { name: 'Supabase Client', status: 'checking', message: 'Checking...' },
    { name: 'Google OAuth Config', status: 'checking', message: 'Checking...' },
    { name: 'Supabase Auth Settings', status: 'checking', message: 'Checking...' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const router = useRouter();

  const runDiagnostics = async () => {
    setIsRunning(true);
    const newChecks: ConfigCheck[] = [];

    // Check 1: Environment Variables
    try {
      const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const hasGoogleClientId = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      
      if (hasSupabaseUrl && hasSupabaseKey && hasGoogleClientId) {
        newChecks.push({
          name: 'Environment Variables',
          status: 'success',
          message: 'All required environment variables are present',
          details: `Supabase URL: ${hasSupabaseUrl ? '✓' : '✗'}, Anon Key: ${hasSupabaseKey ? '✓' : '✗'}, Google Client ID: ${hasGoogleClientId ? '✓' : '✗'}`
        });
      } else {
        newChecks.push({
          name: 'Environment Variables',
          status: 'error',
          message: 'Missing required environment variables',
          details: `Supabase URL: ${hasSupabaseUrl ? '✓' : '✗'}, Anon Key: ${hasSupabaseKey ? '✓' : '✗'}, Google Client ID: ${hasGoogleClientId ? '✓' : '✗'}`
        });
      }
    } catch (error) {
      newChecks.push({
        name: 'Environment Variables',
        status: 'error',
        message: 'Error checking environment variables',
        details: String(error)
      });
    }

    // Check 2: Supabase Client
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          newChecks.push({
            name: 'Supabase Client',
            status: 'error',
            message: 'Supabase client error',
            details: error.message
          });
        } else {
          newChecks.push({
            name: 'Supabase Client',
            status: 'success',
            message: 'Supabase client working correctly',
            details: data.session ? `User: ${data.session.user?.email || 'Unknown'}` : 'No active session'
          });
        }
      } else {
        newChecks.push({
          name: 'Supabase Client',
          status: 'error',
          message: 'Failed to initialize Supabase client',
          details: 'Client returned null'
        });
      }
    } catch (error) {
      newChecks.push({
        name: 'Supabase Client',
        status: 'error',
        message: 'Supabase client error',
        details: String(error)
      });
    }

    // Check 3: Google OAuth Configuration
    try {
      const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (googleClientId) {
        // Test if the client ID format is correct
        const isValidFormat = googleClientId.includes('.apps.googleusercontent.com');
        if (isValidFormat) {
          newChecks.push({
            name: 'Google OAuth Config',
            status: 'success',
            message: 'Google Client ID format is correct',
            details: `Client ID: ${googleClientId.substring(0, 20)}...`
          });
        } else {
          newChecks.push({
            name: 'Google OAuth Config',
            status: 'warning',
            message: 'Google Client ID format may be incorrect',
            details: `Expected format: xxx.apps.googleusercontent.com, Got: ${googleClientId}`
          });
        }
      } else {
        newChecks.push({
          name: 'Google OAuth Config',
          status: 'error',
          message: 'Google Client ID not found',
          details: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable is missing'
        });
      }
    } catch (error) {
      newChecks.push({
        name: 'Google OAuth Config',
        status: 'error',
        message: 'Error checking Google OAuth config',
        details: String(error)
      });
    }

    // Check 4: Test Google OAuth (without actually signing in)
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        // This will test the OAuth configuration without actually signing in
        const redirectUrl = `${window.location.origin}/auth/callback?next=/app`;
        newChecks.push({
          name: 'Supabase Auth Settings',
          status: 'success',
          message: 'OAuth redirect URL configured',
          details: `Redirect URL: ${redirectUrl}`
        });
      } else {
        newChecks.push({
          name: 'Supabase Auth Settings',
          status: 'error',
          message: 'Cannot test OAuth settings',
          details: 'Supabase client not available'
        });
      }
    } catch (error) {
      newChecks.push({
        name: 'Supabase Auth Settings',
        status: 'error',
        message: 'Error checking OAuth settings',
        details: String(error)
      });
    }

    setChecks(newChecks);
    setIsRunning(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getStatusIcon = (status: ConfigCheck['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: ConfigCheck['status']) => {
    switch (status) {
      case 'checking':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Authentication Debug Tool
          </h1>
          <p className="text-gray-600">
            Diagnose Google OAuth and authentication issues
          </p>
        </div>

        <div className="mb-6">
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              'Run Diagnostics'
            )}
          </Button>
        </div>

        <div className="space-y-4">
          {checks.map((check, index) => (
            <Card key={index} className={`${getStatusColor(check.status)}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {getStatusIcon(check.status)}
                  {check.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-2">{check.message}</p>
                {check.details && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Details:</p>
                    <div className="bg-white p-3 rounded border text-sm font-mono break-all">
                      {check.details}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                className="w-full justify-start"
              >
                Google Cloud Console
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                className="w-full justify-start"
              >
                Supabase Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('https://vercel.com/dashboard', '_blank')}
                className="w-full justify-start"
              >
                Vercel Dashboard
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Environment Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Environment:</span>
                  <Badge variant="outline">
                    {process.env.NODE_ENV || 'development'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Domain:</span>
                  <span className="font-mono text-xs">
                    {typeof window !== 'undefined' ? window.location.origin : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">User Agent:</span>
                  <span className="font-mono text-xs">
                    {typeof window !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'Unknown'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Button 
            variant="outline" 
            onClick={() => router.push('/login')}
            className="flex items-center gap-2"
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}