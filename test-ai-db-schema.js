const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAISchema() {
  console.log('Checking AI features database schema...');
  
  try {
    // Check if priority_score column exists in posts table
    const { data: postsColumns, error: postsError } = await supabase
      .from('posts')
      .select('priority_score, priority_reason, ai_analyzed_at')
      .limit(1);
    
    if (postsError) {
      console.error('❌ Posts table missing AI columns:', postsError.message);
      console.log('💡 Run the add-ai-features-schema.sql file in Supabase SQL Editor');
      return false;
    }
    
    console.log('✅ Posts table has AI columns');
    
    // Check if post_similarities table exists
    const { data: similarities, error: similaritiesError } = await supabase
      .from('post_similarities')
      .select('id')
      .limit(1);
    
    if (similaritiesError) {
      console.error('❌ post_similarities table missing:', similaritiesError.message);
      console.log('💡 Run the add-ai-features-schema.sql file in Supabase SQL Editor');
      return false;
    }
    
    console.log('✅ post_similarities table exists');
    
    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment variables');
      return false;
    }
    
    console.log('✅ OpenAI API key configured');
    
    console.log('\n🎉 AI features database schema is ready!');
    return true;
    
  } catch (error) {
    console.error('Error checking schema:', error);
    return false;
  }
}

checkAISchema().then(success => {
  process.exit(success ? 0 : 1);
});
