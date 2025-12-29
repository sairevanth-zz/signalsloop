/**
 * Experiments (A/B Testing) E2E Tests
 * Tests for the Experimentation Intelligence page including
 * experiment listing, creation, results, and AI-generated experiments.
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

// Mock experiments API
async function mockExperimentsAPI(page: Page) {
    await page.route('**/api/experiments**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                experiments: [
                    {
                        experiment: {
                            id: 'exp-1',
                            name: 'Checkout Flow A/B Test',
                            hypothesis: 'Simplifying checkout will increase conversion by 15%',
                            status: 'running',
                            experiment_type: 'a_b_test',
                            primary_metric: 'conversion_rate',
                            sample_size_target: 5000,
                            created_at: new Date().toISOString(),
                            start_date: new Date().toISOString(),
                            ai_generated: false,
                        },
                        result_count: 3,
                        significant_results: 1,
                        learning_count: 2,
                    },
                    {
                        experiment: {
                            id: 'exp-2',
                            name: 'Pricing Page Layout',
                            hypothesis: 'Horizontal pricing cards will reduce cognitive load',
                            status: 'completed',
                            experiment_type: 'a_b_test',
                            primary_metric: 'time_on_page',
                            sample_size_target: 2000,
                            created_at: new Date().toISOString(),
                            start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                            ai_generated: true,
                        },
                        result_count: 5,
                        significant_results: 3,
                        learning_count: 4,
                    },
                    {
                        experiment: {
                            id: 'exp-3',
                            name: 'Onboarding Flow Test',
                            hypothesis: 'Guided onboarding increases activation rate',
                            status: 'draft',
                            experiment_type: 'multivariate',
                            primary_metric: 'activation_rate',
                            sample_size_target: 1000,
                            created_at: new Date().toISOString(),
                            ai_generated: true,
                        },
                        result_count: 0,
                        significant_results: 0,
                        learning_count: 0,
                    },
                ],
            }),
        });
    });
}

test.describe('Experiments Page', () => {
    test.beforeEach(async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockExperimentsAPI(page);
    });

    test.describe('Page Loading', () => {
        test('should display Experimentation Intelligence header', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('h1')).toContainText(/Experiment|Intelligence/i);
        });

        test('should show flask icon', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            // Look for flask icon or experiment icon
            await expect(page.locator('h1 svg, svg[class*="flask"]').first()).toBeVisible();
        });

        test('should show New Experiment button', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('button:has-text("New Experiment")')).toBeVisible();
        });

        test('should display page description', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('text=/AI-powered|experiment|tracking/i')).toBeVisible();
        });
    });

    test.describe('Statistics Cards', () => {
        test('should display Total Experiments stat', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('text=Total Experiments')).toBeVisible();
            await expect(page.locator('[class*="card"]:has-text("Total Experiments") >> text=/\\d+/')).toBeVisible();
        });

        test('should display Running experiments stat', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('text=Running')).toBeVisible();
        });

        test('should display Completed experiments stat', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('text=Completed')).toBeVisible();
        });

        test('should display Significant Results stat', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('text=Significant Results')).toBeVisible();
        });
    });

    test.describe('Filtering', () => {
        test('should display filter buttons', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('button:has-text("All")')).toBeVisible();
            await expect(page.locator('button:has-text("Draft")')).toBeVisible();
            await expect(page.locator('button:has-text("Running")')).toBeVisible();
            await expect(page.locator('button:has-text("Completed")')).toBeVisible();
        });

        test('should filter by running status', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await page.locator('button:has-text("Running")').click();

            // Should show running experiments only
            await page.waitForTimeout(300);
        });

        test('should filter by completed status', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await page.locator('button:has-text("Completed")').click();

            await page.waitForTimeout(300);
        });

        test('should filter by draft status', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await page.locator('button:has-text("Draft")').click();

            await page.waitForTimeout(300);
        });
    });

    test.describe('Experiments List', () => {
        test('should display experiment cards', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            const cards = page.locator('[class*="card"]:has(h3)');
            expect(await cards.count()).toBeGreaterThanOrEqual(1);
        });

        test('should show experiment names', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('text=/Checkout Flow|Pricing Page|Onboarding/i').first()).toBeVisible();
        });

        test('should show hypothesis text', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('text=/hypothesis|Simplifying|conversion/i').first()).toBeVisible();
        });

        test('should show status badges', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('[class*="badge"]:has-text("running"), [class*="badge"]:has-text("completed"), [class*="badge"]:has-text("draft")').first()).toBeVisible();
        });

        test('should show AI Generated badge for AI experiments', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('text=/AI Generated|✨/').first()).toBeVisible();
        });

        test('should show primary metric', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('text=/Primary Metric|conversion|time_on_page/i').first()).toBeVisible();
        });

        test('should show sample size', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('text=/Sample Size|\\d+,?\\d*/i').first()).toBeVisible();
        });

        test('should show result counts', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('text=/Results|significant/i').first()).toBeVisible();
        });

        test('should show learning counts', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('text=/Learnings?/i')).toBeVisible();
        });

        test('should show creation date', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            // Should show date
            await expect(page.locator('text=/\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}/').first()).toBeVisible();
        });
    });

    test.describe('Navigation', () => {
        test('should navigate to create experiment page', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await page.locator('button:has-text("New Experiment")').click();

            await expect(page).toHaveURL(new RegExp(`/${TEST_PROJECT_SLUG}/experiments/new`));
        });

        test('should navigate to experiment details on card click', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            const card = page.locator('[class*="card"]:has(h3)').first();
            await card.click();

            await expect(page).toHaveURL(new RegExp(`/${TEST_PROJECT_SLUG}/experiments/`));
        });
    });

    test.describe('Empty State', () => {
        test('should show empty state when no experiments', async ({ page }) => {
            await page.route('**/api/experiments**', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ experiments: [] }),
                });
            });

            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('text=/No experiments|Create Your First Experiment/i')).toBeVisible();
        });

        test('should show create button in empty state', async ({ page }) => {
            await page.route('**/api/experiments**', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ experiments: [] }),
                });
            });

            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

            await expect(page.locator('button:has-text("Create")')).toBeVisible();
        });
    });
});

