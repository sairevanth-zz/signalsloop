/**
 * SDK API Endpoints Tests
 * Tests for /api/sdk/config and /api/sdk/events endpoints
 */

// Mock the Supabase client
jest.mock('@/lib/supabase-client', () => ({
    getSupabaseServiceRoleClient: jest.fn(),
}));

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

describe('SDK API Endpoints', () => {
    const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getSupabaseServiceRoleClient as jest.Mock).mockReturnValue(mockSupabase);
    });

    describe('SDK Config Endpoint', () => {
        it('should require projectId parameter', async () => {
            const { GET } = await import('@/app/api/sdk/config/route');

            const request = new Request('http://localhost/api/sdk/config?visitorId=test123');
            const response = await GET(request as any);

            expect(response.status).toBe(400);
            const body = await response.json();
            expect(body.error).toContain('projectId');
        });

        it('should require visitorId parameter', async () => {
            const { GET } = await import('@/app/api/sdk/config/route');

            const request = new Request('http://localhost/api/sdk/config?projectId=proj123');
            const response = await GET(request as any);

            expect(response.status).toBe(400);
            const body = await response.json();
            expect(body.error).toContain('visitorId');
        });

        it('should return experiments for valid request', async () => {
            // Mock successful database response
            mockSupabase.select.mockResolvedValueOnce({
                data: [
                    {
                        id: 'exp1',
                        name: 'Test Experiment',
                        status: 'running',
                        traffic_allocation: 100,
                        experiment_variants: [
                            { id: 'v1', variant_key: 'control', traffic_percentage: 50, is_control: true, visual_changes: [] },
                            { id: 'v2', variant_key: 'treatment', traffic_percentage: 50, is_control: false, visual_changes: [] },
                        ],
                        experiment_goals: [],
                    },
                ],
                error: null,
            });

            mockSupabase.in.mockResolvedValueOnce({
                data: [],
                error: null,
            });

            mockSupabase.upsert.mockResolvedValueOnce({
                data: null,
                error: null,
            });

            const { GET } = await import('@/app/api/sdk/config/route');

            const request = new Request('http://localhost/api/sdk/config?projectId=proj123&visitorId=visitor123');
            const response = await GET(request as any);

            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.experiments).toBeDefined();
            expect(body.visitorId).toBe('visitor123');
        });

        it('should include CORS headers', async () => {
            const { OPTIONS } = await import('@/app/api/sdk/config/route');

            const response = await OPTIONS();

            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
            expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
        });
    });

    describe('SDK Events Endpoint', () => {
        it('should require events array', async () => {
            const { POST } = await import('@/app/api/sdk/events/route');

            const request = new Request('http://localhost/api/sdk/events', {
                method: 'POST',
                body: JSON.stringify({ projectId: 'proj123' }),
                headers: { 'Content-Type': 'application/json' },
            });

            const response = await POST(request as any);
            expect(response.status).toBe(400);
            const body = await response.json();
            expect(body.error).toContain('events');
        });

        it('should require projectId', async () => {
            const { POST } = await import('@/app/api/sdk/events/route');

            const request = new Request('http://localhost/api/sdk/events', {
                method: 'POST',
                body: JSON.stringify({ events: [{ eventType: 'conversion' }] }),
                headers: { 'Content-Type': 'application/json' },
            });

            const response = await POST(request as any);
            expect(response.status).toBe(400);
            const body = await response.json();
            expect(body.error).toContain('projectId');
        });

        it('should return success for valid events', async () => {
            mockSupabase.in.mockResolvedValueOnce({
                data: [{ id: 'v1', experiment_id: 'exp1', variant_key: 'treatment' }],
                error: null,
            });

            mockSupabase.select.mockResolvedValueOnce({
                data: [{ id: 'event1' }],
                error: null,
            });

            const { POST } = await import('@/app/api/sdk/events/route');

            const request = new Request('http://localhost/api/sdk/events', {
                method: 'POST',
                body: JSON.stringify({
                    projectId: 'proj123',
                    visitorId: 'visitor123',
                    events: [
                        {
                            experimentId: 'exp1',
                            variantKey: 'treatment',
                            eventType: 'conversion',
                            eventName: 'signup',
                        },
                    ],
                }),
                headers: { 'Content-Type': 'application/json' },
            });

            const response = await POST(request as any);
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
        });

        it('should include CORS headers', async () => {
            const { OPTIONS } = await import('@/app/api/sdk/events/route');

            const response = await OPTIONS();

            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
            expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
        });
    });

    describe('SDK Bundle Endpoint', () => {
        it('should return JavaScript content', async () => {
            const { GET } = await import('@/app/api/sdk/bundle.js/route');

            const request = new Request('http://localhost/api/sdk/bundle.js');
            const response = await GET(request as any);

            expect(response.status).toBe(200);
            expect(response.headers.get('Content-Type')).toBe('application/javascript');
        });

        it('should include SDK code', async () => {
            const { GET } = await import('@/app/api/sdk/bundle.js/route');

            const request = new Request('http://localhost/api/sdk/bundle.js');
            const response = await GET(request as any);
            const text = await response.text();

            expect(text).toContain('SignalsLoop');
        });

        it('should allow cross-origin requests', async () => {
            const { GET } = await import('@/app/api/sdk/bundle.js/route');

            const request = new Request('http://localhost/api/sdk/bundle.js');
            const response = await GET(request as any);

            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        });
    });
});

