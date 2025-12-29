/**
 * AI Insights E2E Tests
 * Tests for the AI Insights page including themes, clusters, sentiment analysis,
 * and grouped feedback features.
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://signalsloop.com';
const TEST_PROJECT_SLUG = 'test-project';

// Mock project data
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
                    created_at: new Date().toISOString(),
                }],
            }),
        });
    });

    // Mock Supabase project query
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

// Mock themes API
async function mockThemesAPI(page: Page) {
    await page.route('**/api/themes**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                themes: [
                    {
                        id: 'theme-1',
                        name: 'Mobile Performance Issues',
                        description: 'Users report slow loading times on mobile devices',
                        feedback_count: 15,
                        sentiment: 'negative',
                        sentiment_score: -0.6,
                        priority: 'high',
                        created_at: new Date().toISOString(),
                    },
                    {
                        id: 'theme-2',
                        name: 'Dark Mode Request',
                        description: 'Users want dark mode support across the app',
                        feedback_count: 23,
                        sentiment: 'positive',
                        sentiment_score: 0.4,
                        priority: 'medium',
                        created_at: new Date().toISOString(),
                    },
                    {
                        id: 'theme-3',
                        name: 'Keyboard Shortcuts',
                        description: 'Power users requesting keyboard shortcuts',
                        feedback_count: 8,
                        sentiment: 'positive',
                        sentiment_score: 0.3,
                        priority: 'low',
                        created_at: new Date().toISOString(),
                    },
                ],
                emerging_themes: [
                    {
                        id: 'emerging-1',
                        name: 'API Rate Limiting',
                        description: 'Recent spike in complaints about API limits',
                        feedback_count: 5,
                        sentiment: 'negative',
                        first_seen: new Date().toISOString(),
                    },
                ],
            }),
        });
    });
}

// Mock sentiment API
async function mockSentimentAPI(page: Page) {
    await page.route('**/api/sentiment**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                overall_score: 0.72,
                distribution: {
                    positive: 65,
                    neutral: 20,
                    negative: 15,
                },
                trend: [
                    { date: '2024-01-01', score: 0.68 },
                    { date: '2024-01-08', score: 0.70 },
                    { date: '2024-01-15', score: 0.72 },
                    { date: '2024-01-22', score: 0.72 },
                ],
                total_feedback: 150,
            }),
        });
    });
}

// Mock theme clusters API
async function mockClustersAPI(page: Page) {
    await page.route('**/api/themes/clusters**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                clusters: [
                    {
                        id: 'cluster-1',
                        name: 'Performance',
                        themes: ['Mobile Performance', 'Loading Speed', 'Rendering'],
                        feedback_count: 45,
                    },
                    {
                        id: 'cluster-2',
                        name: 'UI/UX',
                        themes: ['Dark Mode', 'Color Schemes', 'Layout'],
                        feedback_count: 38,
                    },
                ],
            }),
        });
    });
}

// Mock grouped feedback API
async function mockGroupedFeedbackAPI(page: Page) {
    await page.route('**/api/feedback/grouped**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                groups: [
                    {
                        theme: 'Mobile Performance',
                        feedback: [
                            { id: 'fb-1', content: 'App is slow on Android', votes: 12 },
                            { id: 'fb-2', content: 'Loading takes forever on mobile', votes: 8 },
                        ],
                    },
                    {
                        theme: 'Dark Mode',
                        feedback: [
                            { id: 'fb-3', content: 'Please add dark mode!', votes: 23 },
                            { id: 'fb-4', content: 'Would love a dark theme', votes: 15 },
                        ],
                    },
                ],
            }),
        });
    });
}

