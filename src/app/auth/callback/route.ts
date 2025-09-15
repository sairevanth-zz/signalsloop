import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  console.log('Auth callback called with code:', code ? 'present' : 'missing');

  if (code) {
    // Redirect to app with the code - let the client handle the auth exchange
    const redirectUrl = new URL('/app', requestUrl.origin);
    redirectUrl.searchParams.set('auth_code', code);
    
    console.log('Redirecting to app with auth code');
    return NextResponse.redirect(redirectUrl.toString());
  }

  // No code parameter, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/login?error=no_code`);
}
