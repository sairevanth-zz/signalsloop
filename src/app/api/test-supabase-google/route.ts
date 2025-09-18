import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    if (!supabase) {
      return NextResponse.json({
        error: 'Supabase client not available'
      }, { status: 500 });
    }

    // Test basic Supabase connection and try to get user session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    // Check environment variables
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE,
      hasGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.substring(0, 20) + '...'
    };
    
    return NextResponse.json({
      success: true,
      environment: envCheck,
      supabase: {
        connected: !sessionError,
        error: sessionError?.message || null,
        hasSession: !!sessionData.session
      },
      recommendations: [
        '1. Go to Supabase Dashboard → Authentication → Providers',
        '2. Enable Google provider and add your Client ID and Client Secret',
        '3. Set redirect URL to: https://signalsloop.vercel.app/auth/callback',
        '4. Verify Google Cloud Console has correct redirect URIs',
        '5. Make sure Google provider is not disabled in Supabase'
      ],
      nextSteps: [
        'Check Supabase Dashboard for Google provider configuration',
        'Verify Google Client Secret is added to Supabase (not just Client ID)',
        'Ensure redirect URIs match between Google Cloud Console and Supabase'
      ]
    });

  } catch (error) {
    console.error('Supabase Google test error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: String(error)
    }, { status: 500 });
  }
}
