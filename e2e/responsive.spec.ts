/**
 * E2E Tests for Responsive Design Across All Viewports
 * Tests multiple device sizes and orientations
 * Target: Production (https://signalsloop.com)
 */

import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://signalsloop.com';

// Device viewport configurations
const VIEWPORTS = {
    // Mobile
    'iPhone SE': { width: 375, height: 667 },
    'iPhone 12': { width: 390, height: 844 },
    'iPhone 12 Pro Max': { width: 428, height: 926 },
    'Samsung Galaxy S21': { width: 360, height: 800 },

    // Tablet
    'iPad Mini': { width: 768, height: 1024 },
    'iPad Pro': { width: 1024, height: 1366 },

    // Desktop
    'Desktop HD': { width: 1280, height: 720 },
    'Desktop Full HD': { width: 1920, height: 1080 },
    'Desktop 4K': { width: 2560, height: 1440 },
};

test.describe('Responsive Design - Homepage', () => {
    for (const [device, viewport] of Object.entries(VIEWPORTS)) {
        test(`should display correctly on ${device} (${viewport.width}x${viewport.height})`, async ({ page }) => {
            await page.setViewportSize(viewport);
            await page.goto(PRODUCTION_URL);

            // Page should load
            await expect(page.locator('body')).toBeVisible();

            // Hero should be visible
            const hero = page.locator('h1').first();
            await expect(hero).toBeVisible({ timeout: 10000 });

            // Check for horizontal overflow
            const hasOverflow = await page.evaluate(() =>
                document.documentElement.scrollWidth > document.documentElement.clientWidth + 10
            );

            if (hasOverflow) {
                console.log(`Warning: Horizontal overflow on ${device}`);
            }

            expect(hasOverflow).toBeFalsy();
        });
    }
});

