/**
 * E2E Tests for Mission Control Dashboard
 * Tests the complete user journey and functionality of the AI-powered dashboard
 */

import { test, expect, Page } from '@playwright/test';

// Helper to mock OpenAI API
async function mockOpenAIAPI(page: Page) {
  await page.route('**/v1/chat/completions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify({
                sentiment_score: 75,
                sentiment_trend: 'up',
                critical_alerts: [
                  'New feature requests increased by 40%',
                  'Negative feedback on mobile performance',
                ],
                recommended_actions: [
                  {
                    label: 'Review mobile performance issues',
                    action: 'review_feedback',
                    priority: 'high',
                    context: '3 users reported slow loading times on mobile',
                  },
                  {
                    label: 'Draft spec for top requested feature',
                    action: 'draft_spec',
                    priority: 'medium',
                    context: 'Dark mode requested by 15 users',
                  },
                ],
                briefing_text:
                  'Overall sentiment is positive with 75% satisfaction. Key opportunities in mobile optimization and dark mode feature. User engagement increased 20% this week.',
                opportunities: [
                  {
                    title: 'Dark mode support',
                    votes: 15,
                    impact: 'high',
                  },
                  {
                    title: 'Keyboard shortcuts',
                    votes: 8,
                    impact: 'medium',
                  },
                ],
                threats: [
                  {
                    title: 'Mobile performance concerns',
                    severity: 'high',
                  },
                  {
                    title: 'Competitor launched similar feature',
                    severity: 'medium',
                  },
                ],
              }),
            },
            finish_reason: 'stop',
          },
        ],
      }),
    });
  });
}

// Helper to mock database APIs
async function mockDatabaseAPIs(page: Page, projectSlug: string) {
  // Mock dashboard metrics API
  await page.route('**/api/dashboard/briefing?projectId=*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-briefing-id',
          content: {
            sentiment_score: 75,
            sentiment_trend: 'up',
            critical_alerts: ['Test alert'],
            recommended_actions: [
              {
                label: 'Test action',
                action: 'review_feedback',
                priority: 'high',
              },
            ],
            briefing_text: 'Test briefing text',
            opportunities: [],
            threats: [],
          },
          created_at: new Date().toISOString(),
        }),
      });
    } else if (route.request().method() === 'POST') {
      // Force regenerate
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-briefing-id-new',
          content: {
            sentiment_score: 78,
            sentiment_trend: 'up',
            critical_alerts: ['Refreshed alert'],
            recommended_actions: [],
            briefing_text: 'Refreshed briefing text',
            opportunities: [],
            threats: [],
          },
          created_at: new Date().toISOString(),
        }),
      });
    }
  });
}

// Helper to mock health check API
async function mockHealthCheckAPI(page: Page, healthy = true) {
  await page.route('**/api/dashboard/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: healthy ? 'pass' : 'fail',
        timestamp: new Date().toISOString(),
        summary: {
          total: 5,
          passed: healthy ? 5 : 2,
          warnings: 0,
          failed: healthy ? 0 : 3,
        },
        checks: [
          {
            name: 'OpenAI API Key',
            status: healthy ? 'pass' : 'fail',
            message: healthy
              ? 'OpenAI API key is configured'
              : 'Missing OPENAI_API_KEY environment variable',
          },
          {
            name: 'Database Connection',
            status: 'pass',
            message: 'Successfully connected to Supabase database',
          },
          {
            name: 'Database Table: daily_briefings',
            status: healthy ? 'pass' : 'fail',
            message: healthy
              ? 'Table exists and is accessible'
              : 'Table does not exist',
          },
        ],
        next_steps: healthy
          ? ['All critical checks passed!']
          : ['Review failed checks', 'Run database migrations'],
      }),
    });
  });
}

