// Debug script to check what data is being returned
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBoardData() {
  try {
    console.log('🔍 Debugging board data for test-project...');
    
    // Get project by slug
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('slug', 'test-project')
      .single();
    
    if (projectError) {
      console.error('❌ Project error:', projectError);
      return;
    }
    
    console.log('✅ Project found:', project);
    
    // Get board
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('*')
      .eq('project_id', project.id)
      .single();
    
    if (boardError) {
      console.error('❌ Board error:', boardError);
      return;
    }
    
    console.log('✅ Board found:', board);
    
    // Get posts with the exact same query as the app
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        vote_count:votes(count),
        comment_count:comments(count)
      `)
      .eq('board_id', board.id)
      .is('duplicate_of', null);
    
    if (postsError) {
      console.error('❌ Posts error:', postsError);
      return;
    }
    
    console.log('✅ Posts found:', posts.length);
    console.log('📝 Posts data:', JSON.stringify(posts, null, 2));
    
    // Test vote count query separately
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('post_id, count(*)')
      .in('post_id', posts.map(p => p.id));
    
    if (votesError) {
      console.error('❌ Votes error:', votesError);
    } else {
      console.log('✅ Votes data:', votes);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugBoardData();