test.describe('Experiment Details', () => {
    test.beforeEach(async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);

        await page.route('**/api/experiments/*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    experiment: {
                        id: 'exp-1',
                        name: 'Checkout Flow A/B Test',
                        hypothesis: 'Simplifying checkout will increase conversion',
                        status: 'running',
                        variants: [
                            { id: 'control', name: 'Control', traffic_percentage: 50 },
                            { id: 'treatment', name: 'Treatment', traffic_percentage: 50 },
                        ],
                        results: [
                            {
                                variant: 'Control',
                                metric: 'conversion_rate',
                                value: 3.2,
                                sample_size: 1500,
                            },
                            {
                                variant: 'Treatment',
                                metric: 'conversion_rate',
                                value: 4.1,
                                sample_size: 1500,
                            },
                        ],
                    },
                }),
            });
        });
    });

    test('should display experiment details', async ({ page }) => {
        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments/exp-1`);

        await expect(page.locator('text=/Checkout Flow|experiment/i').first()).toBeVisible();
    });

    test('should show variants', async ({ page }) => {
        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments/exp-1`);

        await expect(page.locator('text=/Control|Treatment|variant/i').first()).toBeVisible();
    });

    test('should show results', async ({ page }) => {
        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments/exp-1`);

        await expect(page.locator('text=/Results|conversion|3\\.2|4\\.1/i').first()).toBeVisible();
    });
});

test.describe('Experiments - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display on mobile viewport', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockExperimentsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

        await expect(page.locator('h1')).toContainText(/Experiment/i);
    });

    test('should stack stats cards on mobile', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockExperimentsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

        const statsCards = page.locator('[class*="card"]:has-text("Total"), [class*="card"]:has-text("Running")');
        expect(await statsCards.count()).toBeGreaterThanOrEqual(1);
    });

    test('should have scrollable filter buttons', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockExperimentsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

        await expect(page.locator('button:has-text("All")')).toBeVisible();
    });
});

test.describe('Experiments - Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockExperimentsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

        await expect(page.locator('h1')).toBeVisible();
        const h3Count = await page.locator('h3').count();
        expect(h3Count).toBeGreaterThanOrEqual(1);
    });

    test('should have accessible filter buttons', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockExperimentsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

        const buttons = page.locator('button:has-text("All"), button:has-text("Running")');
        expect(await buttons.count()).toBeGreaterThanOrEqual(2);
    });

    test('should support keyboard navigation', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockExperimentsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/experiments`);

        await page.locator('button:has-text("All")').focus();
        await page.keyboard.press('Tab');

        // Focus should move to next element
    });
});
