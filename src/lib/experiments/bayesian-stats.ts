/**
 * Bayesian Statistics Library for A/B Testing
 * 
 * Implements Bayesian inference for conversion rate experiments.
 * Uses Beta-Binomial model with non-informative priors.
 * 
 * Key metrics:
 * - Probability to beat control
 * - Expected loss
 * - Credible intervals
 */

// Beta function approximation using Stirling's approximation
function lnBeta(a: number, b: number): number {
    return lnGamma(a) + lnGamma(b) - lnGamma(a + b);
}

// Log gamma function approximation
function lnGamma(z: number): number {
    if (z < 0.5) {
        return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
    }
    z -= 1;
    const g = 7;
    const c = [
        0.99999999999980993,
        676.5203681218851,
        -1259.1392167224028,
        771.32342877765313,
        -176.61502916214059,
        12.507343278686905,
        -0.13857109526572012,
        9.9843695780195716e-6,
        1.5056327351493116e-7,
    ];
    let x = c[0];
    for (let i = 1; i < g + 2; i++) {
        x += c[i] / (z + i);
    }
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// Beta distribution probability density function
function betaPdf(x: number, alpha: number, beta: number): number {
    if (x <= 0 || x >= 1) return 0;
    const lnPdf = (alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - lnBeta(alpha, beta);
    return Math.exp(lnPdf);
}

// Incomplete beta function (numerical integration)
function incompleteBeta(x: number, a: number, b: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Use continued fraction for better convergence
    const maxIterations = 100;
    const epsilon = 1e-10;

    const lnBetaAB = lnBeta(a, b);
    const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBetaAB) / a;

    // Lentz's algorithm for continued fraction
    let c = 1;
    let d = 1 - (a + b) * x / (a + 1);
    if (Math.abs(d) < epsilon) d = epsilon;
    d = 1 / d;
    let result = d;

    for (let m = 1; m <= maxIterations; m++) {
        const m2 = 2 * m;

        // Even term
        let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < epsilon) d = epsilon;
        c = 1 + aa / c;
        if (Math.abs(c) < epsilon) c = epsilon;
        d = 1 / d;
        result *= d * c;

        // Odd term
        aa = -((a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
        d = 1 + aa * d;
        if (Math.abs(d) < epsilon) d = epsilon;
        c = 1 + aa / c;
        if (Math.abs(c) < epsilon) c = epsilon;
        d = 1 / d;
        const delta = d * c;
        result *= delta;

        if (Math.abs(delta - 1) < epsilon) break;
    }

    return front * result;
}

// Beta CDF
function betaCdf(x: number, alpha: number, beta: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    if (x > (alpha + 1) / (alpha + beta + 2)) {
        return 1 - incompleteBeta(1 - x, beta, alpha);
    }
    return incompleteBeta(x, alpha, beta);
}

// Beta quantile (inverse CDF) using bisection
function betaQuantile(p: number, alpha: number, beta: number): number {
    if (p <= 0) return 0;
    if (p >= 1) return 1;

    let low = 0;
    let high = 1;
    const epsilon = 1e-8;

    for (let i = 0; i < 100; i++) {
        const mid = (low + high) / 2;
        const cdf = betaCdf(mid, alpha, beta);

        if (Math.abs(cdf - p) < epsilon) return mid;

        if (cdf < p) {
            low = mid;
        } else {
            high = mid;
        }
    }

    return (low + high) / 2;
}

// Sample from Beta distribution using rejection sampling
function sampleBeta(alpha: number, beta: number): number {
    // Use inverse transform sampling for small parameters
    // For larger parameters, use the Johnk algorithm
    if (alpha <= 1 && beta <= 1) {
        while (true) {
            const u = Math.random();
            const v = Math.random();
            const x = Math.pow(u, 1 / alpha);
            const y = Math.pow(v, 1 / beta);
            if (x + y <= 1) {
                return x / (x + y);
            }
        }
    }

    // Gamma-based method
    const gammaA = sampleGamma(alpha, 1);
    const gammaB = sampleGamma(beta, 1);
    return gammaA / (gammaA + gammaB);
}

// Sample from Gamma distribution
function sampleGamma(shape: number, scale: number): number {
    if (shape < 1) {
        return sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
        let x: number;
        let v: number;

        do {
            x = normalSample();
            v = 1 + c * x;
        } while (v <= 0);

        v = v * v * v;
        const u = Math.random();

        if (u < 1 - 0.0331 * (x * x) * (x * x)) {
            return d * v * scale;
        }

        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
            return d * v * scale;
        }
    }
}

// Sample from standard normal distribution (Box-Muller)
function normalSample(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export interface VariantStats {
    visitors: number;
    conversions: number;
    conversionRate: number;
}

export interface BayesianResult {
    variantKey: string;
    visitors: number;
    conversions: number;
    conversionRate: number;
    probabilityToBeatControl: number;
    expectedLoss: number;
    credibleIntervalLow: number;
    credibleIntervalHigh: number;
    isWinner: boolean;
    isSignificant: boolean;
}

/**
 * Calculate probability that treatment beats control using Monte Carlo simulation
 */
export function probabilityToBeatControl(
    controlVisitors: number,
    controlConversions: number,
    treatmentVisitors: number,
    treatmentConversions: number,
    numSamples: number = 10000
): number {
    // Beta prior: use uniform prior (alpha=1, beta=1)
    const priorAlpha = 1;
    const priorBeta = 1;

    // Posterior parameters
    const controlAlpha = priorAlpha + controlConversions;
    const controlBeta = priorBeta + (controlVisitors - controlConversions);
    const treatmentAlpha = priorAlpha + treatmentConversions;
    const treatmentBeta = priorBeta + (treatmentVisitors - treatmentConversions);

    let treatmentWins = 0;

    for (let i = 0; i < numSamples; i++) {
        const controlSample = sampleBeta(controlAlpha, controlBeta);
        const treatmentSample = sampleBeta(treatmentAlpha, treatmentBeta);

        if (treatmentSample > controlSample) {
            treatmentWins++;
        }
    }

    return treatmentWins / numSamples;
}

/**
 * Calculate expected loss (expected regret) for choosing treatment over control
 */
export function expectedLoss(
    controlVisitors: number,
    controlConversions: number,
    treatmentVisitors: number,
    treatmentConversions: number,
    numSamples: number = 10000
): number {
    const priorAlpha = 1;
    const priorBeta = 1;

    const controlAlpha = priorAlpha + controlConversions;
    const controlBeta = priorBeta + (controlVisitors - controlConversions);
    const treatmentAlpha = priorAlpha + treatmentConversions;
    const treatmentBeta = priorBeta + (treatmentVisitors - treatmentConversions);

    let totalLoss = 0;

    for (let i = 0; i < numSamples; i++) {
        const controlSample = sampleBeta(controlAlpha, controlBeta);
        const treatmentSample = sampleBeta(treatmentAlpha, treatmentBeta);

        // Loss is how much worse treatment could be than control
        const loss = Math.max(0, controlSample - treatmentSample);
        totalLoss += loss;
    }

    return totalLoss / numSamples;
}

/**
 * Calculate credible interval for conversion rate
 */
export function credibleInterval(
    visitors: number,
    conversions: number,
    credibility: number = 0.95
): { low: number; high: number } {
    const priorAlpha = 1;
    const priorBeta = 1;

    const alpha = priorAlpha + conversions;
    const beta = priorBeta + (visitors - conversions);

    const lower = (1 - credibility) / 2;
    const upper = 1 - lower;

    return {
        low: betaQuantile(lower, alpha, beta),
        high: betaQuantile(upper, alpha, beta),
    };
}

/**
 * Compute full Bayesian analysis for an experiment
 */
export function computeBayesianResults(
    variants: Array<{ key: string; visitors: number; conversions: number; isControl: boolean }>
): BayesianResult[] {
    const control = variants.find(v => v.isControl);
    if (!control || control.visitors === 0) {
        return variants.map(v => ({
            variantKey: v.key,
            visitors: v.visitors,
            conversions: v.conversions,
            conversionRate: v.visitors > 0 ? v.conversions / v.visitors : 0,
            probabilityToBeatControl: v.isControl ? 0.5 : 0,
            expectedLoss: 0,
            credibleIntervalLow: 0,
            credibleIntervalHigh: 0,
            isWinner: false,
            isSignificant: false,
        }));
    }

    const results: BayesianResult[] = [];
    let highestProb = 0;
    let winnerKey = control.key;

    for (const variant of variants) {
        const conversionRate = variant.visitors > 0
            ? variant.conversions / variant.visitors
            : 0;

        const ci = credibleInterval(variant.visitors, variant.conversions);

        let probBeatControl: number;
        let loss: number;

        if (variant.isControl) {
            probBeatControl = 0.5; // Control beats itself 50% of the time
            loss = 0;
        } else {
            probBeatControl = probabilityToBeatControl(
                control.visitors,
                control.conversions,
                variant.visitors,
                variant.conversions
            );
            loss = expectedLoss(
                control.visitors,
                control.conversions,
                variant.visitors,
                variant.conversions
            );
        }

        // Track winner (highest probability to be best)
        if (probBeatControl > highestProb) {
            highestProb = probBeatControl;
            winnerKey = variant.key;
        }

        results.push({
            variantKey: variant.key,
            visitors: variant.visitors,
            conversions: variant.conversions,
            conversionRate,
            probabilityToBeatControl: probBeatControl,
            expectedLoss: loss,
            credibleIntervalLow: ci.low,
            credibleIntervalHigh: ci.high,
            isWinner: false, // Set below
            isSignificant: probBeatControl >= 0.95 || probBeatControl <= 0.05,
        });
    }

    // Mark winner
    const winner = results.find(r => r.variantKey === winnerKey);
    if (winner) {
        winner.isWinner = true;
    }

    return results;
}

/**
 * Recommended sample size for 95% probability to detect a given lift
 */
export function recommendedSampleSize(
    baselineConversionRate: number,
    minimumDetectableEffect: number, // e.g., 0.1 for 10% relative lift
    desiredProbability: number = 0.95
): number {
    // Approximate formula based on simulation studies
    const treatmentRate = baselineConversionRate * (1 + minimumDetectableEffect);
    const pooledRate = (baselineConversionRate + treatmentRate) / 2;
    const effectSize = Math.abs(treatmentRate - baselineConversionRate) /
        Math.sqrt(pooledRate * (1 - pooledRate));

    // Sample size per variant
    const zAlpha = 1.96; // 95% confidence
    const zBeta = 1.64; // 95% power
    const n = 2 * Math.pow((zAlpha + zBeta) / effectSize, 2);

    return Math.ceil(n);
}
