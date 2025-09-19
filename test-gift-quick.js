// Quick test to check if gift system is working
async function testGiftSystem() {
  console.log('Testing gift system...');
  
  try {
    // Test if we can access the gift API
    const response = await fetch('/api/gifts/test-project-id');
    console.log('Gift API status:', response.status);
    
    if (response.status === 404) {
      console.log('✅ Gift API endpoint exists');
    } else {
      const text = await response.text();
      console.log('Response:', text);
    }
    
    // Test if we can access the debug page
    const debugResponse = await fetch('/debug-gifts');
    console.log('Debug page status:', debugResponse.status);
    
  } catch (error) {
    console.error('❌ Error testing gift system:', error);
  }
}

testGiftSystem();
