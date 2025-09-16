import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  console.log('Auth callback called with code:', code ? 'present' : 'missing');
  console.log('Full URL:', requestUrl.toString());

  if (code) {
    // Redirect to app with auth code - always use production URL
    const redirectUrl = new URL('/app', 'https://signalsloop.vercel.app');
    redirectUrl.searchParams.set('auth_code', code);
    
    console.log('Redirecting to app with auth code');
    return NextResponse.redirect(redirectUrl.toString());
  }

  // No code parameter - this might be a hash-based flow
  // Redirect to app which can process the hash - always use production URL
  console.log('No code found, redirecting to app for hash processing');
  const redirectUrl = new URL('/app', 'https://signalsloop.vercel.app');
  redirectUrl.hash = requestUrl.hash; // Pass the hash (access_token) to the client
  return NextResponse.redirect(redirectUrl.toString());
}
