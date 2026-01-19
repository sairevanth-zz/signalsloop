/**
 * Experiment Statistics Library
 * Provides statistical analysis for A/B test results
 */

/**
 * Calculate Z-score for two proportions test
 */
export function calculateZScore(
    controlConversions: number,
    controlVisitors: number,
    treatmentConversions: number,
    treatmentVisitors: number
): number {
    const p1 = controlConversions / controlVisitors;
    const p2 = treatmentConversions / treatmentVisitors;

    // Pooled proportion
    const pooledP = (controlConversions + treatmentConversions) / (controlVisitors + treatmentVisitors);

    // Standard error
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / controlVisitors + 1 / treatmentVisitors));

    if (se === 0) return 0;

    return (p2 - p1) / se;
}

/**
 * Calculate P-value from Z-score (two-tailed test)
 */
export function calculatePValue(zScore: number): number {
    // Standard normal CDF approximation using error function
    const absZ = Math.abs(zScore);

    // Approximation of the normal CDF
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = zScore < 0 ? -1 : 1;
    const x = absZ / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    const cdf = 0.5 * (1.0 + sign * y);

    // Two-tailed p-value
    return 2 * (1 - cdf);
}

/**
 * Calculate confidence interval for a proportion
 */
export function calculateConfidenceInterval(
    conversions: number,
    visitors: number,
    confidenceLevel: number = 0.95
): { lower: number; upper: number } {
    const p = conversions / visitors;

    // Z-score for confidence level (e.g., 1.96 for 95%)
    const zScores: Record<number, number> = {
        0.90: 1.645,
        0.95: 1.96,
        0.99: 2.576,
    };
    const z = zScores[confidenceLevel] || 1.96;

    // Standard error
    const se = Math.sqrt((p * (1 - p)) / visitors);

    return {
        lower: Math.max(0, p - z * se),
        upper: Math.min(1, p + z * se),
    };
}

/**
 * Calculate relative improvement (lift)
 */
export function calculateLift(
    controlRate: number,
    treatmentRate: number
): number {
    if (controlRate === 0) return 0;
    return ((treatmentRate - controlRate) / controlRate) * 100;
}

/**
 * Calculate confidence percentage (probability that treatment is better)
 */
export function calculateConfidencePercent(zScore: number): number {
    // Use the same CDF approximation but for one-tailed
    const absZ = Math.abs(zScore);

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const x = absZ / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    // If z > 0, treatment is better with this probability
    // If z < 0, control is better
    const probability = 0.5 * (1.0 + y);

    return zScore >= 0 ? probability * 100 : (1 - probability) * 100;
}

/**
 * Check if result is statistically significant
 */
export function isStatisticallySignificant(
    pValue: number,
    alpha: number = 0.05
): boolean {
    return pValue < alpha;
}

/**
 * Calculate statistical power achieved
 */
export function calculateAchievedPower(
    controlConversions: number,
    controlVisitors: number,
    treatmentConversions: number,
    treatmentVisitors: number,
    alpha: number = 0.05
): number {
    const p1 = controlConversions / controlVisitors;
    const p2 = treatmentConversions / treatmentVisitors;
    const n = Math.min(controlVisitors, treatmentVisitors);

    // Effect size (Cohen's h)
    const h = 2 * Math.asin(Math.sqrt(p2)) - 2 * Math.asin(Math.sqrt(p1));

    // Z-alpha for two-tailed test
    const zAlpha = 1.96; // For alpha = 0.05

    // Non-centrality parameter
    const lambda = h * Math.sqrt(n / 2);

    // Approximate power
    const power = calculateConfidencePercent(lambda - zAlpha) / 100;

    return Math.min(1, Math.max(0, power));
}

/**
 * Full statistical analysis of experiment results
 */
export interface ExperimentAnalysis {
    controlRate: number;
    treatmentRate: number;
    lift: number;
    zScore: number;
    pValue: number;
    confidence: number;
    isSignificant: boolean;
    controlCI: { lower: number; upper: number };
    treatmentCI: { lower: number; upper: number };
    achievedPower: number;
    recommendation: 'ship' | 'continue' | 'stop_negative' | 'inconclusive';
    recommendationText: string;
}

export function analyzeExperiment(
    controlConversions: number,
    controlVisitors: number,
    treatmentConversions: number,
    treatmentVisitors: number,
    minimumSampleSize: number = 1000,
    confidenceThreshold: number = 95
): ExperimentAnalysis {
    const controlRate = controlVisitors > 0 ? controlConversions / controlVisitors : 0;
    const treatmentRate = treatmentVisitors > 0 ? treatmentConversions / treatmentVisitors : 0;

    const zScore = calculateZScore(
        controlConversions,
        controlVisitors,
        treatmentConversions,
        treatmentVisitors
    );

    const pValue = calculatePValue(zScore);
    const confidence = calculateConfidencePercent(zScore);
    const lift = calculateLift(controlRate, treatmentRate);
    const isSignificant = isStatisticallySignificant(pValue);

    const controlCI = calculateConfidenceInterval(controlConversions, controlVisitors);
    const treatmentCI = calculateConfidenceInterval(treatmentConversions, treatmentVisitors);

    const achievedPower = calculateAchievedPower(
        controlConversions,
        controlVisitors,
        treatmentConversions,
        treatmentVisitors
    );

    // Determine recommendation
    const totalVisitors = controlVisitors + treatmentVisitors;
    let recommendation: ExperimentAnalysis['recommendation'];
    let recommendationText: string;

    if (totalVisitors < minimumSampleSize) {
        recommendation = 'continue';
        recommendationText = `Need more data. Currently ${totalVisitors.toLocaleString()} visitors, recommend at least ${minimumSampleSize.toLocaleString()}.`;
    } else if (confidence >= confidenceThreshold && lift > 0) {
        recommendation = 'ship';
        recommendationText = `Treatment is winning with ${confidence.toFixed(1)}% confidence. Consider shipping!`;
    } else if (confidence >= confidenceThreshold && lift < 0) {
        recommendation = 'stop_negative';
        recommendationText = `Control is significantly better. Consider stopping the experiment.`;
    } else {
        recommendation = 'inconclusive';
        recommendationText = `Results not yet significant. ${confidence.toFixed(1)}% confidence (need ${confidenceThreshold}%).`;
    }

    return {
        controlRate,
        treatmentRate,
        lift,
        zScore,
        pValue,
        confidence,
        isSignificant,
        controlCI,
        treatmentCI,
        achievedPower,
        recommendation,
        recommendationText,
    };
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format large numbers with K/M suffixes
 */
export function formatNumber(value: number): string {
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
}
