/**
 * Product Health Score Calculator
 * Calculates a gamified health score (0-100) based on feedback analysis
 */

import {
    HealthScoreInput,
    HealthScore,
    HealthScoreGrade,
    HealthScoreComponent,
    HealthScoreAction,
} from './types';

/**
 * Main function to calculate the product health score
 * Based on weighted components: Sentiment (30%), Trend (20%), Issues (20%), Clarity (15%), Love (15%)
 */
export function calculateHealthScore(input: HealthScoreInput): HealthScore {
    // Calculate individual component scores
    const sentimentComponent = calculateSentimentComponent(input.overallSentiment);
    const trendComponent = calculateTrendComponent(input.sentimentTrend);
    const issuesComponent = calculateIssuesComponent(input.criticalIssueCount, input.totalFeedbackCount);
    const clarityComponent = calculateClarityComponent(input.topThemeConcentration);
    const loveComponent = calculateLoveComponent(input.praisePercentage);

    // Calculate total weighted score
    const totalScore = Math.round(
        sentimentComponent.weightedScore +
        trendComponent.weightedScore +
        issuesComponent.weightedScore +
        clarityComponent.weightedScore +
        loveComponent.weightedScore
    );

    // Clamp score between 0 and 100
    const clampedScore = Math.min(100, Math.max(0, totalScore));

    // Get grade based on score
    const grade = getGrade(clampedScore);

    // Generate interpretation
    const interpretation = getInterpretation(clampedScore, grade);

    // Generate recommended actions
    const topActions = generateActions(input, {
        sentiment: sentimentComponent,
        trend: trendComponent,
        issues: issuesComponent,
        clarity: clarityComponent,
        love: loveComponent,
    });

    return {
        score: clampedScore,
        grade,
        components: {
            sentiment: sentimentComponent,
            trend: trendComponent,
            issues: issuesComponent,
            clarity: clarityComponent,
            love: loveComponent,
        },
        interpretation,
        topActions,
        productName: input.productName,
        calculatedAt: new Date().toISOString(),
    };
}

/**
 * Calculate sentiment component (30% weight)
 * Normalizes -1 to 1 sentiment to 0-100 scale
 */
function calculateSentimentComponent(overallSentiment: number): HealthScoreComponent {
    // Normalize -1 to 1 => 0 to 100
    const score = ((overallSentiment + 1) / 2) * 100;
    const weight = 30;
    const weightedScore = score * (weight / 100);

    return {
        name: 'Overall Sentiment',
        score: Math.round(score),
        weight,
        weightedScore,
        status: getComponentStatus(score),
        description: getSentimentDescription(score),
    };
}

/**
 * Calculate trend component (20% weight)
 * Improving: 100, Stable: 60, Declining: 20
 */
function calculateTrendComponent(sentimentTrend: HealthScoreInput['sentimentTrend']): HealthScoreComponent {
    const score = sentimentTrend === 'improving' ? 100
        : sentimentTrend === 'stable' ? 60
            : 20;
    const weight = 20;
    const weightedScore = score * (weight / 100);

    return {
        name: 'Sentiment Trend',
        score,
        weight,
        weightedScore,
        status: getComponentStatus(score),
        description: getTrendDescription(sentimentTrend),
    };
}

/**
 * Calculate issues component (20% weight)
 * Penalizes critical issues heavily
 */
function calculateIssuesComponent(criticalIssueCount: number, totalFeedbackCount: number): HealthScoreComponent {
    const issueRatio = totalFeedbackCount > 0 ? criticalIssueCount / totalFeedbackCount : 0;
    // Heavy penalty for critical issues (500x multiplier means 20% critical issues = 0 score)
    const score = Math.max(0, 100 - (issueRatio * 500));
    const weight = 20;
    const weightedScore = score * (weight / 100);

    return {
        name: 'Issue Resolution',
        score: Math.round(score),
        weight,
        weightedScore,
        status: getComponentStatus(score),
        description: getIssuesDescription(criticalIssueCount, score),
    };
}

/**
 * Calculate clarity component (15% weight)
 * Higher theme concentration = clearer signal = easier to act on
 */
