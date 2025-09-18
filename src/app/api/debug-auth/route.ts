import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!;

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    // Use anon key for auth operations
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    // Use service key for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Debug: Exchanging code for session...');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Debug: Auth error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      });
    }

    if (data.user) {
      console.log('Debug: User authenticated:', data.user.email);
      console.log('Debug: User data:', {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
        raw_user_meta_data: data.user.raw_user_meta_data,
        app_metadata: data.user.app_metadata,
        aud: data.user.aud,
        role: data.user.role
      });

      // Check if user record exists
      const { data: userRecord, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return NextResponse.json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at,
          raw_user_meta_data: data.user.raw_user_meta_data,
          app_metadata: data.user.app_metadata
        },
        userRecord: userRecord || null,
        userRecordError: userError?.message || null,
        isNewUser: (Date.now() - new Date(data.user.created_at).getTime()) < 60000
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'No user data received' 
    });

  } catch (error) {
    console.error('Debug auth error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: String(error)
    }, { status: 500 });
  }
}
