import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  console.log('Auth callback called with code:', code ? 'present' : 'missing');

  if (code) {
    // Redirect to auth test page for debugging
    const redirectUrl = new URL('/auth-test', requestUrl.origin);
    redirectUrl.searchParams.set('auth_code', code);
    
    console.log('Redirecting to auth-test with auth code');
    return NextResponse.redirect(redirectUrl.toString());
  }

  // No code parameter, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/login?error=no_code`);
}
