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
    
    // Check if users table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'users');
    
    // Check users table structure
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'users');
    
    // Check if trigger exists
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, action_statement')
      .eq('trigger_schema', 'public')
      .eq('trigger_name', 'on_auth_user_created');
    
    // Check RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, permissive, roles, cmd, qual')
      .eq('tablename', 'users');
    
    // Try to count users
    const { data: userCount, error: userCountError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    // Check auth.users count
    const { data: authUserCount, error: authUserCountError } = await supabase.auth.admin.listUsers();
    
    return NextResponse.json({
      tables: {
        data: tables,
        error: tablesError?.message
      },
      columns: {
        data: columns,
        error: columnsError?.message
      },
      triggers: {
        data: triggers,
        error: triggersError?.message
      },
      policies: {
        data: policies,
        error: policiesError?.message
      },
      userCount: {
        data: userCount,
        error: userCountError?.message
      },
      authUserCount: {
        data: authUserCount?.users?.length || 0,
        error: authUserCountError?.message
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to debug database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
