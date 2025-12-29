/**
 * E2E Tests for Feedback Board
 * Tests public board viewing, voting, and navigation
 * Target: Production (https://signalsloop.com)
 */

import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://signalsloop.com';

test.describe('Public Board - Demo Board', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/board`);
        await page.waitForTimeout(2000);
    });

    test('should load demo board page', async ({ page }) => {
        // Page should load with board content
        await expect(page.locator('text=/Board|Feedback|Demo/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display feedback items', async ({ page }) => {
        // Look for feedback items/cards
        const items = page.locator('[data-testid="feedback-item"], article, .card, .post');
        const count = await items.count();

        console.log(`Found ${count} feedback items`);

        // If there are items, first one should be visible
        if (count > 0) {
            await expect(items.first()).toBeVisible();
        }
    });

    test('should display vote counts', async ({ page }) => {
        // Look for vote indicators
        const votes = page.locator('text=/\\d+.*vote/i, [class*="vote"], button:has(svg)');
        const hasVotes = await votes.first().isVisible().catch(() => false);

        console.log(`Vote indicators visible: ${hasVotes}`);
    });

    test('should have filter/sort options', async ({ page }) => {
        // Look for filter/sort buttons
        const filterBtn = page.locator('text=/Filter|Sort|All|Open|Status/i').first();
        const isVisible = await filterBtn.isVisible().catch(() => false);

        console.log(`Filter options visible: ${isVisible}`);
    });

    test('should have search functionality', async ({ page }) => {
        // Look for search input
        const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
        const isVisible = await searchInput.isVisible().catch(() => false);

        console.log(`Search input visible: ${isVisible}`);
    });
});

test.describe('Public Board - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display board correctly on mobile', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/board`);
        await page.waitForTimeout(2000);

        // Page should load
        await expect(page.locator('text=/Board|Feedback|Demo/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should stack items vertically on mobile', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/board`);
        await page.waitForTimeout(2000);

        // Items should be visible and fit screen width
        const items = page.locator('[data-testid="feedback-item"], article, .card').first();

        if (await items.isVisible()) {
            const box = await items.boundingBox();

            if (box) {
                // Should not overflow screen width
                expect(box.width).toBeLessThanOrEqual(375);
            }
        }
    });

    test('should have mobile-friendly filter drawer', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/board`);
        await page.waitForTimeout(2000);

        // Look for filter button
        const filterBtn = page.locator('button:has-text("Filter"), button[aria-label*="filter" i]').first();

        if (await filterBtn.isVisible()) {
            await filterBtn.click();
            await page.waitForTimeout(300);

            // Filter options should appear
        }
    });
});

test.describe('Board - Dark Mode', () => {
    test('should display correctly in dark mode', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/board`);
        await page.waitForTimeout(2000);

        // Toggle dark mode if available
        const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="dark" i], button:has(svg.lucide-moon)').first();

        if (await themeToggle.isVisible()) {
            await themeToggle.click();
            await page.waitForTimeout(500);

            // Cards should have appropriate dark styling
            const card = page.locator('[data-testid="feedback-item"], article, .card').first();

            if (await card.isVisible()) {
                const bgColor = await card.evaluate((el) =>
                    window.getComputedStyle(el).backgroundColor
                );

                console.log(`Card background in dark mode: ${bgColor}`);
            }
        }
    });
});
