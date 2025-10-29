import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DEMO_BOARD_ID = '00000000-0000-0000-0000-000000000001';

async function clearAndSeed() {
  try {
    console.log('🗑️  Clearing existing demo posts...');

    // Delete all existing demo posts
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('board_id', DEMO_BOARD_ID);

    if (deleteError) {
      console.error('Error deleting demo posts:', deleteError);
      return;
    }

    console.log('✅ Demo posts cleared!');
    console.log('🌱 Running seed script...');

    // Run the seed script
    execSync('npm run seed-demo', { stdio: 'inherit' });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearAndSeed();
