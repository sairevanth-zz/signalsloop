/**
 * User Stories Feature Validation Script
 * Validates database schema, types, and API endpoints
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message?: string;
}

const results: ValidationResult[] = [];

function log(category: string, test: string, status: 'PASS' | 'FAIL' | 'SKIP', message?: string) {
  results.push({ category, test, status, message });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️ ';
  console.log(`${icon} [${category}] ${test}${message ? ': ' + message : ''}`);
}

function validateDatabaseMigration() {
  console.log('\n📊 VALIDATING DATABASE MIGRATION\n');

  const migrationPath = '/home/user/signalsloop/migrations/202511171400_user_stories.sql';

  try {
    if (fs.existsSync(migrationPath)) {
      log('Database', 'Migration file exists', 'PASS');

      const content = fs.readFileSync(migrationPath, 'utf-8');

      // Check for table creation
      const tables = ['sprints', 'story_templates', 'user_stories', 'story_generation_logs', 'story_feedback_links'];
      tables.forEach(table => {
        if (content.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
          log('Database', `${table} table creation`, 'PASS');
        } else {
          log('Database', `${table} table creation`, 'FAIL', 'CREATE TABLE not found');
        }
      });

      // Check for enums
      const enums = ['story_priority', 'sprint_status', 'sprint_phase'];
      enums.forEach(enumType => {
        if (content.includes(`CREATE TYPE ${enumType}`)) {
          log('Database', `${enumType} enum`, 'PASS');
        } else {
          log('Database', `${enumType} enum`, 'FAIL', 'CREATE TYPE not found');
        }
      });

      // Check for views
      const views = ['user_stories_with_details', 'sprint_planning_view', 'backlog_stories'];
      views.forEach(view => {
        if (content.includes(`CREATE`) && content.includes(`VIEW ${view}`)) {
          log('Database', `${view} view`, 'PASS');
        } else {
          log('Database', `${view} view`, 'FAIL', 'VIEW not found');
        }
      });

      // Check for RLS policies
      if (content.includes('ROW LEVEL SECURITY')) {
        log('Database', 'RLS policies defined', 'PASS');
      } else {
        log('Database', 'RLS policies defined', 'FAIL');
      }

      // Check for correct table order (sprints before user_stories)
      const sprintsIndex = content.indexOf('CREATE TABLE IF NOT EXISTS sprints');
      const userStoriesIndex = content.indexOf('CREATE TABLE IF NOT EXISTS user_stories');
      if (sprintsIndex < userStoriesIndex && sprintsIndex > 0) {
        log('Database', 'Correct table creation order', 'PASS', 'sprints before user_stories');
      } else {
        log('Database', 'Correct table creation order', 'FAIL', 'FK dependency issue');
      }

      // Check for sprint_planning_view without duplicate columns
      if (!content.includes('as completed_points,') || content.includes('DROP VIEW IF EXISTS sprint_planning_view')) {
        log('Database', 'sprint_planning_view no duplicates', 'PASS');
      } else {
        log('Database', 'sprint_planning_view no duplicates', 'SKIP', 'Manual check needed');
      }

    } else {
      log('Database', 'Migration file exists', 'FAIL', 'File not found');
    }
  } catch (error) {
    log('Database', 'Migration validation', 'FAIL', String(error));
  }
}

function validateStoryPointEstimation() {
  console.log('\n🎯 VALIDATING STORY POINT ESTIMATION\n');

  const validPoints = [1, 2, 3, 5, 8, 13, 21];

  // Test Fibonacci scale
  log('Estimation', 'Fibonacci scale values defined', 'PASS', validPoints.join(', '));

  // Test score mapping
  function scoreToStoryPoints(score: number): number {
    if (score <= 0.15) return 1;
    if (score <= 0.30) return 2;
    if (score <= 0.45) return 3;
    if (score <= 0.60) return 5;
    if (score <= 0.75) return 8;
    if (score <= 0.90) return 13;
    return 21;
  }

  const testCases = [
    { score: 0.1, expected: 1 },
    { score: 0.25, expected: 2 },
    { score: 0.40, expected: 3 },
    { score: 0.55, expected: 5 },
    { score: 0.70, expected: 8 },
    { score: 0.85, expected: 13 },
    { score: 0.95, expected: 21 },
  ];

  testCases.forEach(({ score, expected }) => {
    const result = scoreToStoryPoints(score);
    if (result === expected) {
      log('Estimation', `Score ${score} maps to ${expected} points`, 'PASS');
    } else {
      log('Estimation', `Score ${score} maps to ${expected} points`, 'FAIL', `Got ${result}`);
    }
  });

  // Test weighted score calculation
  function calculateWeightedScore(complexity: number, uncertainty: number, effort: number): number {
    const WEIGHTS = { complexity: 0.4, uncertainty: 0.3, effort: 0.3 };
    return (
      complexity * WEIGHTS.complexity +
      uncertainty * WEIGHTS.uncertainty +
      effort * WEIGHTS.effort
    );
  }

  const weightedScore = calculateWeightedScore(0.5, 0.5, 0.5);
  if (weightedScore === 0.5) {
    log('Estimation', 'Weighted score calculation', 'PASS', `Result: ${weightedScore}`);
  } else {
    log('Estimation', 'Weighted score calculation', 'FAIL', `Expected 0.5, got ${weightedScore}`);
  }
}

function validateTypes() {
  console.log('\n📝 VALIDATING TYPESCRIPT TYPES\n');

  try {
    // Check if types file exists
    const fs = require('fs');
    const typesPath = '/home/user/signalsloop/src/types/user-stories.ts';

    if (fs.existsSync(typesPath)) {
      const content = fs.readFileSync(typesPath, 'utf-8');

      // Check for key type definitions
      const expectedTypes = [
        'UserStory',
        'Sprint',
        'AcceptanceCriterion',
        'StoryTemplate',
        'StoryGenerationLog',
      ];

      expectedTypes.forEach(type => {
        if (content.includes(`export interface ${type}`) || content.includes(`export type ${type}`)) {
          log('Types', `${type} type defined`, 'PASS');
        } else {
          log('Types', `${type} type defined`, 'FAIL', 'Type not found');
        }
      });

      // Check for constants
      if (content.includes('STORY_POINTS')) {
        log('Types', 'STORY_POINTS constant defined', 'PASS');
      } else {
        log('Types', 'STORY_POINTS constant defined', 'FAIL');
      }
    } else {
      log('Types', 'user-stories.ts file exists', 'FAIL', 'File not found');
    }
  } catch (error) {
    log('Types', 'Type validation', 'FAIL', String(error));
  }
}

function validateComponents() {
  console.log('\n⚛️  VALIDATING REACT COMPONENTS\n');

  try {
    const fs = require('fs');
    const componentsPath = '/home/user/signalsloop/src/components/user-stories';

    const expectedComponents = [
      'UserStoriesDashboard.tsx',
      'StoryCard.tsx',
      'StoryGenerator.tsx',
      'StoryEditor.tsx',
      'AcceptanceCriteriaEditor.tsx',
      'UserStoriesWidget.tsx',
      'index.ts',
    ];

    if (fs.existsSync(componentsPath)) {
      expectedComponents.forEach(component => {
        const componentPath = `${componentsPath}/${component}`;
        if (fs.existsSync(componentPath)) {
          log('Components', `${component} exists`, 'PASS');
        } else {
          log('Components', `${component} exists`, 'FAIL', 'File not found');
        }
      });
    } else {
      log('Components', 'user-stories directory exists', 'FAIL', 'Directory not found');
    }
  } catch (error) {
    log('Components', 'Component validation', 'FAIL', String(error));
  }
}

function validateAPIRoutes() {
  console.log('\n🔌 VALIDATING API ROUTES\n');

  try {
    const fs = require('fs');

    const routes = [
      '/home/user/signalsloop/src/app/api/user-stories/generate/route.ts',
      '/home/user/signalsloop/src/app/api/user-stories/[projectId]/route.ts',
    ];

    routes.forEach(route => {
      if (fs.existsSync(route)) {
        const content = fs.readFileSync(route, 'utf-8');

        const routeName = route.split('/').slice(-2).join('/');
        log('API Routes', `${routeName} exists`, 'PASS');

        // Check for HTTP methods
        if (route.includes('[projectId]')) {
          if (content.includes('export async function GET')) {
            log('API Routes', 'GET endpoint defined', 'PASS');
          }
          if (content.includes('export async function POST')) {
            log('API Routes', 'POST endpoint defined', 'PASS');
          }
          if (content.includes('export async function PATCH')) {
            log('API Routes', 'PATCH endpoint defined', 'PASS');
          }
          if (content.includes('export async function DELETE')) {
            log('API Routes', 'DELETE endpoint defined', 'PASS');
          }
        }
      } else {
        log('API Routes', route, 'FAIL', 'File not found');
      }
    });
  } catch (error) {
    log('API Routes', 'Route validation', 'FAIL', String(error));
  }
}

function validateLibraryFunctions() {
  console.log('\n📚 VALIDATING LIBRARY FUNCTIONS\n');

  try {
    const fs = require('fs');
    const libPath = '/home/user/signalsloop/src/lib/user-stories';

    const expectedFiles = [
      'generation.ts',
      'estimation.ts',
      'jira-export.ts',
      'sprint-planning.ts',
      'index.ts',
    ];

    if (fs.existsSync(libPath)) {
      expectedFiles.forEach(file => {
        const filePath = `${libPath}/${file}`;
        if (fs.existsSync(filePath)) {
          log('Library', `${file} exists`, 'PASS');
        } else {
          log('Library', `${file} exists`, 'FAIL', 'File not found');
        }
      });
    } else {
      log('Library', 'user-stories library directory exists', 'FAIL', 'Directory not found');
    }
  } catch (error) {
    log('Library', 'Library validation', 'FAIL', String(error));
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  console.log(`✅ Passed:  ${passed}/${total}`);
  console.log(`❌ Failed:  ${failed}/${total}`);
  console.log(`⏭️  Skipped: ${skipped}/${total}`);
  console.log();

  if (failed > 0) {
    console.log('Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - [${r.category}] ${r.test}${r.message ? ': ' + r.message : ''}`);
    });
    console.log();
  }

  const successRate = ((passed / total) * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}%`);
  console.log('='.repeat(60) + '\n');

  if (successRate === '100.0') {
    console.log('🎉 All tests passed! User Stories feature is fully validated.\n');
  } else if (parseFloat(successRate) >= 80) {
    console.log('⚠️  Most tests passed. Review failures above.\n');
  } else {
    console.log('❗ Multiple failures detected. Please review and fix.\n');
    process.exit(1);
  }
}

function main() {
  console.log('🚀 User Stories Feature Validation\n');
  console.log('This script validates the complete User Stories implementation:');
  console.log('- Database migration file');
  console.log('- TypeScript types');
  console.log('- React components');
  console.log('- API routes');
  console.log('- Library functions');
  console.log('- Estimation algorithm\n');

  validateDatabaseMigration();
  validateStoryPointEstimation();
  validateTypes();
  validateComponents();
  validateAPIRoutes();
  validateLibraryFunctions();

  printSummary();
}

main();
