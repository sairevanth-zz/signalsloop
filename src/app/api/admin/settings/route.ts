import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

// GET - Fetch admin settings
export async function GET(request: NextRequest) {
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
    console.error('Admin settings API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Update admin settings
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const body = await request.json();

    // Try to update existing settings, or insert if not exists
    const { data: existing } = await supabase
      .from('admin_settings')
      .select('id')
      .single();

    if (existing) {
      // Update
      const { error } = await supabase
        .from('admin_settings')
        .update(body)
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
      }
    } else {
      // Insert
      const { error } = await supabase
        .from('admin_settings')
        .insert(body);

      if (error) {
        console.error('Error creating settings:', error);
        return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 });
      }
    }

    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Admin update settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

