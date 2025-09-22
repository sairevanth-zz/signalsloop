// Script to fix existing board names in the database
// Run this in your browser console or as a Node.js script

const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBoardNames() {
  try {
    console.log('🔍 Checking existing board names...');
    
    // Get all boards with their project info
    const { data: boards, error } = await supabase
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

    if (error) {
      console.error('❌ Error fetching boards:', error);
      return;
    }

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
    
    console.log('🎉 Board name fix completed!');
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

fixBoardNames();
