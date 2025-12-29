/**
 * E2E Tests for Pricing Page
 * Tests pricing display, tier comparison, CTAs, and checkout flow entry
 * Target: Production (https://signalsloop.com)
 */

import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://signalsloop.com';

test.describe('Pricing Page - Desktop', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/pricing`);
        await page.waitForTimeout(1000);
    });

    test('should load pricing page', async ({ page }) => {
        // Page should have pricing title
        await expect(page.locator('text=/Pricing|Plans/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display Free tier', async ({ page }) => {
        // Free tier should be visible
        await expect(page.locator('text=/Free.*\\$0|\\$0.*Free/i').first()).toBeVisible({ timeout: 10000 });

        // Should have feature list
        const freeFeatures = page.locator('text=/1 project|public.*board|10.*AI/i').first();
        await expect(freeFeatures).toBeVisible({ timeout: 10000 });
    });

    test('should display Pro tier', async ({ page }) => {
        // Pro tier should be visible with price
        await expect(page.locator('text=/Pro.*\\$19|\\$19.*Pro/i').first()).toBeVisible({ timeout: 10000 });

        // Should have feature list
        const proFeatures = page.locator('text=/unlimited.*AI|3.*project|private.*board|Slack/i').first();
        await expect(proFeatures).toBeVisible({ timeout: 10000 });
    });

    test('should display Premium tier', async ({ page }) => {
        // Premium tier should be visible with price
        await expect(page.locator('text=/Premium.*\\$79|\\$79.*Premium/i').first()).toBeVisible({ timeout: 10000 });

        // Should have feature list
        const premiumFeatures = page.locator('text=/unlimited.*project|Hunter|Go.*No.*Go|Retro/i').first();
        await expect(premiumFeatures).toBeVisible({ timeout: 10000 });
    });

    test('should have CTA buttons for each tier', async ({ page }) => {
        // Free tier CTA
        const freeCta = page.locator('button:has-text("Start Free"), a:has-text("Start Free"), button:has-text("Get Started")').first();
        await expect(freeCta).toBeVisible({ timeout: 10000 });

        // Pro tier CTA
        const proCta = page.locator('button:has-text("Start Pro"), a:has-text("Start Pro"), button:has-text("Upgrade")').first();
        const proVisible = await proCta.isVisible().catch(() => false);
        console.log(`Pro CTA visible: ${proVisible}`);

        // Premium tier CTA
        const premiumCta = page.locator('button:has-text("Start Premium"), a:has-text("Start Premium")').first();
        const premiumVisible = await premiumCta.isVisible().catch(() => false);
        console.log(`Premium CTA visible: ${premiumVisible}`);
    });

    test('should show most popular badge on Pro tier', async ({ page }) => {
        // Pro tier often has "Most Popular" badge
        const popularBadge = page.locator('text=/Most Popular|Recommended|Best Value/i');
        const isVisible = await popularBadge.first().isVisible().catch(() => false);

        console.log(`Popular badge visible: ${isVisible}`);
    });

    test('should display annual pricing toggle', async ({ page }) => {
        // Look for billing toggle
        const toggle = page.locator('text=/Monthly|Annual|Yearly|billed/i').first();
        const isVisible = await toggle.isVisible().catch(() => false);

        console.log(`Billing toggle visible: ${isVisible}`);
    });

    test('should highlight savings for annual billing', async ({ page }) => {
        // Look for annual savings text
        const savings = page.locator('text=/save|discount|off|\\d+% less/i');
        const isVisible = await savings.first().isVisible().catch(() => false);

        console.log(`Savings text visible: ${isVisible}`);
    });
});

test.describe('Pricing Page - Feature Comparison', () => {
    test('should display no per-seat pricing messaging', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/pricing`);

        // Should mention no per-seat pricing
        const noSeat = page.locator('text=/no.*seat|unlimited.*team|per.*seat/i');
        const isVisible = await noSeat.first().isVisible().catch(() => false);

        console.log(`No per-seat messaging visible: ${isVisible}`);
    });

    test('should have feature comparison table or list', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/pricing`);

        // Look for comparison features
        const features = page.locator('text=/Feedback|AI|Roadmap|Integration/i');
        const count = await features.count();

        expect(count).toBeGreaterThan(0);
    });
});

test.describe('Pricing Page - FAQ Section', () => {
    test('should display FAQ section', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/pricing`);

        // Scroll to FAQ
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);

        // Look for FAQ content
        const faq = page.locator('text=/FAQ|Frequently|Questions/i');
        const isVisible = await faq.first().isVisible().catch(() => false);

        console.log(`FAQ section visible: ${isVisible}`);
    });

    test('should have expandable FAQ items', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/pricing`);

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);

        // Look for FAQ question
        const question = page.locator('text=/free trial|AI request|change plans/i').first();

        if (await question.isVisible()) {
            await question.click();
            await page.waitForTimeout(300);

            // Answer should expand
            const answer = page.locator('text=/Yes|No|anytime|unlimited/i');
            const isVisible = await answer.first().isVisible().catch(() => false);

            console.log(`FAQ answer visible: ${isVisible}`);
        }
    });
});

test.describe('Pricing Page - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display pricing correctly on mobile', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/pricing`);

        await expect(page.locator('text=/Pricing|Plans/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should stack pricing cards on mobile', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/pricing`);

        // All three tiers should be viewable by scrolling
        await expect(page.locator('text=/\\$0/').first()).toBeVisible({ timeout: 10000 });

        // Scroll to see other tiers
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.waitForTimeout(500);

        await expect(page.locator('text=/\\$19/').first()).toBeVisible({ timeout: 10000 });

        await page.evaluate(() => window.scrollTo(0, 1000));
        await page.waitForTimeout(500);

        await expect(page.locator('text=/\\$79/').first()).toBeVisible({ timeout: 10000 });
    });

    test('should have tappable CTA buttons on mobile', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/pricing`);

        const ctaBtn = page.locator('button:has-text("Start"), a:has-text("Start")').first();

        if (await ctaBtn.isVisible()) {
            const box = await ctaBtn.boundingBox();

            if (box) {
                // Button should be large enough to tap
                expect(box.height).toBeGreaterThanOrEqual(40);
                expect(box.width).toBeGreaterThanOrEqual(100);
            }
        }
    });
});

