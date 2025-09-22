#!/usr/bin/env node

/**
 * Custom Domain Testing Script
 * 
 * This script helps test the custom domain functionality
 * Run with: node test-custom-domain.js
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const PROJECT_SLUG = process.env.PROJECT_SLUG || 'your-test-project';
const TEST_DOMAIN = process.env.TEST_DOMAIN || 'test-feedback.example.com';

console.log('🧪 Custom Domain Testing Script');
console.log('================================');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Project Slug: ${PROJECT_SLUG}`);
console.log(`Test Domain: ${TEST_DOMAIN}`);
console.log('');

// Test functions
async function testApiEndpoint(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Custom-Domain-Test-Script/1.0'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(result);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function logTest(name, passed, details = '') {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}`);
    if (details) {
      console.log(`   ${details}`);
    }
    console.log('');
    
    results.tests.push({ name, passed, details });
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  console.log('🔍 Testing Custom Domain API Endpoints...\n');

  // Test 1: Domain Status API
  try {
    const response = await testApiEndpoint(`/api/custom-domain/status?projectId=test-project-id`);
    const passed = response.status === 404 || response.status === 400; // Should return 404 or 400 for invalid project ID
    logTest(
      'Domain Status API - Invalid Project ID',
      passed,
      `Status: ${response.status} (Expected: 400 or 404)`
    );
  } catch (error) {
    logTest('Domain Status API - Invalid Project ID', false, `Error: ${error.message}`);
  }

  // Test 2: Domain Set API - Invalid Domain
  try {
    const response = await testApiEndpoint('/api/custom-domain/set', 'POST', {
      projectId: 'test-project-id',
      domain: 'invalid-domain'
    });
    const passed = response.status === 400;
    logTest(
      'Domain Set API - Invalid Domain Format',
      passed,
      `Status: ${response.status} (Expected: 400)`
    );
  } catch (error) {
    logTest('Domain Set API - Invalid Domain Format', false, `Error: ${error.message}`);
  }

  // Test 3: Domain Set API - Valid Domain Format
  try {
    const response = await testApiEndpoint('/api/custom-domain/set', 'POST', {
      projectId: 'test-project-id',
      domain: TEST_DOMAIN
    });
    const passed = response.status === 500 || response.status === 404; // Should fail due to non-existent project
    logTest(
      'Domain Set API - Valid Domain Format',
      passed,
      `Status: ${response.status} (Expected: 500 or 404 - non-existent project)`
    );
  } catch (error) {
    logTest('Domain Set API - Valid Domain Format', false, `Error: ${error.message}`);
  }

  // Test 4: Domain Verification API
  try {
    const response = await testApiEndpoint('/api/custom-domain/verify', 'POST', {
      projectId: 'test-project-id'
    });
    const passed = response.status === 404; // Should return 404 for non-existent project
    logTest(
      'Domain Verification API - Non-existent Project',
      passed,
      `Status: ${response.status} (Expected: 404)`
    );
  } catch (error) {
    logTest('Domain Verification API - Non-existent Project', false, `Error: ${error.message}`);
  }

  // Test 5: Domain Resolution API
  try {
    const response = await testApiEndpoint('/api/custom-domain/resolve');
    const passed = response.status === 200 || response.status === 400; // Should return 200 (default domain) or 400 for missing host header
    logTest(
      'Domain Resolution API - Missing Host Header',
      passed,
      `Status: ${response.status} (Expected: 200 or 400)`
    );
  } catch (error) {
    logTest('Domain Resolution API - Missing Host Header', false, `Error: ${error.message}`);
  }

  console.log('📊 Test Results Summary');
  console.log('======================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  console.log('');

  if (results.failed > 0) {
    console.log('❌ Failed Tests:');
    results.tests.filter(t => !t.passed).forEach(test => {
      console.log(`   - ${test.name}: ${test.details}`);
    });
    console.log('');
  }

  console.log('🎯 Next Steps for Manual Testing:');
  console.log('1. Create a test project in your app');
  console.log('2. Set up a test domain (or use a subdomain)');
  console.log('3. Test the domain setup flow in project settings');
  console.log('4. Verify DNS records are working');
  console.log('5. Test custom domain routing');
  console.log('');

  return results.failed === 0;
}

// Run tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
