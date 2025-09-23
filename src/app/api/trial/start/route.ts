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

    // Find or create user by email
    let { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .limit(1);

    let user;

    if (userError || !users || users.length === 0) {
      // Create user if they don't exist
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          email: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id, email')
        .single();

      if (createUserError || !newUser) {
        console.error('Error creating user:', createUserError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      user = newUser;
    } else {
      user = users[0];
    }

    // Find user's primary project
    let { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1);

    let project;

    if (projectError || !projects || projects.length === 0) {
      // Create a default project if none exists
      const { data: newProject, error: createProjectError } = await supabase
        .from('projects')
        .insert({
          owner_id: user.id,
          name: 'My Project',
          slug: `project-${Date.now()}`,
          description: 'Default project created for trial',
          plan: 'free',
          subscription_status: 'none',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (createProjectError || !newProject) {
        console.error('Error creating project:', createProjectError);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
      }

      project = newProject;
    } else {
      project = projects[0];
    }

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

    console.log('Trial started successfully for user:', user.email, 'project:', project.id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Trial started successfully',
      trial_end_date: trialEndDate.toISOString(),
      project_id: project.id,
      user_id: user.id
    });

  } catch (error) {
    console.error('Trial start error:', error);
    return NextResponse.json({ error: 'Failed to start trial' }, { status: 500 });
  }
}
