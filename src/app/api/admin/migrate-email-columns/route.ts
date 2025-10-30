import { NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export async function POST() {
  try {
    const supabase = getSupabaseServiceRoleClient();

    console.log('Adding email tracking columns to projects table...');

    // Add email tracking columns to projects table
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS pro_welcome_email_sent_at timestamptz,
        ADD COLUMN IF NOT EXISTS cancellation_email_sent_at timestamptz;
      `
    });

    if (alterError) {
      // Try direct SQL if RPC doesn't exist
      const queries = [
        'ALTER TABLE projects ADD COLUMN IF NOT EXISTS pro_welcome_email_sent_at timestamptz',
        'ALTER TABLE projects ADD COLUMN IF NOT EXISTS cancellation_email_sent_at timestamptz'
      ];

      for (const query of queries) {
        const { error } = await supabase.rpc('exec', { sql: query });
        if (error) {
          console.error('SQL execution error:', error);
          return NextResponse.json({
            success: false,
            error: error.message,
            note: 'Please run this SQL manually in Supabase SQL Editor',
            sql: queries.join(';\n')
          }, { status: 500 });
        }
      }
    }

    console.log('✅ Email tracking columns added successfully');

    // Verify columns exist
    const { data: projects, error: verifyError } = await supabase
      .from('projects')
      .select('id, pro_welcome_email_sent_at, cancellation_email_sent_at')
      .limit(1);

    if (verifyError) {
      return NextResponse.json({
        success: false,
        error: `Verification failed: ${verifyError.message}`,
        note: 'Columns may not have been added. Please run SQL manually.',
        sql: `
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS pro_welcome_email_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS cancellation_email_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_projects_pro_welcome_email
ON projects(pro_welcome_email_sent_at)
WHERE pro_welcome_email_sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_cancellation_email
ON projects(cancellation_email_sent_at)
WHERE cancellation_email_sent_at IS NOT NULL;
        `
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Email tracking columns added successfully',
      verified: true
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      note: 'Please run the SQL manually in Supabase SQL Editor',
      sql: `
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS pro_welcome_email_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS cancellation_email_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_projects_pro_welcome_email
ON projects(pro_welcome_email_sent_at)
WHERE pro_welcome_email_sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_cancellation_email
ON projects(cancellation_email_sent_at)
WHERE cancellation_email_sent_at IS NOT NULL;
      `
    }, { status: 500 });
  }
}
