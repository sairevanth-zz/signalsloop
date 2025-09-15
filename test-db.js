// Simple database test script
// Run with: node test-db.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure .env.local contains:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=...');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=...');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test 1: Check if tables exist
    console.log('\n📋 Checking tables...');
    
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('count', { count: 'exact', head: true });
    
    if (projectsError) {
      console.error('❌ Projects table error:', projectsError.message);
      return;
    }
    
    console.log('✅ Projects table exists');
    
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select('count', { count: 'exact', head: true });
    
    if (boardsError) {
      console.error('❌ Boards table error:', boardsError.message);
      return;
    }
    
    console.log('✅ Boards table exists');
    
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('count', { count: 'exact', head: true });
    
    if (postsError) {
      console.error('❌ Posts table error:', postsError.message);
      return;
    }
    
    console.log('✅ Posts table exists');
    
    // Test 2: Check current data
    console.log('\n📊 Current data:');
    
    const { count: projectsCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });
    
    const { count: boardsCount } = await supabase
      .from('boards')
      .select('*', { count: 'exact', head: true });
    
    const { count: postsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📁 Projects: ${projectsCount || 0}`);
    console.log(`📋 Boards: ${boardsCount || 0}`);
    console.log(`📝 Posts: ${postsCount || 0}`);
    
    // Test 3: Create sample data if empty
    if (projectsCount === 0) {
      console.log('\n🎯 Creating sample data...');
      
      // Create a test project (without owner_id for anonymous user)
      const { data: testProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: 'Test Project',
          slug: 'test-project'
          // No owner_id - let it be null for anonymous
        })
        .select()
        .single();
      
      if (projectError) {
        console.error('❌ Error creating test project:', projectError.message);
        return;
      }
      
      console.log('✅ Created test project:', testProject.slug);
      
      // Create a test board
      const { data: testBoard, error: boardError } = await supabase
        .from('boards')
        .insert({
          project_id: testProject.id,
          name: 'General'
        })
        .select()
        .single();
      
      if (boardError) {
        console.error('❌ Error creating test board:', boardError.message);
        return;
      }
      
      console.log('✅ Created test board:', testBoard.name);
      
      // Create a test post
      const { data: testPost, error: postError } = await supabase
        .from('posts')
        .insert({
          project_id: testProject.id,
          board_id: testBoard.id,
          title: 'Welcome to SignalLoop!',
          description: 'This is a sample post to test the functionality. You can vote on this post and add comments.',
          author_email: 'test@example.com',
          status: 'open'
        })
        .select()
        .single();
      
      if (postError) {
        console.error('❌ Error creating test post:', postError.message);
        return;
      }
      
      console.log('✅ Created test post:', testPost.title);
      
      console.log('\n🎉 Sample data created successfully!');
      console.log('You can now test the app at: http://localhost:3000/test-project/board');
      
    } else {
      console.log('\n✅ Database already has data - no sample data needed');
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

testDatabase();
