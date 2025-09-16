'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackClient() {
  const router = useRouter();

  useEffect(() => {
    // AGGRESSIVE FIX: Force redirect to production URL no matter what
    console.log('🚨 AUTH CALLBACK CLIENT - Current location:', window.location.href);
    console.log('🚨 AUTH CALLBACK CLIENT - Hostname:', window.location.hostname);
    
    // Always redirect to production app, regardless of current location
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
    
    console.log('🚨 AUTH CALLBACK CLIENT - Force redirecting to:', redirectUrl);
    
    // Use multiple methods to ensure redirect happens
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 100);
    
    setTimeout(() => {
      window.location.replace(redirectUrl);
    }, 200);
    
    setTimeout(() => {
      window.location.assign(redirectUrl);
    }, 300);
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
