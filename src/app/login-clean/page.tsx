'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';

export default function CleanLoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Check for OAuth errors in URL params
  useEffect(() => {
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
        errorMessage = errorMessage + ' (' + detailsParam + ')';
      }
      
      setError(errorMessage);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  
  const supabase = getSupabaseClient();

  const handleGoogleLogin = async () => {
    console.log('handleGoogleLogin called');
    
    if (!supabase) {
      console.error('Supabase client not available');
      setError('Authentication service not available. Please refresh the page.');
      return;
    }

    setIsGoogleLoading(true);
    setError('');

    try {
      const redirectUrl = window.location.origin + '/auth/callback?next=/app';
      console.log('Starting Google OAuth with redirectTo:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Google OAuth error:', error);
        setError('Google authentication failed. Please try again. (' + error.message + ')');
        toast.error('Google login failed');
      } else {
        console.log('OAuth initiated successfully:', data);
        toast.success('Redirecting to Google...');
      }
    } catch (error) {
      console.error('Google login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError('Google authentication failed. Please try again. (' + errorMessage + ')');
      toast.error('Google login failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError('');

    try {
      const redirectUrl = window.location.origin + '/app';
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        setError(error.message);
        toast.error('Failed to send magic link');
      } else {
        setIsSuccess(true);
        toast.success('Magic link sent! Check your email.');
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
      toast.error('Failed to send magic link');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  Check your email
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  We've sent a magic link to <strong>{email}</strong>
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Click the link in the email to sign in.
                </p>
                <Button
                  onClick={() => {
                    setIsSuccess(false);
                    setEmail('');
                  }}
                  variant="outline"
                  className="mt-4"
                >
                  Try a different email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your SignalsLoop account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in with magic link</CardTitle>
            <CardDescription>
              No password needed. We'll send you a secure link to sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="mt-1"
                />
              </div>

              {error && (
                <Alert>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send magic link
                  </>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="w-full"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </div>
            
            <div className="mt-6 text-center text-sm text-gray-600">
              <p>
                New to SignalsLoop?{' '}
                <span className="font-medium">Just enter your email above</span> to create an account.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6 space-y-2">
          <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to homepage
          </Link>
          <div className="space-y-1">
            <Link href="/auth-debug" className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors text-sm">
              🔧 Authentication Debug Tool
            </Link>
            <div className="text-xs text-gray-500">
              Debug Info: Redirect URL: {typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : 'Unknown'}
            </div>
          </div>
        </div>
        
        <div className="text-center mt-8 text-xs text-gray-500">
          <p>
            By signing in, you agree to our{' '}
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
