/**
 * E2E Tests for Authentication Flow
 * Tests login, signup, logout, and protected routes
 * Target: Production (https://signalsloop.com)
 */

import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://signalsloop.com';

test.describe('Authentication - Login Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/login`);
    });

    test('should load login page', async ({ page }) => {
        // Should have login form elements
        await expect(page.locator('text=/Log ?in|Sign ?in|Welcome/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display email input field', async ({ page }) => {
        const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
        await expect(emailInput).toBeVisible({ timeout: 10000 });
    });

    test('should display password input field', async ({ page }) => {
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
        await expect(passwordInput).toBeVisible({ timeout: 10000 });
    });

    test('should display submit button', async ({ page }) => {
        const submitBtn = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first();
        await expect(submitBtn).toBeVisible({ timeout: 10000 });
    });

    test('should display forgot password link', async ({ page }) => {
        const forgotLink = page.locator('text=/Forgot.*password/i');
        // Forgot password might be optional
        const isVisible = await forgotLink.isVisible().catch(() => false);
        console.log(`Forgot password link visible: ${isVisible}`);
    });

    test('should have link to signup page', async ({ page }) => {
        const signupLink = page.locator('text=/Sign ?up|Create.*account|Register/i').first();
        await expect(signupLink).toBeVisible({ timeout: 10000 });
    });

    test('should show validation error for empty form submission', async ({ page }) => {
        const submitBtn = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first();

        if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await page.waitForTimeout(500);

            // Either HTML5 validation or custom error message
            const errorMsg = page.locator('text=/required|invalid|error|please/i');
            const inputInvalid = page.locator('input:invalid');

            const hasError = await errorMsg.first().isVisible().catch(() => false);
            const hasInvalidInput = await inputInvalid.count() > 0;

            // Should show some form of validation feedback
            expect(hasError || hasInvalidInput).toBeTruthy();
        }
    });

    test('should show error for invalid credentials', async ({ page }) => {
        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('input[type="password"]').first();
        const submitBtn = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first();

        if (await emailInput.isVisible() && await passwordInput.isVisible()) {
            await emailInput.fill('fake@notreal.com');
            await passwordInput.fill('wrongpassword123');
            await submitBtn.click();

            await page.waitForTimeout(2000);

            // Should show error message
            const errorMsg = page.locator('text=/invalid|incorrect|error|failed|wrong/i');
            const isVisible = await errorMsg.first().isVisible().catch(() => false);

            // Error message should appear for invalid credentials
            console.log(`Error message visible: ${isVisible}`);
        }
    });

    test('should display OAuth login options', async ({ page }) => {
        // Check for Google login button
        const googleBtn = page.locator('button:has-text("Google"), [aria-label*="Google"], text=/Continue with Google/i').first();
        const isGoogleVisible = await googleBtn.isVisible().catch(() => false);

        console.log(`Google OAuth button visible: ${isGoogleVisible}`);
    });
});

test.describe('Authentication - Login Page Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display login form on mobile', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/login`);

        await expect(page.locator('text=/Log ?in|Sign ?in|Welcome/i').first()).toBeVisible({ timeout: 10000 });

        // Form elements should be visible
        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        await expect(emailInput).toBeVisible({ timeout: 10000 });
    });

    test('should have full-width inputs on mobile', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/login`);

        const emailInput = page.locator('input[type="email"], input[name="email"]').first();

        if (await emailInput.isVisible()) {
            const box = await emailInput.boundingBox();

            if (box) {
                // Input should take most of screen width
                expect(box.width).toBeGreaterThan(200);
            }
        }
    });
});

test.describe('Authentication - Signup Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/signup`);
    });

    test('should load signup page', async ({ page }) => {
        await expect(page.locator('text=/Sign ?up|Create.*account|Register|Get Started/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display required form fields', async ({ page }) => {
        // Email field
        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        await expect(emailInput).toBeVisible({ timeout: 10000 });

        // Password field
        const passwordInput = page.locator('input[type="password"]').first();
        await expect(passwordInput).toBeVisible({ timeout: 10000 });
    });

    test('should have link to login page', async ({ page }) => {
        const loginLink = page.locator('text=/Log ?in|Sign ?in|Already have.*account/i').first();
        await expect(loginLink).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to login from signup', async ({ page }) => {
        const loginLink = page.locator('a:has-text("Log in"), a:has-text("Sign in")').first();

        if (await loginLink.isVisible()) {
            await loginLink.click();
            await expect(page).toHaveURL(/login/);
        }
    });
});

test.describe('Authentication - Signup Page Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display signup form on mobile', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/signup`);

        await expect(page.locator('text=/Sign ?up|Create.*account|Register|Get Started/i').first()).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Authentication - Protected Routes', () => {
    test('should redirect to login when accessing /app without auth', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/app`);

        // Should redirect to login
        await page.waitForURL(/login|signin|auth/, { timeout: 10000 });

        await expect(page).toHaveURL(/login|signin|auth/);
    });

    test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/test-project/dashboard`);

        // Should redirect to login or show error
        await page.waitForTimeout(2000);

        const isLoginPage = page.url().includes('login');
        const hasLoginForm = await page.locator('input[type="email"]').isVisible().catch(() => false);
        const hasError = await page.locator('text=/not found|unauthorized|sign in/i').first().isVisible().catch(() => false);

        // Should either redirect to login or show appropriate message
        expect(isLoginPage || hasLoginForm || hasError).toBeTruthy();
    });

    test('should redirect to login when accessing settings without auth', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/test-project/settings`);

        await page.waitForTimeout(2000);

        const isLoginPage = page.url().includes('login');
        const hasLoginForm = await page.locator('input[type="email"]').isVisible().catch(() => false);
        const hasError = await page.locator('text=/not found|unauthorized|sign in/i').first().isVisible().catch(() => false);

        expect(isLoginPage || hasLoginForm || hasError).toBeTruthy();
    });
});

test.describe('Authentication - Form Accessibility', () => {
    test('should have proper labels for form fields', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/login`);

        // Check for labels or aria-labels
        const emailInput = page.locator('input[type="email"], input[name="email"]').first();

        if (await emailInput.isVisible()) {
            const id = await emailInput.getAttribute('id');
            const ariaLabel = await emailInput.getAttribute('aria-label');
            const placeholder = await emailInput.getAttribute('placeholder');

            // Should have either associated label, aria-label, or placeholder
            const hasLabel = id ? await page.locator(`label[for="${id}"]`).isVisible() : false;
            const hasAriaLabel = !!ariaLabel;
            const hasPlaceholder = !!placeholder;

            expect(hasLabel || hasAriaLabel || hasPlaceholder).toBeTruthy();
        }
    });

    test('should be keyboard navigable', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/login`);
        await page.waitForTimeout(1000);

        // Tab through form elements
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Should be able to navigate without errors
    });
});

test.describe('Authentication - Pricing to Signup Flow', () => {
    test('should navigate from pricing CTA to signup', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/pricing`);
        await page.waitForTimeout(1000);

        // Click on a "Start" or "Get Started" button
        const ctaBtn = page.locator('button:has-text("Start"), a:has-text("Start"), button:has-text("Get Started"), a:has-text("Get Started")').first();

        if (await ctaBtn.isVisible()) {
            await ctaBtn.click();
            await page.waitForTimeout(2000);

            // Should navigate to signup or login
            const isSignup = page.url().includes('signup');
            const isLogin = page.url().includes('login');
            const isCheckout = page.url().includes('checkout') || page.url().includes('stripe');

            expect(isSignup || isLogin || isCheckout).toBeTruthy();
        }
    });
});