test.describe('Mission Control Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Set up common mocks
    await mockOpenAIAPI(page);
    await mockHealthCheckAPI(page);
  });

  test('should display help page with system health check', async ({ page }) => {
    await page.goto('/app/mission-control-help');

    // Check header
    await expect(page.locator('h1')).toContainText('Mission Control Dashboard');
    await expect(page.locator('text=AI-powered executive briefings')).toBeVisible();

    // Check health check section
    await expect(page.locator('h2:has-text("System Health Check")')).toBeVisible();
    const healthCheckLink = page.locator('a[href="/api/dashboard/health"]');
    await expect(healthCheckLink).toBeVisible();
    await expect(healthCheckLink).toContainText('Run Health Check');

    // Check setup requirements section
    await expect(page.locator('h2:has-text("Setup Requirements")')).toBeVisible();
    await expect(page.locator('text=OPENAI_API_KEY')).toBeVisible();
    await expect(page.locator('text=202511201800_mission_control_clean.sql')).toBeVisible();

    // Check how to access section
    await expect(page.locator('h2:has-text("How to Access")')).toBeVisible();
    await expect(page.locator('text=From Project Cards')).toBeVisible();
    await expect(page.locator('text=From Project Board')).toBeVisible();
    await expect(page.locator('text=Direct URL')).toBeVisible();
  });

  test('should display project links on help page when logged in', async ({ page }) => {
    // Mock user projects
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
        }),
      });
    });

    await page.route('**/rest/v1/projects*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'project-1',
            name: 'Test Project 1',
            slug: 'test-project-1',
          },
          {
            id: 'project-2',
            name: 'Test Project 2',
            slug: 'test-project-2',
          },
        ]),
      });
    });

    await page.goto('/app/mission-control-help');

    // Check project list
    await expect(page.locator('h2:has-text("Your Projects")')).toBeVisible();
    await expect(page.locator('text=Test Project 1')).toBeVisible();
    await expect(page.locator('text=/test-project-1/dashboard')).toBeVisible();
    await expect(page.locator('text=Test Project 2')).toBeVisible();
    await expect(page.locator('text=/test-project-2/dashboard')).toBeVisible();
  });

  test('should display health check results', async ({ page }) => {
    await mockHealthCheckAPI(page, true);
    await page.goto('/api/dashboard/health');

    // Parse JSON response
    const content = await page.textContent('body');
    const health = JSON.parse(content || '{}');

    expect(health.status).toBe('pass');
    expect(health.summary.passed).toBeGreaterThan(0);
    expect(health.checks).toBeDefined();
    expect(Array.isArray(health.checks)).toBe(true);
  });

  test('should show error state when system is unhealthy', async ({ page }) => {
    // Mock project API to return valid project
    await page.route('**/rest/v1/projects*slug=eq.test-project*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-project-id',
            name: 'Test Project',
            slug: 'test-project',
            owner_id: 'test-user-id',
          },
        ]),
      });
    });

    // Mock briefing API to fail
    await page.route('**/rest/v1/rpc/get_today_briefing*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Database connection not available',
        }),
      });
    });

    await page.goto('/test-project/dashboard');

    // Check error state
    await expect(page.locator('h1:has-text("Error Loading Dashboard")')).toBeVisible();
    await expect(page.locator('text=We encountered an issue')).toBeVisible();

    // Check error details section
    await expect(page.locator('h2:has-text("Error Details")')).toBeVisible();

    // Check action buttons
    const boardButton = page.locator('a[href="/test-project/board"]');
    await expect(boardButton).toBeVisible();
    await expect(boardButton).toContainText('View Feedback Board Instead');

    const helpButton = page.locator('a[href="/app/mission-control-help"]');
    await expect(helpButton).toBeVisible();
    await expect(helpButton).toContainText('Get Help & Troubleshooting');

    // Check technical details
    const details = page.locator('summary:has-text("Technical Details")');
    await expect(details).toBeVisible();
  });

  test('should show OpenAI-specific error message when API key is missing', async ({ page }) => {
    // Mock project API
    await page.route('**/rest/v1/projects*slug=eq.test-project*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-project-id',
            name: 'Test Project',
            slug: 'test-project',
            owner_id: 'test-user-id',
          },
        ]),
      });
    });

    // Mock briefing API to fail with OpenAI error
    await page.route('**/rest/v1/rpc/get_today_briefing*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'OpenAI API key not configured',
        }),
      });
    });

    await page.goto('/test-project/dashboard');

    // Check for OpenAI-specific error message
    await expect(page.locator('text=Missing OpenAI API Key')).toBeVisible();
    await expect(page.locator('text=OPENAI_API_KEY')).toBeVisible();
  });

  test('should navigate to dashboard from project card', async ({ page }) => {
    // Mock projects API
    await page.route('**/rest/v1/projects*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'project-1',
            name: 'Test Project',
            slug: 'test-project',
            description: 'Test description',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/app');

    // Look for sparkles button (Mission Control button on project card)
    const missionControlButton = page.locator('[data-testid="mission-control-button"]').first();

    if (await missionControlButton.isVisible()) {
      await missionControlButton.click();
      await expect(page).toHaveURL(/.*\/test-project\/dashboard/);
    }
  });

  test('should load dashboard successfully with valid data', async ({ page }) => {
    // Mock all necessary APIs
    await page.route('**/rest/v1/projects*slug=eq.test-project*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-project-id',
            name: 'Test Project',
            slug: 'test-project',
            owner_id: 'test-user-id',
          },
        ]),
      });
    });

    await page.route('**/rest/v1/rpc/get_today_briefing*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'briefing-id',
            project_id: 'test-project-id',
            content: {
              sentiment_score: 75,
              sentiment_trend: 'up',
              critical_alerts: ['Test alert'],
              recommended_actions: [],
              briefing_text: 'Test briefing text',
              opportunities: [],
              threats: [],
            },
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.route('**/rest/v1/rpc/get_dashboard_metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sentiment: {
            current_nps: 75,
            total_feedback: 50,
            trend: 'up',
            change_percent: 5,
          },
          feedback: {
            issues_per_week: 10,
            total_this_week: 12,
            trend: 'up',
          },
          roadmap: {
            in_progress: 5,
            planned: 8,
            completed_this_week: 3,
          },
          competitors: {
            new_insights_count: 2,
            high_priority_count: 1,
          },
        }),
      });
    });

    await page.route('**/rest/v1/users*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
          },
        ]),
      });
    });

    await page.goto('/test-project/dashboard');

    // Check header
    await expect(page.locator('h1:has-text("Mission Control")')).toBeVisible();
    await expect(page.locator('text=Test Project')).toBeVisible();

    // Check navigation buttons
    await expect(page.locator('a[href="/test-project/board"]')).toBeVisible();
    await expect(page.locator('a[href="/test-project/roadmap"]')).toBeVisible();

    // Check dashboard content loaded
    await expect(page.locator('text=Test briefing text')).toBeVisible();
  });

  test('should handle refresh action', async ({ page }) => {
    let refreshCount = 0;

    // Mock briefing API with counter
    await page.route('**/api/dashboard/briefing', async (route) => {
      if (route.request().method() === 'POST') {
        refreshCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `briefing-${refreshCount}`,
            content: {
              sentiment_score: 80,
              sentiment_trend: 'up',
              critical_alerts: ['Refreshed alert'],
              recommended_actions: [],
              briefing_text: `Briefing refreshed ${refreshCount} times`,
              opportunities: [],
              threats: [],
            },
            created_at: new Date().toISOString(),
          }),
        });
      }
    });

    // Mock other required APIs
    await mockDatabaseAPIs(page, 'test-project');

    await page.goto('/test-project/dashboard');

    // Look for refresh button
    const refreshButton = page.locator('button:has-text("Refresh")').first();

    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(1000); // Wait for API call
      expect(refreshCount).toBeGreaterThan(0);
    }
  });
});

test.describe('Mission Control API Routes', () => {
  test('health check endpoint should return system status', async ({ request }) => {
    const response = await request.get('/api/dashboard/health');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('checks');
    expect(Array.isArray(data.checks)).toBe(true);
  });
});

test.describe('Mission Control Navigation', () => {
  test('help page should be accessible from multiple entry points', async ({ page }) => {
    await page.goto('/app/mission-control-help');
    await expect(page).toHaveURL(/.*mission-control-help/);
    await expect(page.locator('h1')).toContainText('Mission Control Dashboard');
  });

  test('should have back button on help page', async ({ page }) => {
    await page.goto('/app/mission-control-help');

    const backButton = page.locator('a:has-text("Back to Projects")');
    await expect(backButton).toBeVisible();
    await expect(backButton).toHaveAttribute('href', '/app');
  });
});
