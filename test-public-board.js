// Test script to check public board access
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function testProjectLookup() {
  console.log('Testing project lookup for slug: demo');
  
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      slug,
      custom_domain,
      is_private,
      plan,
      created_at,
      settings
    `)
    .eq('slug', 'demo')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Project found:', project);
  }
}

testProjectLookup().catch(console.error);