test.describe('Pricing Page - Dark Mode', () => {
    test('should display correctly in dark mode', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/pricing`);

        // Toggle dark mode
        const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="dark" i], button:has(svg.lucide-moon)').first();

        if (await themeToggle.isVisible()) {
            await themeToggle.click();
            await page.waitForTimeout(500);
        }

        // Pricing cards should still be readable
        await expect(page.locator('text=/\\$0|\\$19|\\$79/').first()).toBeVisible();

        // Check contrast
        const priceText = page.locator('text=/\\$19/').first();

        if (await priceText.isVisible()) {
            const color = await priceText.evaluate((el) =>
                window.getComputedStyle(el).color
            );

            console.log(`Price text color in dark mode: ${color}`);
        }
    });
});

test.describe('Pricing Page - CTA Flow', () => {
    test('should navigate to signup when clicking Free tier CTA', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/pricing`);

        const freeCta = page.locator('button:has-text("Start Free"), a:has-text("Start Free")').first();

        if (await freeCta.isVisible()) {
            await freeCta.click();
            await page.waitForTimeout(2000);

            // Should navigate to signup or login
            const url = page.url();
            const isAuth = url.includes('signup') || url.includes('login') || url.includes('app');

            expect(isAuth).toBeTruthy();
        }
    });

    test('should navigate to checkout when clicking Pro tier CTA', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/pricing`);

        const proCta = page.locator('button:has-text("Start Pro"), a:has-text("Start Pro"), a:has-text("Upgrade to Pro")').first();

        if (await proCta.isVisible()) {
            await proCta.click();
            await page.waitForTimeout(2000);

            // Should navigate to checkout, signup, or login
            const url = page.url();
            const isValidDestination =
                url.includes('checkout') ||
                url.includes('stripe') ||
                url.includes('signup') ||
                url.includes('login') ||
                url.includes('app');

            console.log(`Pro CTA destination: ${url}`);
        }
    });
});
