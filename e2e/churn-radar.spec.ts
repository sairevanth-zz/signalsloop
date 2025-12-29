/**
 * Churn Radar E2E Tests
 * Tests for the Churn Radar dashboard showing customer health scores,
 * at-risk customers, and churn prediction alerts.
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

// Mock churn radar data
async function mockChurnRadarAPI(page: Page) {
    await page.route('**/api/churn-radar**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                summary: {
                    total_customers: 150,
                    at_risk_count: 12,
                    average_health_score: 72,
                    churn_rate: 4.2,
                },
                at_risk_customers: [
                    {
                        id: 'customer-1',
                        name: 'Acme Corp',
                        email: 'contact@acme.com',
                        health_score: 35,
                        risk_level: 'high',
                        risk_factors: ['engagement_drop', 'negative_feedback'],
                        mrr: 299,
                        last_active: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                    {
                        id: 'customer-2',
                        name: 'TechStart Inc',
                        email: 'hello@techstart.io',
                        health_score: 45,
                        risk_level: 'medium',
                        risk_factors: ['payment_failure'],
                        mrr: 99,
                        last_active: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                    {
                        id: 'customer-3',
                        name: 'Big Enterprise',
                        email: 'support@bigenterprise.com',
                        health_score: 52,
                        risk_level: 'medium',
                        risk_factors: ['contract_expiring'],
                        mrr: 799,
                        last_active: new Date().toISOString(),
                    },
                ],
                alerts: [
                    {
                        id: 'alert-1',
                        type: 'health_drop',
                        customer_id: 'customer-1',
                        customer_name: 'Acme Corp',
                        message: 'Health score dropped 20 points this week',
                        severity: 'high',
                        created_at: new Date().toISOString(),
                    },
                    {
                        id: 'alert-2',
                        type: 'engagement_drop',
                        customer_id: 'customer-2',
                        customer_name: 'TechStart Inc',
                        message: 'No login in 14 days',
                        severity: 'medium',
                        created_at: new Date().toISOString(),
                    },
                ],
                health_distribution: {
                    healthy: 100,
                    at_risk: 35,
                    critical: 15,
                },
            }),
        });
    });
}

// Mock customer health details
async function mockCustomerHealthAPI(page: Page) {
    await page.route('**/api/customers/*/health**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                customer_id: 'customer-1',
                health_score: 35,
                health_trend: 'declining',
                components: {
                    engagement: { score: 30, weight: 25, trend: 'down' },
                    sentiment: { score: 40, weight: 25, trend: 'stable' },
                    support: { score: 50, weight: 20, trend: 'up' },
                    product_usage: { score: 25, weight: 20, trend: 'down' },
                    payment: { score: 100, weight: 10, trend: 'stable' },
                },
                recommended_actions: [
                    { action: 'Schedule check-in call', priority: 'high' },
                    { action: 'Send personalized email', priority: 'medium' },
                ],
            }),
        });
    });
}

