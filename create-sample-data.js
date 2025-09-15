// Create sample data for existing project
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createSampleData() {
  try {
    console.log('🔍 Checking existing projects...');
    
    // Get existing projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*');
    
    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError.message);
      return;
    }
    
    console.log(`📁 Found ${projects.length} existing projects:`);
    projects.forEach(project => {
      console.log(`  - ${project.name} (${project.slug})`);
    });
    
    // Use the first project or create test-project
    let project = projects.find(p => p.slug === 'test-project') || projects[0];
    
    if (!project) {
      console.log('🎯 Creating new test project...');
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: 'Test Project',
          slug: 'test-project'
        })
        .select()
        .single();
      
      if (projectError) {
        console.error('❌ Error creating project:', projectError.message);
        return;
      }
      
      project = newProject;
      console.log('✅ Created project:', project.slug);
    }
    
    // Check if board exists
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select('*')
      .eq('project_id', project.id);
    
    if (boardsError) {
      console.error('❌ Error fetching boards:', boardsError.message);
      return;
    }
    
    let board = boards[0];
    
    if (!board) {
      console.log('🎯 Creating board...');
      const { data: newBoard, error: boardError } = await supabase
        .from('boards')
        .insert({
          project_id: project.id,
          name: 'General'
        })
        .select()
        .single();
      
      if (boardError) {
        console.error('❌ Error creating board:', boardError.message);
        return;
      }
      
      board = newBoard;
      console.log('✅ Created board:', board.name);
    } else {
      console.log('✅ Board already exists:', board.name);
    }
    
    // Check if posts exist
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('board_id', board.id);
    
    if (postsError) {
      console.error('❌ Error fetching posts:', postsError.message);
      return;
    }
    
    if (posts.length === 0) {
      console.log('🎯 Creating sample posts...');
      
      const samplePosts = [
        {
          project_id: project.id,
          board_id: board.id,
          title: 'Welcome to SignalLoop! 🎉',
          description: 'This is a sample post to test the functionality. You can vote on this post and add comments below. Try clicking the vote button and adding a comment!',
          author_email: 'demo@signalLoop.com',
          status: 'open'
        },
        {
          project_id: project.id,
          board_id: board.id,
          title: 'Dark mode support requested',
          description: 'Many users have requested dark mode support for the application. This would be a great addition to improve user experience.',
          author_email: 'user@example.com',
          status: 'open'
        },
        {
          project_id: project.id,
          board_id: board.id,
          title: 'Mobile app for iOS and Android',
          description: 'It would be great to have native mobile apps for both iOS and Android platforms. This would make the app more accessible to users on mobile devices.',
          author_email: 'mobile@example.com',
          status: 'planned'
        }
      ];
      
      for (const postData of samplePosts) {
        const { data: post, error: postError } = await supabase
          .from('posts')
          .insert(postData)
          .select()
          .single();
        
        if (postError) {
          console.error('❌ Error creating post:', postError.message);
        } else {
          console.log('✅ Created post:', post.title);
        }
      }
    } else {
      console.log(`✅ ${posts.length} posts already exist`);
    }
    
    console.log('\n🎉 Sample data setup complete!');
    console.log(`🚀 Test your app at: http://localhost:3000/${project.slug}/board`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createSampleData();
