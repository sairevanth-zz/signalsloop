import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase environment variables' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if users table exists by trying to query it
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    const usersTableExists = !usersError || usersError.code !== 'PGRST116';
    
    // Check users table structure by trying to select specific columns
    const { data: columnsData, error: columnsError } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url, google_id, provider, created_at, updated_at')
      .limit(0);
    
    const columnsExist = !columnsError || columnsError.code !== 'PGRST116';
    
    // Try to count users
    const { data: userCount, error: userCountError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    // Check auth.users count
    const { data: authUserCount, error: authUserCountError } = await supabase.auth.admin.listUsers();
    
    return NextResponse.json({
      usersTable: {
        exists: usersTableExists,
        error: usersError?.message,
        data: usersData
      },
      columns: {
        exist: columnsExist,
        error: columnsError?.message,
        data: columnsData
      },
      userCount: {
        data: userCount,
        error: userCountError?.message
      },
      authUserCount: {
        data: authUserCount?.users?.length || 0,
        error: authUserCountError?.message
      },
      environment: {
        supabaseUrl: supabaseUrl ? 'Set' : 'Missing',
        supabaseKey: supabaseKey ? 'Set' : 'Missing'
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to debug database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
