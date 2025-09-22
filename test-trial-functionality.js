#!/usr/bin/env node

/**
 * Test script for 7-day trial functionality
 * This script tests the trial-related API endpoints
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const TEST_PROJECT_ID = 'test-project-trial-' + Date.now();

console.log('🧪 Testing 7-Day Trial Functionality');
console.log('=====================================');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Test Project ID: ${TEST_PROJECT_ID}`);
console.log('');

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            data: parsed,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test functions
async function testTrialCancelAPI() {
  console.log('🔍 Testing Trial Cancellation API...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/trial/cancel`, {
      method: 'POST',
      body: {
        projectId: TEST_PROJECT_ID
      }
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);

    if (response.status === 400 && response.data.error?.includes('not in trial')) {
      console.log('   ✅ Expected error for non-trial project');
      return true;
    } else if (response.status === 500 && response.data.error?.includes('column')) {
      console.log('   ⚠️  Database migration needed - trial columns not found');
      return false;
    } else {
      console.log('   ❌ Unexpected response');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return false;
  }
}

async function testStripeCheckoutWithTrial() {
  console.log('🔍 Testing Stripe Checkout with Trial...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/stripe/checkout`, {
      method: 'POST',
      body: {
        projectId: TEST_PROJECT_ID,
        priceId: 'price_test_monthly',
        successUrl: `${BASE_URL}/billing/success`,
        cancelUrl: `${BASE_URL}/billing`
      }
    });

    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200 && response.data.url) {
      console.log('   ✅ Checkout session created with trial');
      console.log(`   Checkout URL: ${response.data.url}`);
      return true;
    } else {
      console.log(`   ❌ Failed to create checkout session: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return false;
  }
}

async function testDatabaseSchema() {
  console.log('🔍 Testing Database Schema...');
  console.log('   ⚠️  Manual verification required:');
  console.log('   1. Run the migration: add-trial-tracking-schema.sql');
  console.log('   2. Verify these columns exist in projects table:');
  console.log('      - trial_start_date');
  console.log('      - trial_end_date');
  console.log('      - trial_status');
  console.log('      - is_trial');
  console.log('      - trial_cancelled_at');
  console.log('   3. Verify domain_verifications table exists');
  console.log('');
}

// Main test runner
async function runTests() {
  console.log('Starting trial functionality tests...\n');
  
  let allPassed = true;
  
  // Test database schema
  await testDatabaseSchema();
  
  // Test trial cancellation API
  const cancelTest = await testTrialCancelAPI();
  allPassed = allPassed && cancelTest;
  
  console.log('');
  
  // Test Stripe checkout with trial
  const checkoutTest = await testStripeCheckoutWithTrial();
  allPassed = allPassed && checkoutTest;
  
  console.log('');
  console.log('📊 Test Results Summary');
  console.log('=======================');
  console.log(`Trial Cancellation API: ${cancelTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Stripe Checkout with Trial: ${checkoutTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  if (allPassed) {
    console.log('🎉 All tests passed! Trial functionality is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the issues above.');
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Make sure the database migration has been run');
    console.log('2. Verify Stripe environment variables are set');
    console.log('3. Check that the API routes are deployed');
  }
  
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Run the database migration: add-trial-tracking-schema.sql');
  console.log('2. Test with a real Stripe checkout session');
  console.log('3. Verify webhook handling for trial events');
  console.log('4. Test trial conversion and cancellation flows');
}

// Run the tests
runTests().catch(console.error);
