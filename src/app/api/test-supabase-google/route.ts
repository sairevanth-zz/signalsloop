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

    // Test if we can get the Google provider configuration
    // This will help identify if the provider is properly configured
    const { data, error } = await supabase.auth.getProviders();
    
    return NextResponse.json({
      success: true,
      providers: data,
      error: error?.message || null,
      recommendations: [
        'Check that Google provider is enabled in Supabase Dashboard',
        'Verify Google Client ID and Client Secret are set in Supabase',
        'Ensure redirect URIs match between Google Cloud Console and Supabase',
        'Make sure the Google provider is not disabled in Supabase'
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
