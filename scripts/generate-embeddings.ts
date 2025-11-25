#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { generateExpandedProjectEmbeddings } from '../src/lib/ask/embeddings-all-context';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Validate environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease ensure these are set in your .env.local file');
  process.exit(1);
}

// Get project ID from command line arguments
const projectId = process.argv[2];

if (!projectId) {
  console.error('❌ Error: Project ID is required');
  console.error('\nUsage:');
  console.error('  npm run embeddings <project-id>');
  console.error('\nExample:');
  console.error('  npm run embeddings 550e8400-e29b-41d4-a716-446655440000');
  process.exit(1);
}

// Validate UUID format
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(projectId)) {
  console.error('❌ Error: Invalid project ID format');
  console.error('   Project ID must be a valid UUID');
  process.exit(1);
}

// Main execution
async function main() {
  console.log('🚀 Starting embedding generation...\n');
  console.log(`Project ID: ${projectId}\n`);
  console.log('This may take a while depending on the number of feedback items.\n');
  console.log('---\n');

  try {
    const startTime = Date.now();

    const result = await generateExpandedProjectEmbeddings(projectId);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n---\n');
    console.log('✅ Embedding generation complete!\n');
    console.log('Results by context:');
    const printSummary = (label: string, summary: { total: number; skipped: number; success: number; errors: number }) => {
      console.log(
        `  ${label.padEnd(13)} total=${summary.total} new=${summary.success} skipped=${summary.skipped} errors=${summary.errors}`
      );
    };

    printSummary('Feedback', result.feedback);
    printSummary('Roadmap', result.roadmap);
    printSummary('Competitors', result.competitors);
    printSummary('Personas', result.personas);
    printSummary('Product docs', result.productDocs);
    console.log(`  Duration:      ${duration}s`);

    const totalErrors =
      result.feedback.errors +
      result.roadmap.errors +
      result.competitors.errors +
      result.personas.errors +
      result.productDocs.errors;

    if (totalErrors > 0) {
      console.log('\n⚠️  Some items failed to process. Check the logs above for details.');
      process.exit(1);
    }

    console.log('\n🎉 All embeddings generated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error during embedding generation:');
    console.error(error);
    process.exit(1);
  }
}

main();
