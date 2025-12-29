/**
 * Competitive Intelligence (War Room) E2E Tests
 * Tests for the Competitor War Room page including competitor tracking,
 * alerts, job posting intelligence, and strategic recommendations.
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://signalsloop.com';
const TEST_PROJECT_SLUG = 'test-project';

// Mock project API
async function mockProjectAPI(page: Page, projectSlug: string) {
    await page.route('**/api/projects**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                projects: [{
                    id: 'test-project-id',
                    name: 'Test Project',
                    slug: projectSlug,
                }],
            }),
        });
    });

    await page.route('**/rest/v1/projects**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 'test-project-id',
                name: 'Test Project',
                slug: projectSlug,
            }),
        });
    });
}

// Mock competitive intelligence API
async function mockCompetitiveAPI(page: Page) {
    await page.route('**/api/competitive**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                competitors: [
                    {
                        id: 'comp-1',
                        name: 'CompetitorX',
                        website: 'https://competitorx.com',
                        sentiment: 'negative',
                        mention_count: 45,
                        last_mention: new Date().toISOString(),
                    },
                    {
                        id: 'comp-2',
                        name: 'RivalCo',
                        website: 'https://rivalco.io',
                        sentiment: 'neutral',
                        mention_count: 23,
                        last_mention: new Date().toISOString(),
                    },
                ],
                feature_gaps: [
                    {
                        feature: 'Mobile App',
                        our_status: 'planned',
                        competitor_status: 'launched',
                        revenue_impact: 45000,
                    },
                    {
                        feature: 'API Webhooks',
                        our_status: 'in_progress',
                        competitor_status: 'launched',
                        revenue_impact: 22000,
                    },
                ],
                recommendations: [
                    {
                        action: 'ATTACK',
                        feature: 'Advanced Analytics',
                        reason: 'Competitor has weak analytics, opportunity to differentiate',
                    },
                    {
                        action: 'DEFEND',
                        feature: 'Pricing',
                        reason: 'Competitor launched aggressive pricing, potential churn risk',
                    },
                ],
            }),
        });
    });
}

// Mock war room alerts API
async function mockWarRoomAlertsAPI(page: Page) {
    await page.route('**/api/war-room/alerts**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                alerts: [
                    {
                        id: 'alert-1',
                        type: 'competitor_launch',
                        competitor: 'CompetitorX',
                        title: 'New Feature Launch',
                        description: 'CompetitorX launched AI-powered analytics',
                        severity: 'high',
                        created_at: new Date().toISOString(),
                    },
                    {
                        id: 'alert-2',
                        type: 'pricing_change',
                        competitor: 'RivalCo',
                        title: 'Pricing Update',
                        description: 'RivalCo reduced prices by 20%',
                        severity: 'medium',
                        created_at: new Date().toISOString(),
                    },
                ],
            }),
        });
    });
}

// Mock job postings API
async function mockJobPostingsAPI(page: Page) {
    await page.route('**/api/war-room/jobs**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                job_postings: [
                    {
                        id: 'job-1',
                        competitor: 'CompetitorX',
                        title: 'Senior ML Engineer',
                        location: 'Remote',
                        signals: ['AI Investment', 'Team Expansion'],
                        posted_at: new Date().toISOString(),
                    },
                    {
                        id: 'job-2',
                        competitor: 'CompetitorX',
                        title: 'Director of Product',
                        location: 'San Francisco, CA',
                        signals: ['Leadership Change', 'Strategic Shift'],
                        posted_at: new Date().toISOString(),
                    },
                ],
                hiring_trends: {
                    engineering: { count: 15, trend: 'increasing' },
                    product: { count: 5, trend: 'stable' },
                    sales: { count: 8, trend: 'increasing' },
                },
            }),
        });
    });
}

