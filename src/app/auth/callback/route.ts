import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  console.log('Auth callback called with code:', code ? 'present' : 'missing');
  console.log('Full URL:', requestUrl.toString());

  if (code) {
    // Redirect to client page which will force production URL
    const redirectUrl = new URL('/auth/callback/client', requestUrl.origin);
    redirectUrl.searchParams.set('auth_code', code);
    
    console.log('Redirecting to client page with auth code');
    return NextResponse.redirect(redirectUrl.toString());
  }

  // No code parameter - this might be a hash-based flow
  // Redirect to client page which will force production URL
  console.log('No code found, redirecting to client page for processing');
  const redirectUrl = new URL('/auth/callback/client', requestUrl.origin);
  redirectUrl.hash = requestUrl.hash; // Pass the hash (access_token) to the client
  redirectUrl.search = requestUrl.search; // Pass any search params
  return NextResponse.redirect(redirectUrl.toString());
}
