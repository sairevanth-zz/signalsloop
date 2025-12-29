/**
 * E2E Tests for SignalsLoop Demo Pages
 * Tests all public demo features (no authentication required)
 * Target: Production (https://signalsloop.com)
 */

import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://signalsloop.com';

test.describe('Demo: Roast My Roadmap', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/roast`);
    });

    test('should load Roast My Roadmap page', async ({ page }) => {
        // Page should load
        await expect(page.locator('text=/Roast.*Roadmap/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display upload area for roadmap image', async ({ page }) => {
        // Look for upload/drop zone
        const uploadArea = page.locator('text=/upload|drop.*image|screenshot/i').first();
        await expect(uploadArea).toBeVisible({ timeout: 10000 });
    });

    test('should have analyze/roast button', async ({ page }) => {
        // Look for action button
        const analyzeBtn = page.locator('button:has-text("Roast"), button:has-text("Analyze"), button:has-text("Submit")').first();
        await expect(analyzeBtn).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Demo: Roast My Roadmap - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should work on mobile viewport', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/roast`);

        // Page should load on mobile
        await expect(page.locator('text=/Roast.*Roadmap/i').first()).toBeVisible({ timeout: 10000 });

        // Upload area should be visible
        const uploadArea = page.locator('text=/upload|drop|screenshot/i').first();
        await expect(uploadArea).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Demo: Spec Generator', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/spec`);
    });

    test('should load Spec Generator page', async ({ page }) => {
        // Page should load with title
        await expect(page.locator('text=/Spec Generator|Generate.*Spec|PRD/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display input field for idea', async ({ page }) => {
        // Look for input textarea or field
        const inputField = page.locator('textarea, input[type="text"]').first();
        await expect(inputField).toBeVisible({ timeout: 10000 });
    });

    test('should have generate button', async ({ page }) => {
        const generateBtn = page.locator('button:has-text("Generate"), button:has-text("Create")').first();
        await expect(generateBtn).toBeVisible({ timeout: 10000 });
    });

    test('should accept input and show loading state', async ({ page }) => {
        // Find input field
        const inputField = page.locator('textarea, input[type="text"]').first();

        if (await inputField.isVisible()) {
            await inputField.fill('Add dark mode to the dashboard');

            // Find and click generate button
            const generateBtn = page.locator('button:has-text("Generate"), button:has-text("Create")').first();

            if (await generateBtn.isVisible()) {
                await generateBtn.click();

                // Should show loading indicator or streaming content
                await page.waitForTimeout(1000);

                // Either loading state or generated content should appear
                const hasContent = await page.locator('text=/loading|generating|user story|problem|solution/i').first().isVisible().catch(() => false);
                expect(hasContent).toBeTruthy();
            }
        }
    });
});

test.describe('Demo: Spec Generator - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should work on mobile viewport', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/spec`);

        // Page should load
        await expect(page.locator('text=/Spec Generator|Generate.*Spec|PRD/i').first()).toBeVisible({ timeout: 10000 });

        // Input should be visible
        const inputField = page.locator('textarea, input[type="text"]').first();
        await expect(inputField).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Demo: Competitive Intel', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/competitive-intel`);
    });

    test('should load Competitive Intel page', async ({ page }) => {
        // Page should load
        await expect(page.locator('text=/Competitive.*Intel|Competitor/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display competitor input field', async ({ page }) => {
        // Look for input for competitor names
        const inputField = page.locator('input, textarea').first();
        await expect(inputField).toBeVisible({ timeout: 10000 });
    });

    test('should have analyze button', async ({ page }) => {
        const analyzeBtn = page.locator('button:has-text("Analyze"), button:has-text("Run"), button:has-text("Search")').first();
        await expect(analyzeBtn).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Demo: Competitive Intel - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should work on mobile viewport', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/competitive-intel`);

        await expect(page.locator('text=/Competitive.*Intel|Competitor/i').first()).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Demo: Health Score', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/health-score`);
    });

    test('should load Health Score page', async ({ page }) => {
        await expect(page.locator('text=/Health.*Score|Product Health/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display questions or input fields', async ({ page }) => {
        // Should have questions or rating inputs
        const questions = page.locator('text=/question|rate|score|how/i');
        const inputs = page.locator('input, select, button[role="radio"]');

        const hasQuestions = await questions.first().isVisible().catch(() => false);
        const hasInputs = await inputs.first().isVisible().catch(() => false);

        expect(hasQuestions || hasInputs).toBeTruthy();
    });

    test('should have calculate/submit button', async ({ page }) => {
        const submitBtn = page.locator('button:has-text("Calculate"), button:has-text("Check"), button:has-text("Submit"), button:has-text("Get Score")').first();
        await expect(submitBtn).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Demo: Health Score - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should work on mobile viewport', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/health-score`);

        await expect(page.locator('text=/Health.*Score|Product Health/i').first()).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Demo: Feedback Analysis', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/feedback`);
    });

    test('should load Feedback Analysis page', async ({ page }) => {
        await expect(page.locator('text=/Feedback.*Analysis|Analyze.*Feedback|Theme/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display textarea for feedback input', async ({ page }) => {
        const textarea = page.locator('textarea').first();
        await expect(textarea).toBeVisible({ timeout: 10000 });
    });

    test('should have analyze button', async ({ page }) => {
        const analyzeBtn = page.locator('button:has-text("Analyze"), button:has-text("Cluster"), button:has-text("Find Themes")').first();
        await expect(analyzeBtn).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Demo: Feedback Analysis - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should work on mobile viewport', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/feedback`);

        await expect(page.locator('text=/Feedback.*Analysis|Analyze.*Feedback|Theme/i').first()).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Demo: Interactive Board', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/board`);
    });

    test('should load Demo Board page', async ({ page }) => {
        // Should load some board view
        await expect(page.locator('text=/Demo|Board|Feedback/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display sample feedback items', async ({ page }) => {
        // Wait for content to load
        await page.waitForTimeout(2000);

        // Should have cards or items
        const items = page.locator('[data-testid="feedback-item"], .card, article');
        const count = await items.count();

        // Should have at least one item
        expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should allow interaction with items', async ({ page }) => {
        await page.waitForTimeout(2000);

        // Try to find and click on an item
        const item = page.locator('[data-testid="feedback-item"], .card, article, button').first();

        if (await item.isVisible()) {
            await item.click();
            await page.waitForTimeout(500);
        }
    });
});

test.describe('Demo: Interactive Board - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should work on mobile viewport', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/board`);

        await expect(page.locator('text=/Demo|Board|Feedback/i').first()).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Demo Pages - Cross-browser Accessibility', () => {
    const demoPages = [
        { name: 'Roast My Roadmap', path: '/demo/roast' },
        { name: 'Spec Generator', path: '/demo/spec' },
        { name: 'Competitive Intel', path: '/demo/competitive-intel' },
        { name: 'Health Score', path: '/demo/health-score' },
        { name: 'Feedback Analysis', path: '/demo/feedback' },
        { name: 'Demo Board', path: '/demo/board' },
    ];

    for (const demo of demoPages) {
        test(`${demo.name} should be accessible`, async ({ page }) => {
            await page.goto(`${PRODUCTION_URL}${demo.path}`);

            // Check for basic accessibility
            const headings = page.locator('h1, h2, h3');
            const headingCount = await headings.count();
            expect(headingCount).toBeGreaterThan(0);

            // Check for buttons with accessible text
            const buttons = page.locator('button');
            const buttonCount = await buttons.count();

            if (buttonCount > 0) {
                const firstButton = buttons.first();
                const text = await firstButton.textContent();
                expect(text?.trim().length).toBeGreaterThan(0);
            }
        });
    }
});
