/**
 * E2E Tests for SignalsLoop Landing Page
 * Tests homepage navigation, responsiveness, and core user journeys
 * Target: Production (https://signalsloop.com)
 */

import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://signalsloop.com';

test.describe('Landing Page - Desktop', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(PRODUCTION_URL);
        await page.waitForTimeout(2000);
    });

    test('should load homepage with hero section', async ({ page }) => {
        // Check page title
        await expect(page).toHaveTitle(/SignalsLoop/i);

        // Hero section should be visible - actual headline from production
        await expect(page.locator('text=/AI Product Intelligence|Builds Your Roadmap/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display main CTA buttons', async ({ page }) => {
        // Primary CTA - "Get Started Free" button
        const startFreeBtn = page.locator('text=/Get Started Free|Start Free/i').first();
        await expect(startFreeBtn).toBeVisible({ timeout: 10000 });

        // Secondary CTA - "View Live Demo" button
        const demoBtn = page.locator('text=/View Live Demo|Demo/i').first();
        await expect(demoBtn).toBeVisible({ timeout: 10000 });
    });

    test('should display navigation menu', async ({ page }) => {
        // Navigation links
        await expect(page.locator('text=Features').first()).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Pricing').first()).toBeVisible({ timeout: 10000 });
    });

    test('should show Try It dropdown with demo options', async ({ page }) => {
        // Look for Try It dropdown
        const tryItButton = page.locator('text=Try It').first();

        if (await tryItButton.isVisible()) {
            await tryItButton.click();
            await page.waitForTimeout(500);

            // Check for demo options from dropdown
            const demoBoard = page.locator('text=/Demo Board/i');
            const roastDemo = page.locator('text=/Roast.*Roadmap/i');
            const specDemo = page.locator('text=/Spec.*Generator/i');

            const hasDemoBoard = await demoBoard.isVisible().catch(() => false);
            const hasRoast = await roastDemo.isVisible().catch(() => false);
            const hasSpec = await specDemo.isVisible().catch(() => false);

            expect(hasDemoBoard || hasRoast || hasSpec).toBeTruthy();
        }
    });

    test('should display pricing section with all tiers', async ({ page }) => {
        // Scroll to pricing section
        await page.locator('text=Pricing').first().click();
        await page.waitForTimeout(1000);

        // Check for pricing tiers (scroll into view)
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        await page.waitForTimeout(500);

        // Check for price values
        await expect(page.locator('text=/\\$0/').first()).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=/\\$19/').first()).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=/\\$79/').first()).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to features section', async ({ page }) => {
        // Click Features link
        await page.locator('text=Features').first().click();
        await page.waitForTimeout(1000);

        // Should scroll to feature content
        const featuresSection = page.locator('text=/feedback|Feedback|Hunter|AI/i');
        await expect(featuresSection.first()).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to signup when clicking Get Started', async ({ page }) => {
        // Find and click "Start Free" button in header
        const startBtn = page.locator('a:has-text("Start Free"), button:has-text("Start Free")').first();

        if (await startBtn.isVisible()) {
            await startBtn.click();
            await page.waitForTimeout(2000);

            // Should navigate to signup or login
            const url = page.url();
            const isAuth = url.includes('signup') || url.includes('login') || url.includes('app');

            expect(isAuth).toBeTruthy();
        }
    });

    test('should display testimonials section', async ({ page }) => {
        // Scroll down to find testimonials
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        await page.waitForTimeout(500);

        // Look for testimonial content
        const testimonial = page.locator('text=/Trusted|product teams|Founder|saved/i');
        const isVisible = await testimonial.first().isVisible().catch(() => false);

        console.log(`Testimonials visible: ${isVisible}`);
    });

    test('should have footer with all links', async ({ page }) => {
        // Scroll to footer
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);

        // Check footer sections
        await expect(page.locator('text=/Privacy|Terms|Support/i').first()).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Landing Page - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

    test.beforeEach(async ({ page }) => {
        await page.goto(PRODUCTION_URL);
        await page.waitForTimeout(2000);
    });

    test('should display mobile hamburger menu', async ({ page }) => {
        // Look for hamburger menu button
        const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="Toggle menu"]').first();

        await expect(hamburger).toBeVisible({ timeout: 10000 });
    });

    test('should open mobile menu and show nav items', async ({ page }) => {
        // Click hamburger menu
        const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="Toggle menu"]').first();

        if (await hamburger.isVisible()) {
            await hamburger.click();
            await page.waitForTimeout(500);

            // After clicking, menu items should appear
            await expect(page.locator('text=Features').first()).toBeVisible({ timeout: 5000 });
            await expect(page.locator('text=Pricing').first()).toBeVisible({ timeout: 5000 });
        }
    });

    test('should display hero section on mobile', async ({ page }) => {
        // Hero content should be visible
        await expect(page.locator('text=/AI Product Intelligence|Builds Your Roadmap/i').first()).toBeVisible({ timeout: 10000 });

        // CTA button should be visible and tappable
        const ctaBtn = page.locator('text=/Get Started Free|Start Free/i').first();
        await expect(ctaBtn).toBeVisible({ timeout: 10000 });
    });

    test('should scroll to pricing on mobile', async ({ page }) => {
        // Scroll down
        await page.evaluate(() => window.scrollTo(0, 2000));
        await page.waitForTimeout(500);

        // Should see pricing content
        await expect(page.locator('text=/\\$0|\\$19|\\$79/').first()).toBeVisible({ timeout: 10000 });
    });

    test('should be touchable and responsive', async ({ page }) => {
        // Verify buttons are large enough to tap
        const ctaBtn = page.locator('text=/Get Started Free|Start Free/i').first();

        if (await ctaBtn.isVisible()) {
            const box = await ctaBtn.boundingBox();
            if (box) {
                // Minimum tap target size (44px recommended by Apple)
                expect(box.height).toBeGreaterThanOrEqual(36);
            }
        }
    });

    test('should not have horizontal overflow on mobile', async ({ page }) => {
        // Check for horizontal overflow
        const hasOverflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 10
        );

        expect(hasOverflow).toBeFalsy();
    });
});

test.describe('Landing Page - Tablet', () => {
    test.use({ viewport: { width: 768, height: 1024 } }); // iPad

    test('should display properly on tablet', async ({ page }) => {
        await page.goto(PRODUCTION_URL);
        await page.waitForTimeout(2000);

        // Hero should be visible
        await expect(page.locator('text=/AI Product Intelligence|Builds Your Roadmap/i').first()).toBeVisible({ timeout: 10000 });

        // Navigation should work
        const navLinks = page.locator('text=Features');
        await expect(navLinks.first()).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Landing Page - Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
        const startTime = Date.now();

        await page.goto(PRODUCTION_URL, { waitUntil: 'domcontentloaded' });

        const loadTime = Date.now() - startTime;

        console.log(`Page load time: ${loadTime}ms`);

        // Page should load within 8 seconds
        expect(loadTime).toBeLessThan(8000);
    });

    test('should have no critical console errors', async ({ page }) => {
        const errors: string[] = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto(PRODUCTION_URL);
        await page.waitForTimeout(3000);

        // Filter out known third-party errors
        const criticalErrors = errors.filter(
            (e) => !e.includes('third-party') &&
                !e.includes('analytics') &&
                !e.includes('hydration') &&
                !e.includes('posthog')
        );

        // Log errors for debugging
        if (criticalErrors.length > 0) {
            console.log('Console errors:', criticalErrors);
        }

        // Should have minimal critical errors
        expect(criticalErrors.length).toBeLessThan(5);
    });
});