function calculateClarityComponent(topThemeConcentration: number): HealthScoreComponent {
    const score = Math.min(100, Math.max(0, topThemeConcentration));
    const weight = 15;
    const weightedScore = score * (weight / 100);

    return {
        name: 'Feature Clarity',
        score: Math.round(score),
        weight,
        weightedScore,
        status: getComponentStatus(score),
        description: getClarityDescription(score),
    };
}

/**
 * Calculate love component (15% weight)
 * Based on percentage of feedback that is praise
 */
function calculateLoveComponent(praisePercentage: number): HealthScoreComponent {
    const score = Math.min(100, Math.max(0, praisePercentage));
    const weight = 15;
    const weightedScore = score * (weight / 100);

    return {
        name: 'User Love',
        score: Math.round(score),
        weight,
        weightedScore,
        status: getComponentStatus(score),
        description: getLoveDescription(score),
    };
}

/**
 * Get grade based on total score
 */
function getGrade(score: number): HealthScoreGrade {
    if (score >= 80) {
        return {
            label: 'Excellent',
            color: 'green',
            emoji: '🟢',
            description: 'Your product is thriving! Users love it and feedback is predominantly positive.',
        };
    }
    if (score >= 60) {
        return {
            label: 'Good',
            color: 'blue',
            emoji: '🔵',
            description: 'Your product is performing well with room for improvement in key areas.',
        };
    }
    if (score >= 40) {
        return {
            label: 'Needs Attention',
            color: 'yellow',
            emoji: '🟡',
            description: 'There are significant opportunities to improve user satisfaction.',
        };
    }
    return {
        label: 'Critical',
        color: 'red',
        emoji: '🔴',
        description: 'Urgent attention needed. Critical issues are impacting user experience.',
    };
}

/**
 * Get component status based on individual score
 */
function getComponentStatus(score: number): HealthScoreComponent['status'] {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'warning';
    return 'critical';
}

/**
 * Generate interpretation text
 */
function getInterpretation(score: number, grade: HealthScoreGrade): string {
    if (score >= 80) {
        return `Your product health score of ${score} is ${grade.label}! ${grade.emoji} Your users are highly satisfied and the feedback trends are positive. Keep up the excellent work and continue listening to your users.`;
    }
    if (score >= 60) {
        return `Your product health score of ${score} is ${grade.label}. ${grade.emoji} You're doing well overall, but there are opportunities to improve. Focus on the recommended actions below to boost your score.`;
    }
    if (score >= 40) {
        return `Your product health score of ${score} ${grade.label}. ${grade.emoji} There are several areas requiring attention. Prioritize addressing critical issues and improving user sentiment to get back on track.`;
    }
    return `Your product health score of ${score} is ${grade.label}. ${grade.emoji} This requires immediate attention. Focus on resolving critical issues first, then work on improving overall sentiment.`;
}

/**
 * Generate improvement actions based on component scores
 */
function generateActions(
    input: HealthScoreInput,
    components: HealthScore['components']
): HealthScoreAction[] {
    const actions: HealthScoreAction[] = [];

    // Check each component and suggest actions for low-scoring ones
    if (components.sentiment.score < 60) {
        const improvement = Math.round((60 - components.sentiment.score) * 0.3);
        actions.push({
            priority: components.sentiment.score < 40 ? 1 : 2,
            component: 'Overall Sentiment',
            action: 'Address negative feedback themes to improve overall sentiment',
            impact: `Could improve score by ~${improvement} points`,
            urgency: components.sentiment.score < 40 ? 'critical' : 'high',
        });
    }

    if (components.trend.score < 60) {
        actions.push({
            priority: components.trend.score < 40 ? 1 : 3,
            component: 'Sentiment Trend',
            action: 'Investigate what\'s causing sentiment decline and address root causes',
            impact: 'Could improve score by ~4-8 points',
            urgency: components.trend.score < 40 ? 'critical' : 'medium',
        });
    }

    if (components.issues.score < 60) {
        const improvement = Math.round((60 - components.issues.score) * 0.2);
        actions.push({
            priority: 1,
            component: 'Issue Resolution',
            action: `Prioritize fixing ${input.criticalIssueCount} critical issues reported by users`,
            impact: `Could improve score by ~${improvement} points`,
            urgency: 'critical',
        });
    }

    if (components.clarity.score < 60) {
        actions.push({
            priority: 4,
            component: 'Feature Clarity',
            action: 'Feedback is scattered across many themes. Focus on top 3 user needs.',
            impact: 'Could improve score by ~3-5 points',
            urgency: 'medium',
        });
    }

    if (components.love.score < 40) {
        actions.push({
            priority: 3,
            component: 'User Love',
            action: 'Identify what delights users and double down on those features',
            impact: 'Could improve score by ~3-6 points',
            urgency: 'medium',
        });
    }

    // Sort by priority
    actions.sort((a, b) => a.priority - b.priority);

    // Return top 5 actions
    return actions.slice(0, 5);
}

