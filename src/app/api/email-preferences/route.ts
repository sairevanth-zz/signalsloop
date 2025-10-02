import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

// GET - Fetch email preferences by token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const { data: preferences, error } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('unsubscribe_token', token)
      .single();

    if (error || !preferences) {
      console.error('Error fetching preferences:', error);
      return NextResponse.json({ error: 'Preferences not found' }, { status: 404 });
    }

    return NextResponse.json({
      preferences: {
        status_change_emails: preferences.status_change_emails,
        comment_reply_emails: preferences.comment_reply_emails,
        vote_milestone_emails: preferences.vote_milestone_emails,
        weekly_digest: preferences.weekly_digest,
        mention_emails: preferences.mention_emails,
      },
      email: preferences.email,
    });
  } catch (error) {
    console.error('Error in GET /api/email-preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Update email preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, action, preferences } = body;

    if (!token || !action) {
      return NextResponse.json({ error: 'Token and action are required' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Find the preference record
    const { data: existingPrefs, error: fetchError } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('unsubscribe_token', token)
      .single();

    if (fetchError || !existingPrefs) {
      console.error('Error fetching preferences:', fetchError);
      return NextResponse.json({ error: 'Preferences not found' }, { status: 404 });
    }

    if (action === 'unsubscribe_all') {
      // Unsubscribe from all emails
      const { error: updateError } = await supabase
        .from('email_preferences')
        .update({
          status_change_emails: false,
          comment_reply_emails: false,
          vote_milestone_emails: false,
          weekly_digest: false,
          mention_emails: false,
          unsubscribed_at: new Date().toISOString(),
        })
        .eq('unsubscribe_token', token);

      if (updateError) {
        console.error('Error unsubscribing:', updateError);
        return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Unsubscribed from all emails' });
    }

    if (action === 'update') {
      if (!preferences) {
        return NextResponse.json({ error: 'Preferences are required for update action' }, { status: 400 });
      }

      // Update specific preferences
      const { error: updateError } = await supabase
        .from('email_preferences')
        .update({
          status_change_emails: preferences.status_change_emails,
          comment_reply_emails: preferences.comment_reply_emails,
          vote_milestone_emails: preferences.vote_milestone_emails,
          weekly_digest: preferences.weekly_digest,
          mention_emails: preferences.mention_emails,
          unsubscribed_at: null, // Re-enable if they update preferences
        })
        .eq('unsubscribe_token', token);

      if (updateError) {
        console.error('Error updating preferences:', updateError);
        return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Preferences updated successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/email-preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

