const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Debugging Magic Link Configuration...');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMagicLink() {
  try {
    console.log('\n📧 Testing magic link configuration...');
    
    // Test sending a magic link
    const testEmail = 'test@example.com';
    const redirectUrl = 'https://signalsloop.vercel.app/auth/callback';
    
    console.log('Sending magic link to:', testEmail);
    console.log('With redirect URL:', redirectUrl);
    
    const { data, error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) {
      console.error('❌ Magic link error:', error);
    } else {
      console.log('✅ Magic link sent successfully');
      console.log('Response data:', data);
    }
    
    // Check auth configuration
    console.log('\n🔧 Checking auth configuration...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Auth session error:', authError);
    } else {
      console.log('✅ Auth session check passed');
      console.log('Session data:', authData);
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testMagicLink();