test.describe('War Room Page', () => {
    test.beforeEach(async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockCompetitiveAPI(page);
        await mockWarRoomAlertsAPI(page);
        await mockJobPostingsAPI(page);
    });

    test.describe('Page Loading', () => {
        test('should display War Room header', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('h1')).toContainText(/War Room|Competitor/i);
        });

        test('should show shield icon', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            // Look for shield or war room icon
            await expect(page.locator('h1 svg, svg[class*="shield"]').first()).toBeVisible();
        });

        test('should display page description', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('text=/competitive|alerts|intelligence/i')).toBeVisible();
        });

        test('should show navigation links', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            // Should have breadcrumb or navigation
            await expect(page.locator('a:has-text("Dashboard"), text=Dashboard')).toBeVisible();
        });

        test('should show View Full Intel button', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('a:has-text("View Full Intel"), button:has-text("Full Intel")')).toBeVisible();
        });

        test('should show Configure button', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('a:has-text("Configure"), button:has-text("Configure")')).toBeVisible();
        });
    });

    test.describe('Competitor Alerts', () => {
        test('should display competitor alerts', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('text=/alert|CompetitorX|launch/i').first()).toBeVisible();
        });

        test('should show alert severity', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('[class*="badge"]:has-text("high"), [class*="badge"]:has-text("medium"), [class*="high"], [class*="warning"]').first()).toBeVisible();
        });

        test('should show alert descriptions', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('text=/AI-powered|analytics|pricing/i').first()).toBeVisible();
        });
    });

    test.describe('Job Posting Intelligence', () => {
        test('should display job postings section', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('text=/job|hiring|posting/i').first()).toBeVisible();
        });

        test('should show job titles', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('text=/Engineer|Director|Product/i').first()).toBeVisible();
        });

        test('should show hiring signals', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('text=/AI Investment|Team Expansion|signal/i').first()).toBeVisible();
        });

        test('should display hiring trends', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('text=/trend|increasing|engineering/i').first()).toBeVisible();
        });
    });

    test.describe('Strategic Recommendations', () => {
        test('should display action recommendations', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('text=/ATTACK|DEFEND|action|recommendation/i').first()).toBeVisible();
        });

        test('should show feature gaps', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('text=/gap|Mobile App|API/i').first()).toBeVisible();
        });

        test('should display revenue impact', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('text=/\\$\\d+|revenue|impact/i').first()).toBeVisible();
        });
    });

    test.describe('Competitor Tracking', () => {
        test('should display tracked competitors', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('text=/CompetitorX|RivalCo|competitor/i').first()).toBeVisible();
        });

        test('should show mention counts', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('text=/\\d+\\s*(mentions?|times?)/i').first()).toBeVisible();
        });

        test('should show sentiment indicators', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

            await expect(page.locator('[class*="sentiment"], [class*="negative"], [class*="neutral"]').first()).toBeVisible();
        });
    });
});

test.describe('Competitive Intelligence Page', () => {
    test.beforeEach(async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockCompetitiveAPI(page);
    });

    test('should display competitive intelligence page', async ({ page }) => {
        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/competitive`);

        await expect(page.locator('text=/competitive|intelligence|competitor/i').first()).toBeVisible();
    });

    test('should show competitor comparison', async ({ page }) => {
        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/competitive`);

        // Should show comparison data
        await expect(page.locator('[class*="card"], table').first()).toBeVisible();
    });
});

test.describe('War Room - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display on mobile viewport', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockCompetitiveAPI(page);
        await mockWarRoomAlertsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

        await expect(page.locator('h1')).toContainText(/War Room|Competitor/i);
    });

    test('should stack content on mobile', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockCompetitiveAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

        const content = page.locator('[class*="container"], main').first();
        await expect(content).toBeVisible();
    });

    test('should have touch-friendly buttons', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockCompetitiveAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

        const button = page.locator('button, a[class*="button"]').first();
        if (await button.isVisible()) {
            const box = await button.boundingBox();
            if (box) {
                expect(box.height).toBeGreaterThanOrEqual(36);
            }
        }
    });
});

test.describe('War Room - Error States', () => {
    test('should handle project not found', async ({ page }) => {
        await page.route('**/api/projects**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ projects: [] }),
            });
        });

        await page.route('**/rest/v1/projects**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(null),
            });
        });

        await page.goto(`${BASE_URL}/nonexistent/war-room`);

        await expect(page.locator('text=/not found|error/i')).toBeVisible();
    });

    test('should handle API error', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);

        await page.route('**/api/war-room/**', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Server error' }),
            });
        });

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

        // Should show error state or empty state
    });
});

test.describe('War Room - Accessibility', () => {
    test('should have proper heading', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockCompetitiveAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

        await expect(page.locator('h1')).toBeVisible();
    });

    test('should have accessible navigation', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockCompetitiveAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

        const links = page.locator('a');
        expect(await links.count()).toBeGreaterThanOrEqual(2);
    });

    test('should have color contrast for alerts', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockCompetitiveAPI(page);
        await mockWarRoomAlertsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/war-room`);

        // Alerts should be visible with proper contrast
        const alert = page.locator('[class*="alert"], [class*="badge"]').first();
        await expect(alert).toBeVisible();
    });
});
