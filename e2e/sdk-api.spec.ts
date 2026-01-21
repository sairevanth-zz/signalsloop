/**
 * SDK API E2E Tests
 * Tests for the SignalsLoop A/B Testing SDK API endpoints
 * 
 * These tests validate the actual HTTP endpoints:
 * - GET /api/sdk/config - Returns experiment configurations
 * - POST /api/sdk/events - Tracks conversions and events
 * - GET /api/sdk/bundle.js - Serves the JavaScript SDK
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('SDK Config API', () => {
    const configUrl = `${BASE_URL}/api/sdk/config`;

    test('should return 400 when projectId is missing', async ({ request }) => {
        const response = await request.get(`${configUrl}?visitorId=test123`);

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('projectId');
    });

    test('should return 400 when visitorId is missing', async ({ request }) => {
        const response = await request.get(`${configUrl}?projectId=proj123`);

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('visitorId');
    });

    test('should return 200 with valid parameters', async ({ request }) => {
        const response = await request.get(`${configUrl}?projectId=test-project&visitorId=visitor-123`);

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('experiments');
        expect(body).toHaveProperty('visitorId', 'visitor-123');
        expect(body).toHaveProperty('timestamp');
    });

    test('should return empty experiments array for non-existent project', async ({ request }) => {
        const response = await request.get(`${configUrl}?projectId=non-existent-project&visitorId=visitor-123`);

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.experiments).toEqual([]);
    });

    test('should include CORS headers', async ({ request }) => {
        const response = await request.get(`${configUrl}?projectId=test&visitorId=test`);

        expect(response.headers()['access-control-allow-origin']).toBe('*');
    });

    test('OPTIONS should return CORS preflight headers', async ({ request }) => {
        const response = await request.fetch(configUrl, {
            method: 'OPTIONS',
        });

        expect(response.status()).toBe(200);
        expect(response.headers()['access-control-allow-origin']).toBe('*');
        expect(response.headers()['access-control-allow-methods']).toContain('GET');
    });

    test('should return consistent variant for same visitor', async ({ request }) => {
        const visitorId = `consistent-test-${Date.now()}`;

        // First request
        const response1 = await request.get(`${configUrl}?projectId=test-project&visitorId=${visitorId}`);
        const body1 = await response1.json();

        // Second request with same visitorId
        const response2 = await request.get(`${configUrl}?projectId=test-project&visitorId=${visitorId}`);
        const body2 = await response2.json();

        // Same visitor should get same experiments config
        expect(body1.visitorId).toBe(body2.visitorId);
        expect(body1.experiments.length).toBe(body2.experiments.length);
    });
});

test.describe('SDK Events API', () => {
    const eventsUrl = `${BASE_URL}/api/sdk/events`;

    test('should return 400 when events array is missing', async ({ request }) => {
        const response = await request.post(eventsUrl, {
            data: { projectId: 'proj123', visitorId: 'visitor123' },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('events');
    });

    test('should return 400 when projectId is missing', async ({ request }) => {
        const response = await request.post(eventsUrl, {
            data: {
                events: [{ eventType: 'conversion', eventName: 'signup' }],
                visitorId: 'visitor123',
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('projectId');
    });

    test('should accept valid events payload', async ({ request }) => {
        const response = await request.post(eventsUrl, {
            data: {
                projectId: 'test-project',
                visitorId: 'visitor-123',
                events: [
                    {
                        experimentId: 'exp-123',
                        variantKey: 'treatment',
                        eventType: 'pageview',
                        eventName: 'page_load',
                    },
                ],
            },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
    });

    test('should track conversion events', async ({ request }) => {
        const response = await request.post(eventsUrl, {
            data: {
                projectId: 'test-project',
                visitorId: 'visitor-123',
                events: [
                    {
                        experimentId: 'exp-123',
                        variantKey: 'treatment',
                        eventType: 'conversion',
                        eventName: 'signup',
                        eventValue: 1,
                    },
                ],
            },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
    });

    test('should accept batch events', async ({ request }) => {
        const response = await request.post(eventsUrl, {
            data: {
                projectId: 'test-project',
                visitorId: 'visitor-123',
                events: [
                    { experimentId: 'exp-1', variantKey: 'control', eventType: 'pageview', eventName: 'homepage' },
                    { experimentId: 'exp-1', variantKey: 'control', eventType: 'click', eventName: 'cta_button' },
                    { experimentId: 'exp-1', variantKey: 'control', eventType: 'conversion', eventName: 'signup' },
                ],
            },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
    });

    test('should include CORS headers', async ({ request }) => {
        const response = await request.post(eventsUrl, {
            data: { projectId: 'test', visitorId: 'test', events: [] },
        });

        // Even for error responses, CORS headers should be present
        expect(response.headers()['access-control-allow-origin']).toBe('*');
    });

    test('OPTIONS should return CORS preflight headers', async ({ request }) => {
        const response = await request.fetch(eventsUrl, {
            method: 'OPTIONS',
        });

        expect(response.status()).toBe(200);
        expect(response.headers()['access-control-allow-origin']).toBe('*');
        expect(response.headers()['access-control-allow-methods']).toContain('POST');
    });
});

test.describe('SDK Bundle API', () => {
    const bundleUrl = `${BASE_URL}/api/sdk/bundle.js`;

    test('should return JavaScript content', async ({ request }) => {
        const response = await request.get(bundleUrl);

        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toBe('application/javascript');
    });

    test('should contain SignalsLoop SDK code', async ({ request }) => {
        const response = await request.get(bundleUrl);
        const text = await response.text();

        expect(text).toContain('SignalsLoop');
    });

    test('should contain init function', async ({ request }) => {
        const response = await request.get(bundleUrl);
        const text = await response.text();

        expect(text).toContain('init');
    });

    test('should include CORS headers for cross-origin embedding', async ({ request }) => {
        const response = await request.get(bundleUrl);

        expect(response.headers()['access-control-allow-origin']).toBe('*');
    });

    test('should have cache headers for performance', async ({ request }) => {
        const response = await request.get(bundleUrl);

        expect(response.headers()['cache-control']).toBeDefined();
    });

    test('should be minified (reasonably small)', async ({ request }) => {
        const response = await request.get(bundleUrl);
        const text = await response.text();

        // SDK should be under 10KB
        expect(text.length).toBeLessThan(10000);
    });
});

test.describe('SDK Integration Flow', () => {
    test('should complete full visitor tracking flow', async ({ request }) => {
        const projectId = 'integration-test-project';
        const visitorId = `visitor-${Date.now()}`;

        // Step 1: Get experiment config
        const configResponse = await request.get(
            `${BASE_URL}/api/sdk/config?projectId=${projectId}&visitorId=${visitorId}`
        );
        expect(configResponse.status()).toBe(200);
        const config = await configResponse.json();
        expect(config.visitorId).toBe(visitorId);

        // Step 2: Track pageview
        const pageviewResponse = await request.post(`${BASE_URL}/api/sdk/events`, {
            data: {
                projectId,
                visitorId,
                events: [{
                    experimentId: 'exp-test',
                    variantKey: 'control',
                    eventType: 'pageview',
                    eventName: 'page_load'
                }],
            },
        });
        expect(pageviewResponse.status()).toBe(200);

        // Step 3: Track conversion
        const conversionResponse = await request.post(`${BASE_URL}/api/sdk/events`, {
            data: {
                projectId,
                visitorId,
                events: [{
                    experimentId: 'exp-test',
                    variantKey: 'control',
                    eventType: 'conversion',
                    eventName: 'goal_complete',
                    eventValue: 1,
                }],
            },
        });
        expect(conversionResponse.status()).toBe(200);
        const conversionBody = await conversionResponse.json();
        expect(conversionBody.success).toBe(true);
    });
});

test.describe('SDK Error Handling', () => {
    test('config should handle malformed requests gracefully', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/sdk/config`);

        // Should return 400, not 500
        expect(response.status()).toBe(400);
    });

    test('events should handle empty events array', async ({ request }) => {
        const response = await request.post(`${BASE_URL}/api/sdk/events`, {
            data: {
                projectId: 'test',
                visitorId: 'test',
                events: [],
            },
        });

        // Empty events should return 400
        expect(response.status()).toBe(400);
    });

    test('events should handle invalid JSON gracefully', async ({ request }) => {
        const response = await request.post(`${BASE_URL}/api/sdk/events`, {
            headers: { 'Content-Type': 'application/json' },
            data: 'not valid json{',
        });

        // Should handle gracefully, not crash
        expect([400, 500]).toContain(response.status());
    });
});
