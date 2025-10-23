import { NextResponse } from 'next/server';
import { secureAPI, validateAdminAuth } from '@/lib/api-security';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export const GET = secureAPI(
  async () => {
    try {
    const supabase = getSupabaseServiceRoleClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Check if admin_settings table exists, if not return defaults
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Return defaults if no settings found
    const defaultSettings = {
      maintenance_mode: false,
      signup_enabled: true,
      trial_days: 14,
      max_projects_free: 3,
      max_posts_free: 100,
      ai_features_enabled: true,
      stripe_enabled: true,
      email_notifications: true,
      default_plan: 'free',
    };

    return NextResponse.json({ settings: settings || defaultSettings });
    } catch (error) {
      console.error('Admin API error:', error);
      return NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
  }
);