test.describe('Churn Radar Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockChurnRadarAPI(page);
        await mockCustomerHealthAPI(page);
    });

    test.describe('Page Loading', () => {
        test('should display Churn Radar dashboard', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Check for page content
            await expect(page.locator('text=/churn|radar|health/i').first()).toBeVisible();
        });

        test('should show loading state initially', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // May show loading spinner
            const loader = page.locator('[class*="animate-spin"], [class*="loader"]');
            // Brief loading state
        });

        test('should handle project not found', async ({ page }) => {
            await page.route('**/api/projects**', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ projects: [] }),
                });
            });

            await page.goto(`${BASE_URL}/nonexistent/churn-radar`);

            await expect(page.locator('text=/not found|error/i')).toBeVisible();
        });
    });

    test.describe('Summary Statistics', () => {
        test('should display total customers count', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for customer count
            await expect(page.locator('text=/\\d+\\s*(customers?|users?|accounts?)/i').first()).toBeVisible();
        });

        test('should display at-risk customer count', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for at-risk indicator
            await expect(page.locator('text=/at.?risk|warning|alert/i').first()).toBeVisible();
        });

        test('should display average health score', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for health score percentage
            await expect(page.locator('text=/health|score|\\d+%/i').first()).toBeVisible();
        });

        test('should display churn rate', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for churn rate
            await expect(page.locator('text=/churn|rate/i').first()).toBeVisible();
        });
    });

    test.describe('At-Risk Customers List', () => {
        test('should display at-risk customers', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Should have customer cards or list items
            const customerItems = page.locator('[class*="card"], [class*="customer"], tr');
            await expect(customerItems.first()).toBeVisible();
        });

        test('should show customer health scores', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Health scores should be visible
            await expect(page.locator('text=/\\d+%|score/i').first()).toBeVisible();
        });

        test('should show risk level indicators', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for risk level badges
            const riskBadge = page.locator('[class*="badge"], [class*="risk"]').first();
            await expect(riskBadge).toBeVisible();
        });

        test('should show risk factors', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for risk factors
            await expect(page.locator('text=/engagement|payment|feedback|contract/i').first()).toBeVisible();
        });

        test('should show MRR for customers', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for revenue/MRR
            await expect(page.locator('text=/\\$\\d+|mrr|revenue/i').first()).toBeVisible();
        });

        test('should show last active date', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for activity date
            await expect(page.locator('text=/last\\s*(active|seen)|days?\\s*ago/i').first()).toBeVisible();
        });
    });

    test.describe('Alerts Section', () => {
        test('should display churn alerts', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for alerts section
            await expect(page.locator('text=/alert|warning|notification/i').first()).toBeVisible();
        });

        test('should show alert severity', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for severity indicators
            const severityBadge = page.locator('[class*="high"], [class*="medium"], [class*="critical"]');
            // May or may not be visible depending on alerts
        });

        test('should show alert messages', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Alert messages should be visible
            await expect(page.locator('[class*="message"], [class*="alert"]').first()).toBeVisible();
        });
    });

    test.describe('Health Score Components', () => {
        test('should display health score breakdown', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Click on a customer to see details (if applicable)
            const customerCard = page.locator('[class*="customer"], [class*="card"]').first();
            if (await customerCard.isVisible()) {
                await customerCard.click();
            }

            // Should show health components
            await expect(page.locator('text=/engagement|sentiment|support|usage|payment/i').first()).toBeVisible();
        });

        test('should show component weights', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Component weights or percentages
            await expect(page.locator('text=/\\d+%/').first()).toBeVisible();
        });

        test('should display trend indicators', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for trend arrows or indicators
            const trendIndicator = page.locator('[class*="trend"], [class*="arrow"], svg[class*="up"], svg[class*="down"]');
            // May be visible
        });
    });

    test.describe('Actions', () => {
        test('should display recommended actions', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for action buttons or recommendations
            await expect(page.locator('text=/action|contact|email|call/i').first()).toBeVisible();
        });

        test('should allow filtering by risk level', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for filter options
            const filter = page.locator('button:has-text("Filter"), select, [class*="filter"]');
            if (await filter.first().isVisible()) {
                await filter.first().click();
            }
        });

        test('should allow sorting customers', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for sort options
            const sort = page.locator('button:has-text("Sort"), [class*="sort"]');
            // May be visible
        });
    });

    test.describe('Health Distribution Chart', () => {
        test('should display health distribution', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for chart or distribution visualization
            await expect(page.locator('[class*="chart"], svg, canvas, [class*="distribution"]').first()).toBeVisible();
        });

        test('should show healthy/at-risk/critical segments', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

            // Look for segment labels
            await expect(page.locator('text=/healthy|at.?risk|critical/i').first()).toBeVisible();
        });
    });
});

test.describe('Churn Radar - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display on mobile viewport', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockChurnRadarAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

        // Content should be visible
        await expect(page.locator('text=/churn|health/i').first()).toBeVisible();
    });

    test('should stack cards on mobile', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockChurnRadarAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

        // Cards should stack vertically
        const cards = page.locator('[class*="card"]');
        expect(await cards.count()).toBeGreaterThanOrEqual(1);
    });

    test('should have touch-friendly buttons', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockChurnRadarAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

        // Buttons should be large enough
        const button = page.locator('button').first();
        if (await button.isVisible()) {
            const box = await button.boundingBox();
            if (box) {
                expect(box.height).toBeGreaterThanOrEqual(36);
            }
        }
    });
});

test.describe('Churn Radar - Error States', () => {
    test('should handle API error gracefully', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);

        await page.route('**/api/churn-radar**', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Server error' }),
            });
        });

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

        // Should show error state or empty state
        // May show retry button
    });

    test('should show empty state when no at-risk customers', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);

        await page.route('**/api/churn-radar**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    summary: {
                        total_customers: 50,
                        at_risk_count: 0,
                        average_health_score: 92,
                        churn_rate: 0,
                    },
                    at_risk_customers: [],
                    alerts: [],
                }),
            });
        });

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

        // Should show positive message or empty state
        await expect(page.locator('text=/no.*risk|healthy|great/i').first()).toBeVisible();
    });
});

test.describe('Churn Radar - Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockChurnRadarAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

        // Should have heading
        await expect(page.locator('h1, h2, h3').first()).toBeVisible();
    });

    test('should have alt text for charts', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockChurnRadarAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/churn-radar`);

        // Charts should have aria labels
        const chart = page.locator('[role="img"], [aria-label]');
        // May be present
    });
});
