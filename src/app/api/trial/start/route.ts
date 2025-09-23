import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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

    // Find or create user by email using Supabase Auth
    let { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    let user = null;
    
    if (!userError && users?.users) {
      user = users.users.find(u => u.email === email);
    }

    if (!user) {
      // Create user using Supabase Auth Admin API
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          source: 'trial_signup'
        }
      });

      if (createUserError || !newUser?.user) {
        console.error('Error creating user:', createUserError);
        return NextResponse.json({ error: 'Failed to create user', details: createUserError }, { status: 500 });
      }

      user = newUser.user;
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
          plan: 'free',
          subscription_status: 'trialing'
        })
        .select('*')
        .single();

      if (createProjectError || !newProject) {
        console.error('Error creating project:', createProjectError);
        console.error('Project data attempted:', { owner_id: user.id, name: 'My Project', slug: `project-${Date.now()}` });
        return NextResponse.json({ error: 'Failed to create project', details: createProjectError }, { status: 500 });
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