describe('Variant Assignment', () => {
    it('should consistently assign same variant for same visitor', () => {
        // MurmurHash should be deterministic
        const assignments = new Set<string>();

        // Simulate calling the config endpoint multiple times
        // The same visitor should always get the same variant
        // This is tested by verifying the hash function properties

        const murmurhash3 = (key: string, seed: number = 0): number => {
            let h1 = seed;
            const c1 = 0xcc9e2d51;
            const c2 = 0x1b873593;

            for (let i = 0; i < key.length; i++) {
                let k1 = key.charCodeAt(i);
                k1 = Math.imul(k1, c1);
                k1 = (k1 << 15) | (k1 >>> 17);
                k1 = Math.imul(k1, c2);
                h1 ^= k1;
                h1 = (h1 << 13) | (h1 >>> 19);
                h1 = Math.imul(h1, 5) + 0xe6546b64;
            }

            h1 ^= key.length;
            h1 ^= h1 >>> 16;
            h1 = Math.imul(h1, 0x85ebca6b);
            h1 ^= h1 >>> 13;
            h1 = Math.imul(h1, 0xc2b2ae35);
            h1 ^= h1 >>> 16;

            return h1 >>> 0;
        };

        // Same input should always produce same output
        const hash1 = murmurhash3('exp123:visitor456');
        const hash2 = murmurhash3('exp123:visitor456');
        expect(hash1).toBe(hash2);

        // Different inputs should produce different outputs
        const hash3 = murmurhash3('exp123:visitor789');
        expect(hash3).not.toBe(hash1);
    });

    it('should distribute variants roughly evenly', () => {
        const murmurhash3 = (key: string, seed: number = 0): number => {
            let h1 = seed;
            const c1 = 0xcc9e2d51;
            const c2 = 0x1b873593;

            for (let i = 0; i < key.length; i++) {
                let k1 = key.charCodeAt(i);
                k1 = Math.imul(k1, c1);
                k1 = (k1 << 15) | (k1 >>> 17);
                k1 = Math.imul(k1, c2);
                h1 ^= k1;
                h1 = (h1 << 13) | (h1 >>> 19);
                h1 = Math.imul(h1, 5) + 0xe6546b64;
            }

            h1 ^= key.length;
            h1 ^= h1 >>> 16;
            h1 = Math.imul(h1, 0x85ebca6b);
            h1 ^= h1 >>> 13;
            h1 = Math.imul(h1, 0xc2b2ae35);
            h1 ^= h1 >>> 16;

            return h1 >>> 0;
        };

        // Simulate 1000 visitors
        let controlCount = 0;
        let treatmentCount = 0;

        for (let i = 0; i < 1000; i++) {
            const hash = murmurhash3(`exp123:visitor${i}`);
            const bucket = (hash % 100) + 1;

            if (bucket <= 50) {
                controlCount++;
            } else {
                treatmentCount++;
            }
        }

        // Should be roughly 50/50 (within 10% tolerance)
        expect(controlCount).toBeGreaterThan(400);
        expect(controlCount).toBeLessThan(600);
        expect(treatmentCount).toBeGreaterThan(400);
        expect(treatmentCount).toBeLessThan(600);
    });
});
