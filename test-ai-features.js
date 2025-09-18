#!/usr/bin/env node

/**
 * Test script for AI Features
 * Run this after implementing the database schema and API endpoints
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const TEST_PROJECT_ID = 'test-project-id';
const TEST_POST_ID = 'test-post-id';

// Test data
const testPost = {
  title: 'Add dark mode support',
  description: 'Please add a dark theme option for better user experience, especially for users who work late at night.',
  project_id: TEST_PROJECT_ID,
  board_id: 'test-board-id',
  author_email: 'test@example.com'
};

async function testAIFeatures() {
  console.log('🧪 Testing AI Features...\n');

  try {
    // Test 1: Create a test post
    console.log('1. Creating test post...');
    const createResponse = await fetch(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPost)
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create post: ${createResponse.statusText}`);
    }

    const createData = await createResponse.json();
    console.log('✅ Post created:', createData.post.id);

    // Test 2: AI Duplicate Detection
    console.log('\n2. Testing AI Duplicate Detection...');
    const duplicateResponse = await fetch(`${BASE_URL}/api/ai/duplicate-detection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`
      },
      body: JSON.stringify({
        postId: createData.post.id,
        projectId: TEST_PROJECT_ID
      })
    });

    if (duplicateResponse.ok) {
      const duplicateData = await duplicateResponse.json();
      console.log('✅ Duplicate detection:', duplicateData.duplicates.length, 'duplicates found');
    } else {
      console.log('❌ Duplicate detection failed:', duplicateResponse.statusText);
    }

    // Test 3: AI Priority Scoring
    console.log('\n3. Testing AI Priority Scoring...');
    const priorityResponse = await fetch(`${BASE_URL}/api/ai/priority-scoring`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`
      },
      body: JSON.stringify({
        postId: createData.post.id,
        projectId: TEST_PROJECT_ID
      })
    });

    if (priorityResponse.ok) {
      const priorityData = await priorityResponse.json();
      console.log('✅ Priority scoring:', priorityData.priority.level, `(${priorityData.priority.score}/10)`);
    } else {
      console.log('❌ Priority scoring failed:', priorityResponse.statusText);
    }

    // Test 4: Get Priority Scores
    console.log('\n4. Testing Get Priority Scores...');
    const getPriorityResponse = await fetch(`${BASE_URL}/api/ai/priority-scoring?projectId=${TEST_PROJECT_ID}`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`
      }
    });

    if (getPriorityResponse.ok) {
      const getPriorityData = await getPriorityResponse.json();
      console.log('✅ Retrieved', getPriorityData.posts.length, 'posts with priority scores');
    } else {
      console.log('❌ Get priority scores failed:', getPriorityResponse.statusText);
    }

    console.log('\n🎉 AI Features test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check if OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

// Run tests
testAIFeatures();
