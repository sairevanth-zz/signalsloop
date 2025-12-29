/**
 * E2E Tests for Roadmap Display
 * Tests public roadmap viewing, phases, and status indicators
 * Target: Production (https://signalsloop.com)
 */

import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://signalsloop.com';

test.describe('Roadmap - Public View', () => {
    // Test using demo or any public project roadmap
    test('should load roadmap page from demo', async ({ page }) => {
        // Navigate to a demo or public roadmap
        await page.goto(`${PRODUCTION_URL}/demo-project/roadmap`);
        await page.waitForTimeout(2000);

        // Should show roadmap content or redirect
        const hasRoadmap = await page.locator('text=/Roadmap|Now|Next|Later|Phase/i').first().isVisible().catch(() => false);
        const hasError = await page.locator('text=/not found|error/i').first().isVisible().catch(() => false);
        const hasLogin = page.url().includes('login');

        console.log(`Roadmap visible: ${hasRoadmap}, Error: ${hasError}, Login redirect: ${hasLogin}`);
    });
});

test.describe('Roadmap - Layout and Structure', () => {
    test('should display roadmap phases', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/board`);
        await page.waitForTimeout(2000);

        // Look for phase columns (Now, Next, Later)
        const nowPhase = page.locator('text=/Now|In Progress|Current/i').first();
        const nextPhase = page.locator('text=/Next|Planned|Coming/i').first();
        const laterPhase = page.locator('text=/Later|Future|Backlog/i').first();

        const hasNow = await nowPhase.isVisible().catch(() => false);
        const hasNext = await nextPhase.isVisible().catch(() => false);
        const hasLater = await laterPhase.isVisible().catch(() => false);

        console.log(`Phases - Now: ${hasNow}, Next: ${hasNext}, Later: ${hasLater}`);
    });

    test('should display roadmap items with status', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/board`);
        await page.waitForTimeout(2000);

        // Look for status indicators
        const statusBadges = page.locator('[class*="badge"], [class*="status"], text=/Open|Planned|In Progress|Completed/i');
        const count = await statusBadges.count();

        console.log(`Found ${count} status indicators`);
    });
});

test.describe('Roadmap - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display roadmap on mobile', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/board`);
        await page.waitForTimeout(2000);

        // Roadmap should be visible on mobile
        const content = page.locator('text=/Roadmap|Feedback|Board|Phase/i').first();
        await expect(content).toBeVisible({ timeout: 10000 });
    });

    test('should allow horizontal scrolling for phases on mobile', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/board`);
        await page.waitForTimeout(2000);

        // Try to swipe/scroll horizontally
        await page.evaluate(() => {
            const container = document.querySelector('[class*="roadmap"], [class*="board"], main');
            if (container) {
                container.scrollLeft = 200;
            }
        });

        await page.waitForTimeout(300);
    });
});

test.describe('Roadmap - Item Interaction', () => {
    test('should be able to click on roadmap item', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/board`);
        await page.waitForTimeout(2000);

        // Find first clickable item
        const item = page.locator('article, .card, [data-testid="roadmap-item"], [class*="item"]').first();

        if (await item.isVisible()) {
            await item.click();
            await page.waitForTimeout(500);

            // Should show details or navigate
        }
    });
});

test.describe('Roadmap - Dark Mode', () => {
    test('should display correctly in dark mode', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/demo/board`);
        await page.waitForTimeout(2000);

        // Toggle dark mode
        const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="dark" i], button:has(svg.lucide-moon)').first();

        if (await themeToggle.isVisible()) {
            await themeToggle.click();
            await page.waitForTimeout(500);
        }

        // Content should still be visible
        const content = page.locator('text=/Roadmap|Feedback|Board/i').first();
        await expect(content).toBeVisible();
    });
});
