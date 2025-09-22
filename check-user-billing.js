const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserBilling() {
  console.log('🔍 Checking user billing data...');

  try {
    // Get user by email (from the console logs)
    const userEmail = 'sai.chandupatla@gmail.com';
    
    // First, get the user from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return;
    }

    const user = authUsers.users.find(u => u.email === userEmail);
    if (!user) {
      console.error('User not found in auth.users');
      return;
    }

    console.log('👤 Found user:', {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    });

    // Check users table for plan information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
    } else {
      console.log('📋 User data from users table:', userData);
    }

    // Check projects owned by this user
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user.id);

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
    } else {
      console.log('📁 Projects owned by user:', projects);
    }

    // Check if there are any subscription records
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id);

    if (subError) {
      console.log('No subscriptions table or error:', subError.message);
    } else {
      console.log('💳 Subscriptions:', subscriptions);
    }

    // Check stripe_settings for any projects
    if (projects && projects.length > 0) {
      const { data: stripeSettings, error: stripeError } = await supabase
        .from('stripe_settings')
        .select('*')
        .in('project_id', projects.map(p => p.id));

      if (stripeError) {
        console.log('Stripe settings error:', stripeError.message);
      } else {
        console.log('💳 Stripe settings:', stripeSettings);
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkUserBilling();
