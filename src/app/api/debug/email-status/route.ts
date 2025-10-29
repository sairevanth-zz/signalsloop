import { NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export async function GET() {
  try {
    const supabase = getSupabaseServiceRoleClient();

    // Check recent users and their welcome email status
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, welcome_email_sent_at, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Check projects with pro status and email flags
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, plan, subscription_status, pro_welcome_email_sent_at, cancellation_email_sent_at')
      .eq('plan', 'pro')
      .order('created_at', { ascending: false })
      .limit(10);

    // Check recent billing events
    const { data: billingEvents, error: eventsError } = await supabase
      .from('billing_events')
      .select('event_type, created_at, metadata')
      .in('event_type', ['subscription_created', 'subscription_canceled'])
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      users: users || [],
      usersError: usersError?.message || null,
      projects: projects || [],
      projectsError: projectsError?.message || null,
      billingEvents: billingEvents || [],
      eventsError: eventsError?.message || null,
      resendApiKeyPresent: !!process.env.RESEND_API_KEY,
      fromAddress: process.env.RESEND_FROM_ADDRESS || 'SignalsLoop <noreply@signalsloop.com>',
    });
  } catch (error) {
    console.error('Debug email status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
