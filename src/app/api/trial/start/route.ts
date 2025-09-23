import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    throw new Error('Supabase configuration is missing');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
  );
};

export async function POST(request: NextRequest) {
  try {
    const { email, billingType } = await request.json();

    if (!email || !billingType) {
      return NextResponse.json({ error: 'Email and billing type are required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Find user by email
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .limit(1);

    if (userError || !users || users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Find user's primary project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1);

    if (projectError || !projects || projects.length === 0) {
      return NextResponse.json({ error: 'No project found for user' }, { status: 404 });
    }

    const project = projects[0];

    // Check if user already has an active trial or subscription
    if (project.is_trial || project.plan === 'pro') {
      return NextResponse.json({ error: 'User already has an active trial or subscription' }, { status: 400 });
    }

    // Start trial - set trial status and dates
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        plan: 'pro',
        trial_start_date: trialStartDate.toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        trial_status: 'active',
        is_trial: true,
        subscription_status: 'trialing'
      })
      .eq('id', project.id);

    if (updateError) {
      console.error('Error starting trial:', updateError);
      return NextResponse.json({ error: 'Failed to start trial' }, { status: 500 });
    }

    // Log trial started event
    await supabase
      .from('billing_events')
      .insert({
        user_id: user.id,
        project_id: project.id,
        event_type: 'trial_started',
        amount: 0,
        currency: 'usd',
        metadata: {
          trial_days: 7,
          billing_type: billingType,
          source: 'homepage'
        }
      });

    return NextResponse.json({ 
      success: true, 
      message: 'Trial started successfully',
      trial_end_date: trialEndDate.toISOString(),
      project_id: project.id
    });

  } catch (error) {
    console.error('Trial start error:', error);
    return NextResponse.json({ error: 'Failed to start trial' }, { status: 500 });
  }
}