// Helper description functions
function getSentimentDescription(score: number): string {
    if (score >= 80) return 'Users are expressing overwhelmingly positive sentiment';
    if (score >= 60) return 'Sentiment is generally positive with some concerns';
    if (score >= 40) return 'Mixed feelings - balance of positive and negative feedback';
    return 'Predominantly negative sentiment detected in feedback';
}

function getTrendDescription(trend: HealthScoreInput['sentimentTrend']): string {
    switch (trend) {
        case 'improving': return 'Sentiment is trending upward - great momentum!';
        case 'stable': return 'Sentiment has been consistent over time';
        case 'declining': return 'Sentiment is trending downward - needs attention';
    }
}

function getIssuesDescription(count: number, score: number): string {
    if (count === 0) return 'No critical issues detected';
    if (score >= 80) return 'Few critical issues relative to total feedback';
    if (score >= 60) return `${count} critical issues - being addressed`;
    return `${count} critical issues requiring immediate attention`;
}

function getClarityDescription(score: number): string {
    if (score >= 80) return 'Clear user needs - top themes are well-defined';
    if (score >= 60) return 'Reasonably clear signal on user priorities';
    if (score >= 40) return 'Feedback is somewhat scattered across themes';
    return 'Low clarity - feedback spread thin across many themes';
}

function getLoveDescription(score: number): string {
    if (score >= 80) return 'Users frequently express love for your product!';
    if (score >= 60) return 'Good amount of praise in user feedback';
    if (score >= 40) return 'Some praise, but room to delight users more';
    return 'Low praise ratio - focus on user delight';
}

/**
 * Generate a unique share token
 */
export function generateShareToken(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 12; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

/**
 * Calculate health score from feedback analysis results
 * This bridges the feedback analysis output to health score input
 */
export function calculateHealthScoreFromAnalysis(analysisResult: {
    product_summary: {
        overall_sentiment: number;
        total_feedback_analyzed: number;
    };
    themes: Array<{
        category: string;
        mention_count: number;
        sentiment: number;
    }>;
    critical_issues: Array<{ issue: string }>;
    what_users_love: Array<{ mentions: number }>;
}): HealthScoreInput {
    const { product_summary, themes, critical_issues, what_users_love } = analysisResult;

    // Calculate praise percentage
    const totalPraiseMentions = what_users_love.reduce((sum, item) => sum + item.mentions, 0);
    const praisePercentage = product_summary.total_feedback_analyzed > 0
        ? (totalPraiseMentions / product_summary.total_feedback_analyzed) * 100
        : 0;

    // Calculate theme concentration (top 3 themes as percentage of total)
    const sortedThemes = [...themes].sort((a, b) => b.mention_count - a.mention_count);
    const top3Mentions = sortedThemes.slice(0, 3).reduce((sum, t) => sum + t.mention_count, 0);
    const totalMentions = themes.reduce((sum, t) => sum + t.mention_count, 0);
    const topThemeConcentration = totalMentions > 0 ? (top3Mentions / totalMentions) * 100 : 50;

    // Determine sentiment trend (simplified - would need historical data for real trend)
    const sentimentTrend: HealthScoreInput['sentimentTrend'] =
        product_summary.overall_sentiment > 0.3 ? 'improving' :
            product_summary.overall_sentiment < -0.3 ? 'declining' : 'stable';

    return {
        overallSentiment: product_summary.overall_sentiment,
        sentimentTrend,
        criticalIssueCount: critical_issues.length,
        totalFeedbackCount: product_summary.total_feedback_analyzed,
        praisePercentage: Math.min(100, praisePercentage),
        topThemeConcentration: Math.min(100, topThemeConcentration),
    };
}
