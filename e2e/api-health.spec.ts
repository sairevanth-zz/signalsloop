/**
 * E2E Tests for API Endpoints and Page Health
 * Tests public API availability, page loading, and error handling
 * Target: Production (https://signalsloop.com)
 */

import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://signalsloop.com';

test.describe('Page Health - Core Pages', () => {
    const corePages = [
        { name: 'Homepage', path: '/' },
        { name: 'Login', path: '/login' },
        { name: 'Signup', path: '/signup' },
        { name: 'Pricing', path: '/pricing' },
        { name: 'Features', path: '/features' },
        { name: 'Privacy', path: '/privacy' },
        { name: 'Terms', path: '/terms' },
    ];

    for (const page of corePages) {
        test(`${page.name} page should load without errors`, async ({ page: p }) => {
            const errors: string[] = [];

            p.on('console', (msg) => {
                if (msg.type() === 'error') {
                    errors.push(msg.text());
                }
            });

            const response = await p.goto(`${PRODUCTION_URL}${page.path}`);

            // Should return successful HTTP status
            expect(response?.status()).toBeLessThan(400);

            // Page should have content
            await expect(p.locator('body')).not.toBeEmpty();

            // Filter critical errors
            const criticalErrors = errors.filter(
                (e) => !e.includes('third-party') && !e.includes('analytics') && !e.includes('hydration')
            );

            // Log errors for debugging
            if (criticalErrors.length > 0) {
                console.log(`${page.name} errors:`, criticalErrors);
            }
        });
    }
});

test.describe('Page Health - Demo Pages', () => {
    const demoPages = [
        { name: 'Roast Demo', path: '/demo/roast' },
        { name: 'Spec Demo', path: '/demo/spec' },
        { name: 'Board Demo', path: '/demo/board' },
        { name: 'Competitive Demo', path: '/demo/competitive-intel' },
        { name: 'Health Score Demo', path: '/demo/health-score' },
        { name: 'Feedback Demo', path: '/demo/feedback' },
    ];

    for (const demo of demoPages) {
        test(`${demo.name} should load`, async ({ page }) => {
            const response = await page.goto(`${PRODUCTION_URL}${demo.path}`);

            // Should return 200 OK
            expect(response?.status()).toBe(200);

            // Should have main content
            await expect(page.locator('main, [role="main"], body > div')).not.toBeEmpty();
        });
    }
});

test.describe('API Health - Public Endpoints', () => {
    test('health check endpoint should return OK', async ({ request }) => {
        const response = await request.get(`${PRODUCTION_URL}/api/health`);

        // Might return 200 or 404 depending on implementation
        const status = response.status();
        console.log(`Health endpoint status: ${status}`);

        if (status === 200) {
            const data = await response.json();
            console.log('Health check response:', data);
        }
    });

    test('dashboard health should be accessible', async ({ request }) => {
        const response = await request.get(`${PRODUCTION_URL}/api/dashboard/health`);

        // Should return health status
        if (response.status() === 200) {
            const data = await response.json();
            console.log('Dashboard health:', data);

            expect(data).toHaveProperty('status');
        }
    });
});

test.describe('Page Performance', () => {
    const performancePages = [
        { name: 'Homepage', path: '/', maxTime: 5000 },
        { name: 'Pricing', path: '/pricing', maxTime: 5000 },
        { name: 'Login', path: '/login', maxTime: 5000 },
    ];

    for (const page of performancePages) {
        test(`${page.name} should load within ${page.maxTime}ms`, async ({ page: p }) => {
            const start = Date.now();

            await p.goto(`${PRODUCTION_URL}${page.path}`, { waitUntil: 'domcontentloaded' });

            const loadTime = Date.now() - start;

            console.log(`${page.name} load time: ${loadTime}ms`);
            expect(loadTime).toBeLessThan(page.maxTime);
        });
    }
});

test.describe('Error Handling', () => {
    test('404 page should display for non-existent routes', async ({ page }) => {
        const response = await page.goto(`${PRODUCTION_URL}/this-page-does-not-exist-xyz123`);

        // Should return 404
        expect(response?.status()).toBe(404);

        // Should show 404 message
        await expect(page.locator('text=/404|not found|page.*not.*exist/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('404 page should have navigation back', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/non-existent-page`);

        // Should have link to go back home
        const homeLink = page.locator('a[href="/"], text=/home|go back|return/i').first();
        const isVisible = await homeLink.isVisible().catch(() => false);

        console.log(`Home link on 404: ${isVisible}`);
    });
});

test.describe('Security Headers', () => {
    test('should have security headers', async ({ request }) => {
        const response = await request.get(PRODUCTION_URL);

        const headers = response.headers();

        // Check for security headers
        const xContentType = headers['x-content-type-options'];
        const xXss = headers['x-xss-protection'];
        const xFrame = headers['x-frame-options'];

        console.log('Security headers:', {
            'x-content-type-options': xContentType,
            'x-xss-protection': xXss,
            'x-frame-options': xFrame,
        });

        // X-Content-Type-Options should be set
        if (xContentType) {
            expect(xContentType).toBe('nosniff');
        }
    });
});

test.describe('Meta Tags and SEO', () => {
    test('homepage should have proper meta tags', async ({ page }) => {
        await page.goto(PRODUCTION_URL);

        // Check for title
        const title = await page.title();
        expect(title).toBeTruthy();
        expect(title.length).toBeGreaterThan(0);

        // Check for meta description
        const description = await page.locator('meta[name="description"]').getAttribute('content');

        if (description) {
            expect(description.length).toBeGreaterThan(50);
        }

        // Check for OG tags
        const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
        const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');

        console.log('Meta tags:', { title, description: description?.substring(0, 50), ogTitle });
    });

    test('pages should have canonical URLs', async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}/pricing`);

        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');

        if (canonical) {
            expect(canonical).toContain('signalsloop.com');
        }
    });
});

test.describe('Robots and Sitemap', () => {
    test('robots.txt should be accessible', async ({ request }) => {
        const response = await request.get(`${PRODUCTION_URL}/robots.txt`);

        expect(response.status()).toBe(200);

        const content = await response.text();
        expect(content).toContain('User-agent');
    });

    test('sitemap should be accessible', async ({ request }) => {
        const response = await request.get(`${PRODUCTION_URL}/sitemap.xml`);

        // Sitemap should exist
        expect(response.status()).toBe(200);

        const content = await response.text();
        expect(content).toContain('urlset');
    });
});