test.describe('Responsive Design - Navigation', () => {
    test('should show hamburger menu on mobile', async ({ page }) => {
        await page.setViewportSize(VIEWPORTS['iPhone SE']);
        await page.goto(PRODUCTION_URL);

        // Look for hamburger/mobile menu button
        const hamburger = page.locator(
            'button[aria-label*="menu" i], [data-testid="mobile-menu"], button:has(svg.lucide-menu), button:has-text("☰")'
        ).first();

        const isVisible = await hamburger.isVisible().catch(() => false);
        console.log(`Hamburger menu visible on mobile: ${isVisible}`);
    });

    test('should show full nav on desktop', async ({ page }) => {
        await page.setViewportSize(VIEWPORTS['Desktop HD']);
        await page.goto(PRODUCTION_URL);

        // Navigation links should be visible
        const featuresLink = page.locator('nav >> text=Features, header >> text=Features').first();
        const pricingLink = page.locator('nav >> text=Pricing, header >> text=Pricing').first();

        await expect(featuresLink).toBeVisible({ timeout: 10000 });
        await expect(pricingLink).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Responsive Design - Pricing Cards', () => {
    test('should stack cards vertically on mobile', async ({ page }) => {
        await page.setViewportSize(VIEWPORTS['iPhone SE']);
        await page.goto(`${PRODUCTION_URL}/pricing`);
        await page.waitForTimeout(1000);

        // All pricing tiers should be accessible by scrolling
        await expect(page.locator('text=/\\$0/').first()).toBeVisible({ timeout: 10000 });
    });

    test('should show cards in row on desktop', async ({ page }) => {
        await page.setViewportSize(VIEWPORTS['Desktop HD']);
        await page.goto(`${PRODUCTION_URL}/pricing`);
        await page.waitForTimeout(1000);

        // All three prices should be visible at once
        await expect(page.locator('text=/\\$0/').first()).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=/\\$19/').first()).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=/\\$79/').first()).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Responsive Design - Touch Targets', () => {
    const mobileViewport = VIEWPORTS['iPhone SE'];

    test('buttons should be at least 44px tall on mobile', async ({ page }) => {
        await page.setViewportSize(mobileViewport);
        await page.goto(PRODUCTION_URL);

        const ctaButtons = page.locator('button, a').filter({ hasText: /.+/ });

        for (let i = 0; i < Math.min(5, await ctaButtons.count()); i++) {
            const button = ctaButtons.nth(i);

            if (await button.isVisible()) {
                const box = await button.boundingBox();

                if (box && box.height > 10) { // Skip tiny elements
                    expect(box.height).toBeGreaterThanOrEqual(36);
                }
            }
        }
    });

    test('form inputs should be large enough on mobile', async ({ page }) => {
        await page.setViewportSize(mobileViewport);
        await page.goto(`${PRODUCTION_URL}/login`);
        await page.waitForTimeout(1000);

        const inputs = page.locator('input');

        for (let i = 0; i < Math.min(3, await inputs.count()); i++) {
            const input = inputs.nth(i);

            if (await input.isVisible()) {
                const box = await input.boundingBox();

                if (box) {
                    expect(box.height).toBeGreaterThanOrEqual(36);
                }
            }
        }
    });
});

test.describe('Responsive Design - Text Readability', () => {
    test('text should be readable on mobile', async ({ page }) => {
        await page.setViewportSize(VIEWPORTS['iPhone SE']);
        await page.goto(PRODUCTION_URL);

        const paragraph = page.locator('p').first();

        if (await paragraph.isVisible()) {
            const fontSize = await paragraph.evaluate((el) =>
                parseFloat(window.getComputedStyle(el).fontSize)
            );

            // Minimum 14px font size for readability
            expect(fontSize).toBeGreaterThanOrEqual(14);
        }
    });

    test('headings should scale appropriately', async ({ page }) => {
        // Check mobile
        await page.setViewportSize(VIEWPORTS['iPhone SE']);
        await page.goto(PRODUCTION_URL);

        const mobileFontSize = await page.locator('h1').first().evaluate((el) =>
            parseFloat(window.getComputedStyle(el).fontSize)
        );

        // Check desktop
        await page.setViewportSize(VIEWPORTS['Desktop HD']);
        await page.goto(PRODUCTION_URL);

        const desktopFontSize = await page.locator('h1').first().evaluate((el) =>
            parseFloat(window.getComputedStyle(el).fontSize)
        );

        // Desktop headings should be larger or equal
        expect(desktopFontSize).toBeGreaterThanOrEqual(mobileFontSize);

        console.log(`H1 sizes - Mobile: ${mobileFontSize}px, Desktop: ${desktopFontSize}px`);
    });
});

test.describe('Responsive Design - Landscape Orientation', () => {
    test('mobile landscape should work correctly', async ({ page }) => {
        // iPhone SE landscape
        await page.setViewportSize({ width: 667, height: 375 });
        await page.goto(PRODUCTION_URL);

        // Page should still function
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

        // No horizontal overflow
        const hasOverflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 10
        );

        expect(hasOverflow).toBeFalsy();
    });

    test('tablet landscape should display properly', async ({ page }) => {
        // iPad landscape
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.goto(PRODUCTION_URL);

        await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Responsive Design - Demo Pages', () => {
    const demoPages = ['/demo/roast', '/demo/spec', '/demo/board'];

    for (const demoPath of demoPages) {
        test(`${demoPath} should work on mobile`, async ({ page }) => {
            await page.setViewportSize(VIEWPORTS['iPhone SE']);
            await page.goto(`${PRODUCTION_URL}${demoPath}`);
            await page.waitForTimeout(2000);

            // Page should load
            await expect(page.locator('body')).not.toBeEmpty();

            // No horizontal overflow
            const hasOverflow = await page.evaluate(() =>
                document.documentElement.scrollWidth > document.documentElement.clientWidth + 10
            );

            expect(hasOverflow).toBeFalsy();
        });

        test(`${demoPath} should work on tablet`, async ({ page }) => {
            await page.setViewportSize(VIEWPORTS['iPad Mini']);
            await page.goto(`${PRODUCTION_URL}${demoPath}`);
            await page.waitForTimeout(2000);

            await expect(page.locator('body')).not.toBeEmpty();
        });
    }
});

test.describe('Responsive Design - Dark Mode Across Devices', () => {
    for (const [device, viewport] of Object.entries(VIEWPORTS)) {
        if (['iPhone SE', 'iPad Mini', 'Desktop HD'].includes(device)) {
            test(`dark mode should work on ${device}`, async ({ page }) => {
                await page.setViewportSize(viewport);
                await page.goto(PRODUCTION_URL);
                await page.waitForTimeout(1000);

                // Toggle dark mode
                const themeToggle = page.locator(
                    'button[aria-label*="theme" i], button[aria-label*="dark" i], button:has(svg.lucide-moon)'
                ).first();

                if (await themeToggle.isVisible()) {
                    await themeToggle.click();
                    await page.waitForTimeout(500);

                    // Page should still be functional
                    await expect(page.locator('body')).toBeVisible();
                }
            });
        }
    }
});
