'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on client side
  useEffect(() => {
    setIsClient(true);
    
    // Check for OAuth tokens in URL hash
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('access_token=')) {
        console.log('OAuth tokens detected in URL hash, processing...');
        
        // Extract tokens from hash
        const urlParams = new URLSearchParams(hash.substring(1));
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        
        if (accessToken) {
          console.log('Access token found, setting session and redirecting to /app');
          
          // Set the session in Supabase client (async function)
          const setSession = async () => {
            try {
              const { createClient } = await import('@supabase/supabase-js');
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
              const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
              
              if (supabaseUrl && supabaseKey) {
                const supabase = createClient(supabaseUrl, supabaseKey);
                
                // Set the session with the tokens
                const { data, error } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken || ''
                });
                
                if (error) {
                  console.error('Error setting session:', error);
                } else {
                  console.log('Session set successfully:', data.user?.email);
                }
              }
            } catch (error) {
              console.error('Error processing OAuth tokens:', error);
            }
            
            // Clean up the URL and redirect to app
            window.history.replaceState({}, document.title, window.location.pathname);
            window.location.href = '/app';
          };
          
          setSession();
          return;
        }
      }
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const detailsParam = urlParams.get('details');
    
    if (errorParam) {
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (errorParam === 'oauth_error') {
        errorMessage = 'Google authentication failed. Please try again.';
      } else if (errorParam === 'auth_callback_error') {
        errorMessage = 'Authentication callback failed. Please try again.';
      } else if (errorParam === 'no_code_provided') {
        errorMessage = 'No authentication code received. Please try again.';
      } else if (errorParam === 'admin_required') {
        errorMessage = 'Admin access required. Please contact the administrator to get admin access.';
      } else if (errorParam === 'unexpected_error') {
        errorMessage = 'An unexpected error occurred during authentication. Please try again.';
      }
      
      if (detailsParam) {
        errorMessage += ' (' + detailsParam + ')';
      }
      
      setError(errorMessage);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGoogleLogin = async () => {
    if (!isClient) return;
    
    console.log('handleGoogleLogin called');
    setIsGoogleLoading(true);
    setError('');

    try {
      // Import Supabase dynamically only on client side
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        setError('Missing Supabase environment variables');
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const redirectUrl = window.location.origin + '/auth/callback?next=/app';
      
      console.log('Starting Google OAuth with redirectTo:', redirectUrl);
      console.log('Supabase URL:', supabaseUrl);
      console.log('Supabase Key exists:', !!supabaseKey);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`
        }
      });

      if (error) {
        console.error('Google OAuth error:', error);
        setError('Google authentication failed. Please try again. (' + error.message + ')');
      } else {
        console.log('OAuth initiated successfully:', data);
      }
    } catch (error) {
      console.error('Google login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError('Google authentication failed. Please try again. (' + errorMessage + ')');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !isClient) return;

    setIsLoading(true);
    setError('');

    try {
      // Import Supabase dynamically only on client side
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        setError('Missing Supabase environment variables');
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const redirectUrl = window.location.origin + '/app';
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        setError(error.message);
      } else {
        setIsSuccess(true);
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render until client-side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">SignalsLoop</span>
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isSuccess && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  Check your email for the magic link!
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm"
              size="lg"
            >
              {isGoogleLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="h-11"
                />
              </div>
              
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending magic link...
                  </>
                ) : (
                  'Send Magic Link'
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-600 mb-2">Debug Info:</p>
              <div className="space-y-1 text-xs text-gray-500">
                <p>Origin: {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</p>
                <p>Redirect URL: {typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : 'N/A'}</p>
                <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}</p>
                <p>Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}</p>
                <p>Client Side: {isClient ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}