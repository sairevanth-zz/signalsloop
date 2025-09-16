'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackClient() {
  const router = useRouter();

  useEffect(() => {
    // Force redirect to production URL regardless of what Supabase sends
    const isProduction = window.location.hostname === 'signalsloop.vercel.app';
    
    if (isProduction) {
      // We're already on production, just redirect to app
      const hash = window.location.hash;
      const searchParams = window.location.search;
      
      let redirectUrl = 'https://signalsloop.vercel.app/app';
      
      if (searchParams.includes('code=')) {
        // Code-based flow
        redirectUrl += searchParams;
      } else if (hash.includes('access_token')) {
        // Hash-based flow
        redirectUrl += hash;
      }
      
      console.log('Auth callback client redirecting to:', redirectUrl);
      window.location.href = redirectUrl;
    } else {
      // We're on localhost, force redirect to production
      const hash = window.location.hash;
      const searchParams = window.location.search;
      
      let redirectUrl = 'https://signalsloop.vercel.app/app';
      
      if (searchParams.includes('code=')) {
        redirectUrl += searchParams;
      } else if (hash.includes('access_token')) {
        redirectUrl += hash;
      }
      
      console.log('Force redirecting from localhost to production:', redirectUrl);
      window.location.href = redirectUrl;
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to SignalLoop...</p>
      </div>
    </div>
  );
}
