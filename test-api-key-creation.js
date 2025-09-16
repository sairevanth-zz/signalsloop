const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing API Key Creation...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testApiKeyCreation() {
  try {
    console.log('\n📋 Checking existing projects...');
    
    // Get all projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (projectsError) {
      console.error('❌ Projects query failed:', projectsError);
      return;
    }
    
    console.log('✅ Found', projects.length, 'projects');
    
    if (projects.length === 0) {
      console.log('⚠️  No projects found. Create a project first.');
      return;
    }
    
    // Check API keys for each project
    for (const project of projects) {
      console.log(`\n📊 Checking API keys for project: ${project.name} (${project.slug})`);
      
      const { data: apiKeys, error: apiKeysError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('project_id', project.id);
      
      if (apiKeysError) {
        console.error(`❌ API keys query failed for ${project.name}:`, apiKeysError);
        continue;
      }
      
      console.log(`✅ Found ${apiKeys.length} API keys for ${project.name}`);
      
      if (apiKeys.length === 0) {
        console.log(`⚠️  No API keys found for ${project.name}. Creating one...`);
        
        // Create an API key
        const newKey = 'sk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        const { data: newApiKey, error: createError } = await supabase
          .from('api_keys')
          .insert({
            project_id: project.id,
            name: 'Default Widget Key',
            key_hash: btoa(newKey),
            usage_count: 0
          })
          .select()
          .single();
        
        if (createError) {
          console.error(`❌ Failed to create API key for ${project.name}:`, createError);
        } else {
          console.log(`✅ Created API key for ${project.name}:`, newApiKey.id);
          console.log(`   Widget code: <script src="https://signalsloop.vercel.app/embed/${newKey}.js"></script>`);
        }
      } else {
        // Show existing API keys
        for (const apiKey of apiKeys) {
          const decodedKey = atob(apiKey.key_hash);
          console.log(`   📝 API Key: ${apiKey.name} (${apiKey.id})`);
          console.log(`   🔗 Widget code: <script src="https://signalsloop.vercel.app/embed/${decodedKey}.js"></script>`);
        }
      }
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testApiKeyCreation();
