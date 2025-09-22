// Comprehensive fix for existing issues
// Run this script to fix board names and set up basic Stripe settings

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;

console.log('🔍 Environment check:');
console.log('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
console.log('  SUPABASE_SERVICE_ROLE:', supabaseServiceKey ? '✅ Found' : '❌ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('💡 Make sure your .env.local file contains:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
  console.log('   SUPABASE_SERVICE_ROLE=your_service_role_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAllIssues() {
  try {
    console.log('🔧 Starting comprehensive fix...\n');
    
    // 1. Fix board names
    console.log('1️⃣ Fixing board names...');
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select(`
        id,
        name,
        project_id,
        projects!inner(
          id,
          name,
          slug
        )
      `);

    if (boardsError) {
      console.error('❌ Error fetching boards:', boardsError);
    } else {
      console.log(`📋 Found ${boards.length} boards:`);
      
      for (const board of boards) {
        console.log(`- Board ID: ${board.id}`);
        console.log(`  Current name: "${board.name}"`);
        console.log(`  Project: "${board.projects.name}" (${board.projects.slug})`);
        
        // If board name is "General", update it to something more descriptive
        if (board.name === 'General') {
          const newName = `${board.projects.name} Feedback Board`;
          console.log(`  🔄 Updating to: "${newName}"`);
          
          const { error: updateError } = await supabase
            .from('boards')
            .update({ name: newName })
            .eq('id', board.id);
            
          if (updateError) {
            console.error(`  ❌ Failed to update board ${board.id}:`, updateError);
          } else {
            console.log(`  ✅ Successfully updated board ${board.id}`);
          }
        } else {
          console.log(`  ✅ Board name is already descriptive: "${board.name}"`);
        }
        console.log('');
      }
    }
    
    // 2. Check and fix Stripe settings
    console.log('2️⃣ Checking Stripe settings...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, slug');

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError);
    } else {
      console.log(`📋 Found ${projects.length} projects:`);
      
      for (const project of projects) {
        console.log(`- Project: "${project.name}" (${project.slug})`);
        
        // Check if Stripe settings exist for this project
        const { data: stripeSettings, error: stripeError } = await supabase
          .from('stripe_settings')
          .select('*')
          .eq('project_id', project.id)
          .single();
          
        if (stripeError && stripeError.code !== 'PGRST116') {
          console.error(`  ❌ Error checking Stripe settings:`, stripeError);
        } else if (!stripeSettings) {
          console.log(`  ⚠️  No Stripe settings found for project ${project.id}`);
          console.log(`  🔄 Creating basic Stripe settings...`);
          
          // Create basic Stripe settings
          const { error: createError } = await supabase
            .from('stripe_settings')
            .insert({
              project_id: project.id,
              configured: false,
              payment_method: 'checkout_link',
              test_mode: true,
              stripe_price_id: process.env.STRIPE_PRICE_ID || 'price_placeholder'
            });
            
          if (createError) {
            console.error(`  ❌ Failed to create Stripe settings:`, createError);
          } else {
            console.log(`  ✅ Created basic Stripe settings for project ${project.id}`);
          }
        } else {
          console.log(`  ✅ Stripe settings exist (configured: ${stripeSettings.configured})`);
        }
        console.log('');
      }
    }
    
    // 3. Check project plan status
    console.log('3️⃣ Checking project plan status...');
    const { data: projectPlans, error: plansError } = await supabase
      .from('projects')
      .select('id, name, slug, plan, stripe_customer_id, subscription_status');

    if (plansError) {
      console.error('❌ Error fetching project plans:', plansError);
    } else {
      console.log(`📋 Project plan status:`);
      
      for (const project of projectPlans) {
        console.log(`- Project: "${project.name}" (${project.slug})`);
        console.log(`  Plan: ${project.plan}`);
        console.log(`  Stripe Customer ID: ${project.stripe_customer_id || 'None'}`);
        console.log(`  Subscription Status: ${project.subscription_status || 'None'}`);
        console.log('');
      }
    }
    
    console.log('🎉 Comprehensive fix completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Check your board settings - board names should now be descriptive');
    console.log('2. Configure Stripe settings in your project settings if you want to use billing');
    console.log('3. Update your project plan to "pro" in the database if you have a paid subscription');
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

fixAllIssues();
