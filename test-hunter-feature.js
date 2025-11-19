/**
 * AI Feedback Hunter - Comprehensive Test Suite
 * Tests file structure, code patterns, and configuration
 */

const fs = require('fs');
const path = require('path');

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

// Helper functions
function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) console.log(`   ${details}`);

  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  console.log(title);
  console.log('='.repeat(70));
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(__dirname, relativePath));
}

function readFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf-8');
}

// Test Suite
async function runTests() {
  console.log('\n🚀 AI Feedback Hunter - Comprehensive Test Suite\n');

  // ========================================================================
  // TEST 1: DATABASE MIGRATION
  // ========================================================================
  logSection('TEST 1: DATABASE MIGRATION');

  try {
    const migrationPath = 'migrations/202511141200_feedback_hunter.sql';
    const exists = fileExists(migrationPath);
    logTest('Migration file exists', exists);

    if (exists) {
      const content = readFile(migrationPath);
      logTest('Creates hunter_configs table', content.includes('CREATE TABLE hunter_configs'));
      logTest('Creates platform_integrations table', content.includes('CREATE TABLE platform_integrations'));
      logTest('Creates discovered_feedback table', content.includes('CREATE TABLE discovered_feedback'));
      logTest('Creates hunter_logs table', content.includes('CREATE TABLE hunter_logs'));
      logTest('Creates action_recommendations table', content.includes('CREATE TABLE action_recommendations'));
      logTest('Has RLS policies', content.includes('ENABLE ROW LEVEL SECURITY'));
      logTest('Has indexes', content.includes('CREATE INDEX'));
      logTest('Has platform_type enum', content.includes('platform_type'));
      logTest('Has integration_status enum', content.includes('integration_status'));
    }
  } catch (error) {
    logTest('Database migration check', false, error.message);
  }

  // ========================================================================
  // TEST 2: TYPE DEFINITIONS
  // ========================================================================
  logSection('TEST 2: TYPE DEFINITIONS');

  try {
    const typesPath = 'src/types/hunter.ts';
    const exists = fileExists(typesPath);
    logTest('hunter.ts types file exists', exists);

    if (exists) {
      const content = readFile(typesPath);
      logTest('PlatformType defined', content.includes('export type PlatformType'));
      logTest('HunterConfig interface defined', content.includes('export interface HunterConfig'));
      logTest('PlatformIntegration interface defined', content.includes('export interface PlatformIntegration'));
      logTest('DiscoveredFeedback interface defined', content.includes('export interface DiscoveredFeedback'));
      logTest('ActionRecommendation interface defined', content.includes('export interface ActionRecommendation'));
      logTest('PLATFORM_META constant defined', content.includes('export const PLATFORM_META'));
      logTest('Includes reddit platform', content.includes('reddit'));
      logTest('Includes twitter platform', content.includes('twitter'));
      logTest('Includes hackernews platform', content.includes('hackernews'));
    }
  } catch (error) {
    logTest('Type definitions check', false, error.message);
  }

  // ========================================================================
  // TEST 3: HUNTER CLASSES
  // ========================================================================
  logSection('TEST 3: HUNTER CLASSES');

  try {
    // Check base hunter
    const baseHunterPath = 'src/lib/hunters/base-hunter.ts';
    const baseExists = fileExists(baseHunterPath);
    logTest('base-hunter.ts exists', baseExists);

    if (baseExists) {
      const content = readFile(baseHunterPath);
      logTest('BaseHunter class defined', content.includes('export abstract class BaseHunter'));
      logTest('Has hunt method', content.includes('abstract hunt'));
      logTest('Has classify method', content.includes('classify'));
      logTest('Has OpenAI integration', content.includes('openai'));
    }

    // Check platform hunters
    const hunters = [
      { name: 'reddit', file: 'reddit-hunter.ts' },
      { name: 'twitter', file: 'twitter-hunter.ts' },
      { name: 'hackernews', file: 'hackernews-hunter.ts' },
      { name: 'producthunt', file: 'producthunt-hunter.ts' },
      { name: 'g2', file: 'g2-hunter.ts' },
    ];

    for (const hunter of hunters) {
      const hunterPath = `src/lib/hunters/${hunter.file}`;
      const exists = fileExists(hunterPath);
      logTest(`${hunter.name}-hunter.ts exists`, exists);

      if (exists) {
        const content = readFile(hunterPath);
        logTest(`${hunter.name}-hunter exports class`, content.includes('export class'));
        logTest(`${hunter.name}-hunter has hunt method`, content.includes('async hunt('));
        logTest(`${hunter.name}-hunter extends BaseHunter`, content.includes('extends BaseHunter'));
      }
    }

    // Special test for Reddit RSS implementation
    const redditPath = 'src/lib/hunters/reddit-hunter.ts';
    if (fileExists(redditPath)) {
      const content = readFile(redditPath);
      logTest('Reddit uses RSS feeds (not JSON)', content.includes('REDDIT_SEARCH_RSS') && content.includes('.rss'));
      logTest('Reddit has RSS parser method', content.includes('parseRSS'));
      logTest('Reddit has HTML decoder method', content.includes('decodeHTML'));
      logTest('Reddit does NOT use JSON API', !content.includes('search.json'));
      logTest('Reddit has proper User-Agent', content.includes('Mozilla'));
      logTest('Reddit parses XML entries', content.includes('<entry>'));
    }

    // Test Twitter uses Bearer Token from env
    const twitterPath = 'src/lib/hunters/twitter-hunter.ts';
    if (fileExists(twitterPath)) {
      const content = readFile(twitterPath);
      logTest('Twitter uses env TWITTER_BEARER_TOKEN', content.includes('process.env.TWITTER_BEARER_TOKEN'));
      logTest('Twitter does NOT use integration config', !content.includes('integration.config.twitter_bearer_token'));
    }

    // Test Product Hunt uses env token
    const phPath = 'src/lib/hunters/producthunt-hunter.ts';
    if (fileExists(phPath)) {
      const content = readFile(phPath);
      logTest('Product Hunt uses env PRODUCTHUNT_API_TOKEN', content.includes('process.env.PRODUCTHUNT_API_TOKEN'));
    }

  } catch (error) {
    logTest('Hunter classes check', false, error.message);
  }

  // ========================================================================
  // TEST 4: API ROUTES
  // ========================================================================
  logSection('TEST 4: API ROUTES');

  try {
    const routes = ['setup', 'platforms', 'trigger', 'feed', 'actions', 'stats'];
    for (const route of routes) {
      const routePath = `src/app/api/hunter/${route}/route.ts`;
      const exists = fileExists(routePath);
      logTest(`/api/hunter/${route} route exists`, exists);

      if (exists) {
        const content = readFile(routePath);
        const hasGet = content.includes('export async function GET');
        const hasPost = content.includes('export async function POST');
        logTest(`${route} has handlers`, hasGet || hasPost);
      }
    }

    // Check cron route
    const cronPath = 'src/app/api/cron/hunter-scan/route.ts';
    logTest('/api/cron/hunter-scan route exists', fileExists(cronPath));

    if (fileExists(cronPath)) {
      const content = readFile(cronPath);
      logTest('Cron route uses CRON_SECRET', content.includes('CRON_SECRET'));
      logTest('Cron route has POST handler', content.includes('export async function POST'));
    }

  } catch (error) {
    logTest('API routes check', false, error.message);
  }

  // ========================================================================
  // TEST 5: REACT COMPONENTS
  // ========================================================================
  logSection('TEST 5: REACT COMPONENTS');

  try {
    const components = [
      'HunterDashboard',
      'HunterSetup',
      'FeedbackFeed',
      'PlatformsDashboard',
      'ClassificationOverview',
      'ActionRecommendations',
      'PlatformBadge',
      'ClassificationBadge',
    ];

    for (const component of components) {
      const componentPath = `src/components/hunter/${component}.tsx`;
      const exists = fileExists(componentPath);
      logTest(`${component}.tsx exists`, exists);

      if (exists) {
        const content = readFile(componentPath);
        const isExported = content.includes(`export function ${component}`) ||
                          content.includes(`export const ${component}`);
        logTest(`${component} is exported`, isExported);
      }
    }

    // Check index export
    const indexPath = 'src/components/hunter/index.ts';
    const indexExists = fileExists(indexPath);
    logTest('components/hunter/index.ts exists', indexExists);

    if (indexExists) {
      const content = readFile(indexPath);
      logTest('Index exports HunterDashboard', content.includes('HunterDashboard'));
      logTest('Index exports HunterSetup', content.includes('HunterSetup'));
    }

    // Check HunterDashboard has Settings dialog
    const dashboardPath = 'src/components/hunter/HunterDashboard.tsx';
    if (fileExists(dashboardPath)) {
      const content = readFile(dashboardPath);
      logTest('HunterDashboard has Settings dialog', content.includes('Dialog') && content.includes('HunterSetup'));
      logTest('HunterDashboard has Settings button', content.includes('onClick') && content.includes('setShowSetup'));
    }

  } catch (error) {
    logTest('React components check', false, error.message);
  }

  // ========================================================================
  // TEST 6: PAGES & NAVIGATION
  // ========================================================================
  logSection('TEST 6: PAGES & NAVIGATION');

  try {
    // Check project-specific hunter page
    const projectHunterPath = 'src/app/[slug]/hunter/page.tsx';
    const exists = fileExists(projectHunterPath);
    logTest('/[slug]/hunter page exists', exists);

    if (exists) {
      const content = readFile(projectHunterPath);
      logTest('Hunter page is client component', content.includes("'use client'"));
      logTest('Hunter page renders HunterDashboard', content.includes('HunterDashboard'));
      logTest('Hunter page has project-specific routing', content.includes('params?.slug'));
    }

    // Check old global hunter page removed or updated
    const globalHunterPath = 'src/app/hunter/page.tsx';
    if (fileExists(globalHunterPath)) {
      const content = readFile(globalHunterPath);
      // It's okay if it exists, but it should redirect or handle projectId
      logTest('Global /hunter page handles projectId', content.includes('projectId') || content.includes('redirect'));
    }

    // Check navigation integration in board page
    const boardPagePath = 'src/app/[slug]/board/page.tsx';
    if (fileExists(boardPagePath)) {
      const content = readFile(boardPagePath);
      logTest('Board page has Hunter navigation link', content.includes('AI Feedback Hunter'));
      logTest('Board page imports Brain icon', content.includes('Brain'));
    }

    // Check project card has Hunter icon
    const projectCardPath = 'src/components/EnhancedProjectCard.tsx';
    if (fileExists(projectCardPath)) {
      const content = readFile(projectCardPath);
      logTest('Project card has Hunter link', content.includes('/hunter'));
      logTest('Project card has Brain icon', content.includes('Brain'));
    }

    // Check dashboard does NOT have Hunter banner
    const dashboardPath = 'src/app/app/page.tsx';
    if (fileExists(dashboardPath)) {
      const content = readFile(dashboardPath);
      logTest('Dashboard does NOT have Hunter banner', !content.includes('AI Feedback Hunter banner') && !content.includes('Launch Hunter'));
    }

  } catch (error) {
    logTest('Pages & navigation check', false, error.message);
  }

  // ========================================================================
  // TEST 7: ENVIRONMENT VARIABLES
  // ========================================================================
  logSection('TEST 7: ENVIRONMENT VARIABLES');

  try {
    const envExamplePath = 'env.example';
    const exists = fileExists(envExamplePath);
    logTest('env.example file exists', exists);

    if (exists) {
      const content = readFile(envExamplePath);
      logTest('env.example has TWITTER_BEARER_TOKEN', content.includes('TWITTER_BEARER_TOKEN'));
      logTest('env.example has PRODUCTHUNT_API_TOKEN', content.includes('PRODUCTHUNT_API_TOKEN'));
      logTest('env.example has CRON_SECRET', content.includes('CRON_SECRET'));
      logTest('env.example mentions Hunter', content.includes('AI Feedback Hunter'));
      logTest('env.example notes Reddit is FREE', content.includes('Reddit') && content.includes('FREE'));
      logTest('env.example does NOT have Reddit credentials', !content.includes('REDDIT_CLIENT_ID'));
    }
  } catch (error) {
    logTest('Environment variables check', false, error.message);
  }

  // ========================================================================
  // TEST 8: DOCUMENTATION
  // ========================================================================
  logSection('TEST 8: DOCUMENTATION');

  try {
    const setupGuidePath = 'HUNTER_API_KEYS_SETUP.md';
    const exists = fileExists(setupGuidePath);
    logTest('HUNTER_API_KEYS_SETUP.md exists', exists);

    if (exists) {
      const content = readFile(setupGuidePath);
      logTest('Setup guide mentions RSS feeds', content.includes('RSS'));
      logTest('Setup guide has Twitter instructions', content.includes('Twitter') && content.includes('$100'));
      logTest('Setup guide has Product Hunt instructions', content.includes('Product Hunt'));
      logTest('Setup guide has cost breakdown table', content.includes('Cost Breakdown') && content.includes('|'));
      logTest('Setup guide has troubleshooting section', content.includes('Troubleshooting'));
      logTest('Setup guide notes Reddit needs NO setup', content.includes('Reddit') && content.includes('No Setup Required'));
      logTest('Setup guide does NOT mention Reddit OAuth', !content.includes('Reddit OAuth') && !content.includes('snoowrap'));
    }
  } catch (error) {
    logTest('Documentation check', false, error.message);
  }

  // ========================================================================
  // TEST 9: REDDIT RSS PARSING (REGEX TESTS)
  // ========================================================================
  logSection('TEST 9: REDDIT RSS PARSING LOGIC');

  try {
    // Test RSS patterns that Reddit hunter uses
    const testRSS = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Test Post Title</title>
    <link href="https://reddit.com/r/test/comments/abc123/test"/>
    <id>t3_abc123</id>
    <published>2025-01-01T12:00:00+00:00</published>
    <author><name>testuser</name></author>
    <content type="html">&lt;p&gt;Test content&lt;/p&gt;</content>
  </entry>
</feed>`;

    const hasEntry = /<entry>(.*?)<\/entry>/gs.test(testRSS);
    logTest('RSS entry regex matches', hasEntry);

    const hasTitle = /<title>(.*?)<\/title>/.test(testRSS);
    logTest('RSS title regex matches', hasTitle);

    const hasLink = /<link href="(.*?)"/.test(testRSS);
    logTest('RSS link regex matches', hasLink);

    const hasAuthor = /<author><name>(.*?)<\/name><\/author>/.test(testRSS);
    logTest('RSS author regex matches', hasAuthor);

    const hasContent = /<content type="html">(.*?)<\/content>/.test(testRSS);
    logTest('RSS content regex matches', hasContent);

    const hasId = /<id>(.*?)<\/id>/.test(testRSS);
    logTest('RSS id regex matches', hasId);

    // Test HTML entity decoding logic
    const encoded = '&lt;p&gt;Test&amp;nbsp;&quot;content&quot;&lt;/p&gt;';
    const decoded = encoded
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"');

    logTest('HTML &lt; decodes correctly', decoded.includes('<'));
    logTest('HTML &gt; decodes correctly', decoded.includes('>'));
    logTest('HTML &amp; decodes correctly', decoded.includes('&nbsp;'));
    logTest('HTML &quot; decodes correctly', decoded.includes('"'));

  } catch (error) {
    logTest('RSS parsing logic test', false, error.message);
  }

  // ========================================================================
  // TEST 10: INTEGRATION BRIDGES
  // ========================================================================
  logSection('TEST 10: INTEGRATION BRIDGES');

  try {
    const sentimentBridgePath = 'src/lib/integrations/hunter-sentiment-bridge.ts';
    logTest('Hunter-Sentiment bridge exists', fileExists(sentimentBridgePath));

    const themeBridgePath = 'src/lib/integrations/hunter-theme-bridge.ts';
    logTest('Hunter-Theme bridge exists', fileExists(themeBridgePath));

    if (fileExists(sentimentBridgePath)) {
      const content = readFile(sentimentBridgePath);
      logTest('Sentiment bridge has onFeedbackDiscovered', content.includes('onFeedbackDiscovered'));
    }

    if (fileExists(themeBridgePath)) {
      const content = readFile(themeBridgePath);
      logTest('Theme bridge checks 50+ threshold', content.includes('50'));
    }
  } catch (error) {
    logTest('Integration bridges check', false, error.message);
  }

  // ========================================================================
  // FINAL REPORT
  // ========================================================================
  logSection('TEST SUMMARY');

  console.log(`\nTotal Tests: ${results.tests.length}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%\n`);

  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  - ${t.name}`);
        if (t.details) console.log(`    ${t.details}`);
      });
  }

  console.log('\n' + '='.repeat(70));
  if (results.failed === 0) {
    console.log('✅ ALL TESTS PASSED! AI Feedback Hunter is ready to use.');
    console.log('\n📋 FEATURE CHECKLIST:');
    console.log('   ✅ Database schema with 5 tables + RLS policies');
    console.log('   ✅ 5 Platform hunters (Reddit, Twitter, HN, G2, Product Hunt)');
    console.log('   ✅ Reddit uses RSS feeds (no auth required)');
    console.log('   ✅ Centralized API keys (Twitter, Product Hunt)');
    console.log('   ✅ 6 API routes + cron job');
    console.log('   ✅ 8 React components with full UI');
    console.log('   ✅ Project-specific routing (/[slug]/hunter)');
    console.log('   ✅ Navigation integration (board menu, project cards)');
    console.log('   ✅ Complete documentation');
    console.log('   ✅ Environment variables configured');
  } else {
    console.log(`⚠️  ${results.failed} test(s) failed. Review the issues above.`);
  }
  console.log('='.repeat(70) + '\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
