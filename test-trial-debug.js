require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('Testing database connection...');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE:', process.env.SUPABASE_SERVICE_ROLE ? 'Set' : 'Missing');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
  console.error('Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function testTrial() {
  try {
    console.log('\n1. Testing users table...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (userError) {
      console.error('Users table error:', userError);
      return;
    }
    console.log('✅ Users table accessible');

    console.log('\n2. Testing projects table...');
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    if (projectError) {
      console.error('Projects table error:', projectError);
      return;
    }
    console.log('✅ Projects table accessible');

    console.log('\n3. Testing trial columns...');
    const { data: trialTest, error: trialError } = await supabase
      .from('projects')
      .select('trial_start_date, trial_end_date, trial_status, is_trial')
      .limit(1);
    
    if (trialError) {
      console.error('❌ Trial columns missing:', trialError);
      console.log('\n🔧 You need to run the database migration:');
      console.log('Go to Supabase Dashboard → SQL Editor and run the trial migration script');
      return;
    }
    console.log('✅ Trial columns exist');

    console.log('\n4. Testing user creation...');
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: testEmail,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, email')
      .single();

    if (createError) {
      console.error('❌ User creation failed:', createError);
      return;
    }
    console.log('✅ User creation works:', newUser);

    console.log('\n5. Testing project creation...');
    const { data: newProject, error: projectCreateError } = await supabase
      .from('projects')
      .insert({
        owner_id: newUser.id,
        name: 'Test Project',
        slug: `test-project-${Date.now()}`,
        description: 'Test project',
        plan: 'free',
        subscription_status: 'none',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (projectCreateError) {
      console.error('❌ Project creation failed:', projectCreateError);
      return;
    }
    console.log('✅ Project creation works:', newProject.id);

    console.log('\n6. Testing trial update...');
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        plan: 'pro',
        trial_start_date: new Date().toISOString(),
        trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        trial_status: 'active',
        is_trial: true,
        subscription_status: 'trialing'
      })
      .eq('id', newProject.id);

    if (updateError) {
      console.error('❌ Trial update failed:', updateError);
      return;
    }
    console.log('✅ Trial update works');

    console.log('\n🎉 All tests passed! The trial system should work.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testTrial();