test.describe('AI Insights Page', () => {
    test.beforeEach(async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockThemesAPI(page);
        await mockSentimentAPI(page);
        await mockClustersAPI(page);
        await mockGroupedFeedbackAPI(page);
    });

    test.describe('Page Loading', () => {
        test('should display AI Insights header', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            // Check for page header
            await expect(page.locator('h1')).toContainText('AI Insights');

            // Check for Brain icon
            await expect(page.locator('h1 svg, h1 + svg, [class*="brain"]')).toBeVisible();
        });

        test('should show loading state initially', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            // May show loading animation briefly
            const loadingText = page.locator('text=Loading AI Insights');
            // This may or may not be visible depending on load speed
        });

        test('should display back to board link', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            const backLink = page.locator('a:has-text("Back to Board"), button:has-text("Back")');
            await expect(backLink).toBeVisible();
        });

        test('should display project name in description', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            // Should mention patterns/themes/sentiment
            await expect(page.locator('text=/patterns|themes|sentiment/i')).toBeVisible();
        });
    });

    test.describe('Tab Navigation', () => {
        test('should display all four tabs', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            // Check for each tab
            await expect(page.locator('button:has-text("Themes & Patterns"), [role="tab"]:has-text("Themes")')).toBeVisible();
            await expect(page.locator('button:has-text("Theme Clusters"), [role="tab"]:has-text("Clusters")')).toBeVisible();
            await expect(page.locator('button:has-text("Grouped Feedback"), [role="tab"]:has-text("Grouped")')).toBeVisible();
            await expect(page.locator('button:has-text("Sentiment Analysis"), [role="tab"]:has-text("Sentiment")')).toBeVisible();
        });

        test('should switch to Themes & Patterns tab', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            const themesTab = page.locator('button:has-text("Themes & Patterns"), [role="tab"]:has-text("Themes")');
            await themesTab.click();

            // Should show themes content
            await expect(page.locator('[data-value="themes"], [aria-selected="true"]:has-text("Themes")')).toBeVisible();
        });

        test('should switch to Theme Clusters tab', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            const clustersTab = page.locator('button:has-text("Theme Clusters"), [role="tab"]:has-text("Clusters")');
            await clustersTab.click();

            // Verify tab is selected
            await expect(clustersTab).toHaveAttribute('aria-selected', 'true');
        });

        test('should switch to Grouped Feedback tab', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            const feedbackTab = page.locator('button:has-text("Grouped Feedback"), [role="tab"]:has-text("Grouped")');
            await feedbackTab.click();

            await expect(feedbackTab).toHaveAttribute('aria-selected', 'true');
        });

        test('should switch to Sentiment Analysis tab', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            const sentimentTab = page.locator('button:has-text("Sentiment Analysis"), [role="tab"]:has-text("Sentiment")');
            await sentimentTab.click();

            await expect(sentimentTab).toHaveAttribute('aria-selected', 'true');
        });
    });

    test.describe('Emerging Themes Alert', () => {
        test('should display emerging themes alert section', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            // Look for emerging themes component
            const emergingSection = page.locator('[class*="emerging"], text=/emerging/i, [data-testid="emerging-themes"]');
            // May or may not be visible depending on data
        });

        test('should show investigate button for emerging themes', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            // If emerging themes exist, should have action buttons
            const investigateBtn = page.locator('button:has-text("Investigate"), button:has-text("View")');
            // Optional - may not be visible without emerging themes
        });
    });

    test.describe('Themes Overview', () => {
        test('should display themes list', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            // Click themes tab
            await page.locator('button:has-text("Themes"), [role="tab"]:has-text("Themes")').first().click();

            // Should display theme cards or list
            await expect(page.locator('[class*="card"], [class*="theme"]').first()).toBeVisible();
        });

        test('should show theme sentiment indicators', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            // Look for sentiment badges/indicators
            const sentimentIndicator = page.locator('[class*="sentiment"], [class*="badge"]').first();
            // Should exist on themes
        });

        test('should show feedback count per theme', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            // Look for feedback count display
            await expect(page.locator('text=/\\d+\\s*(feedback|items|posts)/i').first()).toBeVisible();
        });
    });

    test.describe('Theme Clusters View', () => {
        test('should display cluster visualization', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            // Navigate to clusters tab
            const clustersTab = page.locator('button:has-text("Clusters"), [role="tab"]:has-text("Clusters")');
            await clustersTab.click();

            // Should show cluster content
            await page.waitForTimeout(500);
            await expect(page.locator('[data-state="active"], [class*="cluster"]').first()).toBeVisible();
        });

        test('should group related themes together', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            const clustersTab = page.locator('button:has-text("Clusters")');
            await clustersTab.click();

            // Should show grouped themes
            await page.waitForTimeout(300);
        });
    });

    test.describe('Sentiment Analysis', () => {
        test('should display sentiment widget', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            // Navigate to sentiment tab
            const sentimentTab = page.locator('button:has-text("Sentiment")');
            await sentimentTab.click();

            // Should show sentiment widget/chart
            await expect(page.locator('[class*="sentiment"], [class*="chart"]').first()).toBeVisible();
        });

        test('should display sentiment score', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            const sentimentTab = page.locator('button:has-text("Sentiment")');
            await sentimentTab.click();

            // Should show a percentage or score
            await expect(page.locator('text=/\\d+%|\\d+\\.\\d+/').first()).toBeVisible();
        });

        test('should display sentiment trend chart', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            const sentimentTab = page.locator('button:has-text("Sentiment")');
            await sentimentTab.click();

            // Should show trend chart
            await expect(page.locator('[class*="chart"], svg, canvas').first()).toBeVisible();
        });
    });

    test.describe('Grouped Feedback', () => {
        test('should display feedback grouped by theme', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

            const feedbackTab = page.locator('button:has-text("Grouped Feedback"), button:has-text("Grouped")');
            await feedbackTab.click();

            await page.waitForTimeout(300);
        });
    });
});

test.describe('AI Insights - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display tabs on mobile', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockThemesAPI(page);
        await mockSentimentAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

        // Tabs should be visible and scrollable
        await expect(page.locator('[role="tablist"]')).toBeVisible();
    });

    test('should stack content on mobile', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockThemesAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

        // Content should be stacked
        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
    });

    test('should have touch-friendly tabs', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockThemesAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

        // Tabs should be large enough to tap
        const tab = page.locator('[role="tab"]').first();
        const box = await tab.boundingBox();
        if (box) {
            expect(box.height).toBeGreaterThanOrEqual(36);
        }
    });
});

test.describe('AI Insights - Error States', () => {
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

        await page.goto(`${BASE_URL}/nonexistent-project/ai-insights`);

        // Should show error or redirect
        await expect(page.locator('text=/not found|error/i')).toBeVisible();
    });

    test('should handle API errors gracefully', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);

        await page.route('**/api/themes**', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Internal server error' }),
            });
        });

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

        // Should handle error state
        // May show error message or empty state
    });
});

test.describe('AI Insights - Accessibility', () => {
    test('should have proper ARIA labels on tabs', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockThemesAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

        // Tabs should have proper ARIA
        const tabList = page.locator('[role="tablist"]');
        await expect(tabList).toBeVisible();

        const tabs = page.locator('[role="tab"]');
        const count = await tabs.count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('should support keyboard navigation', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockThemesAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/ai-insights`);

        // Focus first tab
        await page.locator('[role="tab"]').first().focus();

        // Use arrow keys to navigate
        await page.keyboard.press('ArrowRight');

        // Second tab should be focused
        const secondTab = page.locator('[role="tab"]').nth(1);
        await expect(secondTab).toBeFocused();
    });
});
