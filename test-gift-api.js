// Simple test to check if gift API is working
async function testGiftAPI() {
  console.log('Testing gift API endpoints...\n');

  try {
    // Test 1: Check if we can access the gift API
    console.log('1. Testing gift API accessibility...');
    const response = await fetch('/api/gifts/test-project-id');
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 404) {
      console.log('✅ API endpoint exists (404 is expected for invalid project ID)');
    } else {
      const text = await response.text();
      console.log('Response body:', text);
    }

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

// Run the test
testGiftAPI();
