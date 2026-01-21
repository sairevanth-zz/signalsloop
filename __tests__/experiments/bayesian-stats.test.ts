/**
 * Bayesian Statistics Library Tests
 * Tests for probability-to-beat-control, credible intervals, and expected loss
 */

import {
    probabilityToBeatControl,
    expectedLoss,
    credibleInterval,
    computeBayesianResults,
    recommendedSampleSize,
} from '@/lib/experiments/bayesian-stats';

describe('Bayesian Statistics Library', () => {
    describe('probabilityToBeatControl', () => {
        it('should return ~0.5 for identical variants', () => {
            // Same conversion rate should give ~50% probability
            const prob = probabilityToBeatControl(100, 10, 100, 10, 5000);
            expect(prob).toBeGreaterThan(0.4);
            expect(prob).toBeLessThan(0.6);
        });

        it('should return high probability for clearly better treatment', () => {
            // Treatment is clearly better (20% vs 10% conversion)
            const prob = probabilityToBeatControl(1000, 100, 1000, 200, 5000);
            expect(prob).toBeGreaterThan(0.95);
        });

        it('should return low probability for clearly worse treatment', () => {
            // Treatment is clearly worse (5% vs 10% conversion)
            const prob = probabilityToBeatControl(1000, 100, 1000, 50, 5000);
            expect(prob).toBeLessThan(0.05);
        });

        it('should handle zero conversions', () => {
            const prob = probabilityToBeatControl(100, 0, 100, 0, 5000);
            expect(prob).toBeGreaterThan(0.3);
            expect(prob).toBeLessThan(0.7);
        });

        it('should handle small sample sizes', () => {
            const prob = probabilityToBeatControl(10, 1, 10, 2, 1000);
            expect(prob).toBeGreaterThan(0);
            expect(prob).toBeLessThan(1);
        });
    });

    describe('expectedLoss', () => {
        it('should return near-zero loss for clearly better treatment', () => {
            // Treatment is clearly better
            const loss = expectedLoss(1000, 100, 1000, 200, 5000);
            expect(loss).toBeLessThan(0.01); // Less than 1% expected loss
        });

        it('should return higher loss for worse treatment', () => {
            // Treatment is clearly worse
            const loss = expectedLoss(1000, 100, 1000, 50, 5000);
            expect(loss).toBeGreaterThan(0.03); // More than 3% expected loss
        });

        it('should handle equal variants', () => {
            const loss = expectedLoss(100, 10, 100, 10, 5000);
            expect(loss).toBeGreaterThan(0);
            expect(loss).toBeLessThan(0.1);
        });
    });

    describe('credibleInterval', () => {
        it('should return valid interval bounds', () => {
            const ci = credibleInterval(100, 10);
            expect(ci.low).toBeGreaterThanOrEqual(0);
            expect(ci.high).toBeLessThanOrEqual(1);
            expect(ci.low).toBeLessThan(ci.high);
        });

        it('should contain the true rate within the interval', () => {
            // 10% conversion rate (100/1000)
            const ci = credibleInterval(1000, 100);
            expect(ci.low).toBeLessThan(0.10);
            expect(ci.high).toBeGreaterThan(0.10);
        });

        it('should have narrower interval with more data', () => {
            const smallCi = credibleInterval(100, 10);
            const largeCi = credibleInterval(10000, 1000);

            const smallWidth = smallCi.high - smallCi.low;
            const largeWidth = largeCi.high - largeCi.low;

            expect(largeWidth).toBeLessThan(smallWidth);
        });

        it('should handle edge cases', () => {
            // All conversions
            const allConvert = credibleInterval(100, 100);
            expect(allConvert.high).toBeGreaterThan(0.9);

            // No conversions
            const noConvert = credibleInterval(100, 0);
            expect(noConvert.low).toBeLessThan(0.1);
        });
    });

    describe('computeBayesianResults', () => {
        it('should compute results for all variants', () => {
            const variants = [
                { key: 'control', visitors: 100, conversions: 10, isControl: true },
                { key: 'treatment', visitors: 100, conversions: 15, isControl: false },
            ];

            const results = computeBayesianResults(variants);

            expect(results).toHaveLength(2);
            expect(results.find(r => r.variantKey === 'control')).toBeDefined();
            expect(results.find(r => r.variantKey === 'treatment')).toBeDefined();
        });

        it('should mark a winner when significantly better', () => {
            const variants = [
                { key: 'control', visitors: 1000, conversions: 100, isControl: true },
                { key: 'treatment', visitors: 1000, conversions: 200, isControl: false },
            ];

            const results = computeBayesianResults(variants);
            const treatment = results.find(r => r.variantKey === 'treatment');

            expect(treatment?.isWinner).toBe(true);
            expect(treatment?.probabilityToBeatControl).toBeGreaterThan(0.95);
        });

        it('should mark treatment as significant at 95% threshold', () => {
            const variants = [
                { key: 'control', visitors: 1000, conversions: 100, isControl: true },
                { key: 'treatment', visitors: 1000, conversions: 200, isControl: false },
            ];

            const results = computeBayesianResults(variants);
            const treatment = results.find(r => r.variantKey === 'treatment');

            expect(treatment?.isSignificant).toBe(true);
        });

        it('should calculate conversion rates correctly', () => {
            const variants = [
                { key: 'control', visitors: 100, conversions: 10, isControl: true },
                { key: 'treatment', visitors: 100, conversions: 20, isControl: false },
            ];

            const results = computeBayesianResults(variants);
            const control = results.find(r => r.variantKey === 'control');
            const treatment = results.find(r => r.variantKey === 'treatment');

            expect(control?.conversionRate).toBeCloseTo(0.10, 1);
            expect(treatment?.conversionRate).toBeCloseTo(0.20, 1);
        });

        it('should handle empty visitors', () => {
            const variants = [
                { key: 'control', visitors: 0, conversions: 0, isControl: true },
                { key: 'treatment', visitors: 0, conversions: 0, isControl: false },
            ];

            const results = computeBayesianResults(variants);

            expect(results).toHaveLength(2);
            expect(results[0].conversionRate).toBe(0);
        });

        it('should provide credible intervals for all variants', () => {
            const variants = [
                { key: 'control', visitors: 100, conversions: 10, isControl: true },
                { key: 'treatment', visitors: 100, conversions: 15, isControl: false },
            ];

            const results = computeBayesianResults(variants);

            results.forEach(result => {
                expect(result.credibleIntervalLow).toBeDefined();
                expect(result.credibleIntervalHigh).toBeDefined();
                expect(result.credibleIntervalLow).toBeLessThan(result.credibleIntervalHigh);
            });
        });
    });

    describe('recommendedSampleSize', () => {
        it('should calculate reasonable sample size for typical experiments', () => {
            // 10% baseline, 10% lift (1% absolute improvement)
            const n = recommendedSampleSize(0.10, 0.10);
            expect(n).toBeGreaterThan(1000);
            expect(n).toBeLessThan(100000);
        });

        it('should require more samples for smaller effects', () => {
            const largeEffect = recommendedSampleSize(0.10, 0.20); // 20% lift
            const smallEffect = recommendedSampleSize(0.10, 0.05); // 5% lift

            expect(smallEffect).toBeGreaterThan(largeEffect);
        });

        it('should return a number', () => {
            const n = recommendedSampleSize(0.05, 0.10);
            expect(typeof n).toBe('number');
            expect(n).toBeGreaterThan(0);
        });
    });
});
