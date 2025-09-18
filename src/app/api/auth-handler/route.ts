import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing environment variables' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get all URL parameters
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    
    console.log('Auth handler called with params:', searchParams);
    
    // Check if we have auth parameters
    const hasAuthParams = searchParams.access_token || searchParams.refresh_token || searchParams.code;
    
    if (hasAuthParams) {
      console.log('Auth parameters found, processing...');
      
      // Try to get session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session) {
        console.log('Session established:', session.user.email);
        // Redirect to app with success
        return NextResponse.redirect(`${request.nextUrl.origin}/app?auth=success`);
      } else {
        console.log('Failed to establish session:', error?.message);
        return NextResponse.redirect(`${request.nextUrl.origin}/login?error=session_failed`);
      }
    }
    
    // No auth parameters, redirect to login
    console.log('No auth parameters, redirecting to login');
    return NextResponse.redirect(`${request.nextUrl.origin}/login`);
    
  } catch (error) {
    console.error('Auth handler error:', error);
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=handler_error`);
  }
}
