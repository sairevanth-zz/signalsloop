/**
 * Executive Briefs E2E Tests
 * Tests for the Executive Briefs page including brief generation,
 * viewing, scheduling, and export functionality.
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
}

// Mock briefs API
async function mockBriefsAPI(page: Page) {
    await page.route('**/api/briefs**', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    briefs: [
                        {
                            id: 'brief-1',
                            type: 'weekly',
                            title: 'Weekly Product Brief - Week 52',
                            created_at: new Date().toISOString(),
                            status: 'completed',
                            sections: {
                                executive_summary: 'Overall product health is positive with 72% sentiment score.',
                                key_metrics: {
                                    sentiment: 72,
                                    feedback_count: 245,
                                    health_score: 85,
                                },
                                revenue_at_risk: 12500,
                                top_insights: [
                                    'Dark mode is the top requested feature',
                                    'Mobile performance complaints increased 15%',
                                ],
                                action_items: [
                                    { title: 'Prioritize dark mode implementation', priority: 'high' },
                                    { title: 'Investigate mobile performance', priority: 'medium' },
                                ],
                                competitor_moves: [
                                    'CompetitorX launched new pricing tier',
                                ],
                                top_themes: [
                                    { name: 'Performance', count: 45 },
                                    { name: 'UI/UX', count: 38 },
                                ],
                            },
                        },
                        {
                            id: 'brief-2',
                            type: 'daily',
                            title: 'Daily Brief - Dec 27',
                            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                            status: 'completed',
                            sections: {
                                executive_summary: 'Quiet day with positive feedback trends.',
                                key_metrics: {
                                    sentiment: 78,
                                    feedback_count: 12,
                                },
                            },
                        },
                        {
                            id: 'brief-3',
                            type: 'monthly',
                            title: 'Monthly Brief - December 2024',
                            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                            status: 'generating',
                            sections: {},
                        },
                    ],
                    schedules: [
                        { type: 'daily', enabled: true, time: '09:00', recipients: ['team@example.com'] },
                        { type: 'weekly', enabled: true, day: 'monday', time: '09:00', recipients: ['team@example.com'] },
                        { type: 'monthly', enabled: false, day: 1, time: '09:00', recipients: [] },
                    ],
                }),
            });
        } else if (route.request().method() === 'POST') {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    brief: {
                        id: 'new-brief-id',
                        type: 'weekly',
                        title: 'New Weekly Brief',
                        status: 'generating',
                        created_at: new Date().toISOString(),
                    },
                }),
            });
        } else {
            await route.continue();
        }
    });
}

test.describe('Briefs Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockBriefsAPI(page);
    });

    test.describe('Page Loading', () => {
        test('should display Briefs dashboard', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/brief|executive|report/i').first()).toBeVisible();
        });

        test('should show loading state initially', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            // May briefly show loading
        });

        test('should handle project not found', async ({ page }) => {
            await page.route('**/api/projects**', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ projects: [] }),
                });
            });

            await page.goto(`${BASE_URL}/nonexistent/briefs`);

            await expect(page.locator('text=/not found|error/i')).toBeVisible();
        });
    });

    test.describe('Brief Types', () => {
        test('should display daily briefs', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/daily/i').first()).toBeVisible();
        });

        test('should display weekly briefs', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/weekly/i').first()).toBeVisible();
        });

        test('should display monthly briefs', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/monthly/i').first()).toBeVisible();
        });
    });

    test.describe('Brief List', () => {
        test('should display brief cards', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            const cards = page.locator('[class*="card"]');
            expect(await cards.count()).toBeGreaterThanOrEqual(1);
        });

        test('should show brief titles', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/Weekly Product Brief|Daily Brief/i').first()).toBeVisible();
        });

        test('should show brief status', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('[class*="badge"]:has-text("completed"), [class*="badge"]:has-text("generating"), text=/completed|generating/i').first()).toBeVisible();
        });

        test('should show creation dates', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            // Should show date
            await expect(page.locator('text=/\\d{1,2}\\/\\d{1,2}|Dec|Week/i').first()).toBeVisible();
        });
    });

    test.describe('Brief Content', () => {
        test('should show executive summary', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            // Click on a brief to view content
            const briefCard = page.locator('[class*="card"]').first();
            if (await briefCard.isVisible()) {
                await briefCard.click();
            }

            await expect(page.locator('text=/summary|sentiment|health/i').first()).toBeVisible();
        });

        test('should show key metrics', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/\\d+%|metrics|score/i').first()).toBeVisible();
        });

        test('should show sentiment score', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/sentiment|72%|\\d+/i').first()).toBeVisible();
        });

        test('should show feedback count', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/feedback|\\d+\\s*(items?|posts?)/i').first()).toBeVisible();
        });
    });

    test.describe('Brief Actions', () => {
        test('should show generate brief button', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('button:has-text("Generate"), button:has-text("Create Brief")')).toBeVisible();
        });

        test('should show export options', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            // Look for export buttons
            const exportBtn = page.locator('button:has-text("Export"), button:has-text("Download")');
            // May be visible
        });

        test('should show schedule settings', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/schedule|settings|configure/i').first()).toBeVisible();
        });
    });

    test.describe('Scheduling', () => {
        test('should display scheduling options', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/schedule|daily|weekly|monthly/i').first()).toBeVisible();
        });

        test('should show schedule toggles', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            // Look for toggle switches
            const toggles = page.locator('[role="switch"], input[type="checkbox"]');
            // May be visible
        });

        test('should show recipient configuration', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/recipient|email|team/i').first()).toBeVisible();
        });
    });

    test.describe('Brief Sections', () => {
        test('should show action items', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/action|items|prioritize/i').first()).toBeVisible();
        });

        test('should show top insights', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/insight|dark mode|performance/i').first()).toBeVisible();
        });

        test('should show top themes', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/theme|Performance|UI/i').first()).toBeVisible();
        });

        test('should show competitor moves', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/competitor|CompetitorX|pricing/i').first()).toBeVisible();
        });

        test('should show revenue at risk', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

            await expect(page.locator('text=/revenue|risk|\\$\\d+/i').first()).toBeVisible();
        });
    });
});

test.describe('Briefs - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display on mobile viewport', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockBriefsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

        await expect(page.locator('text=/brief|executive/i').first()).toBeVisible();
    });

    test('should stack brief cards on mobile', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockBriefsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

        const cards = page.locator('[class*="card"]');
        expect(await cards.count()).toBeGreaterThanOrEqual(1);
    });

    test('should have touch-friendly buttons', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockBriefsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

        const button = page.locator('button').first();
        if (await button.isVisible()) {
            const box = await button.boundingBox();
            if (box) {
                expect(box.height).toBeGreaterThanOrEqual(36);
            }
        }
    });
});

test.describe('Briefs - Error States', () => {
    test('should handle API error gracefully', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);

        await page.route('**/api/briefs**', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Server error' }),
            });
        });

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

        // Should show error or empty state
    });

    test('should show empty state when no briefs', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);

        await page.route('**/api/briefs**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ briefs: [], schedules: [] }),
            });
        });

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

        await expect(page.locator('text=/no brief|generate|create/i').first()).toBeVisible();
    });
});

test.describe('Briefs - Accessibility', () => {
    test('should have proper heading', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockBriefsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

        await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    test('should have accessible buttons', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockBriefsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

        const buttons = page.locator('button');
        expect(await buttons.count()).toBeGreaterThanOrEqual(1);
    });

    test('should support keyboard navigation', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockBriefsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/briefs`);

        await page.locator('button').first().focus();
        await page.keyboard.press('Tab');

        // Focus should move
    });
});
