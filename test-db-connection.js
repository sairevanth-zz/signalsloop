const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Database Connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n📊 Testing basic connection...');
    
    // Test 1: Basic connection
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error);
      return;
    }
    
    console.log('✅ Connection successful');
    
    // Test 2: Check projects table
    console.log('\n📋 Testing projects table...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(5);
    
    if (projectsError) {
      console.error('❌ Projects query failed:', projectsError);
    } else {
      console.log('✅ Projects query successful');
      console.log('Found', projects.length, 'projects');
    }
    
    // Test 3: Check boards table
    console.log('\n📋 Testing boards table...');
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select('*')
      .limit(5);
    
    if (boardsError) {
      console.error('❌ Boards query failed:', boardsError);
    } else {
      console.log('✅ Boards query successful');
      console.log('Found', boards.length, 'boards');
    }
    
    // Test 4: Check posts table
    console.log('\n📋 Testing posts table...');
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .limit(5);
    
    if (postsError) {
      console.error('❌ Posts query failed:', postsError);
    } else {
      console.log('✅ Posts query successful');
      console.log('Found', posts.length, 'posts');
    }
    
    // Test 5: Check votes table
    console.log('\n📋 Testing votes table...');
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('*')
      .limit(5);
    
    if (votesError) {
      console.error('❌ Votes query failed:', votesError);
    } else {
      console.log('✅ Votes query successful');
      console.log('Found', votes.length, 'votes');
    }
    
    // Test 6: Try to insert a test project
    console.log('\n🧪 Testing project creation...');
    const testProject = {
      name: 'Test Project ' + Date.now(),
      slug: 'test-' + Date.now(),
      owner_id: null // Anonymous
    };
    
    const { data: newProject, error: insertError } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Project creation failed:', insertError);
    } else {
      console.log('✅ Project creation successful:', newProject.id);
      
      // Clean up test project
      await supabase.from('projects').delete().eq('id', newProject.id);
      console.log('🧹 Test project cleaned up');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testConnection();
