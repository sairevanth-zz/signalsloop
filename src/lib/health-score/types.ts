/**
 * Product Health Score Types
 * Types for the gamified health score system based on feedback analysis
 */

export interface HealthScoreInput {
    overallSentiment: number; // -1 to 1
    sentimentTrend: 'improving' | 'stable' | 'declining';
    criticalIssueCount: number;
    totalFeedbackCount: number;
    praisePercentage: number; // 0 to 100
    topThemeConcentration: number; // 0 to 100 - How much of feedback is top 3 themes
    productName?: string;
}

export interface HealthScoreGrade {
    label: 'Excellent' | 'Good' | 'Needs Attention' | 'Critical';
    color: 'green' | 'blue' | 'yellow' | 'red';
    emoji: '🟢' | '🔵' | '🟡' | '🔴';
    description: string;
}

export interface HealthScoreComponent {
    name: string;
    score: number; // 0 to 100
    weight: number; // Percentage weight (e.g., 30 for 30%)
    weightedScore: number; // score * (weight / 100)
    status: 'excellent' | 'good' | 'warning' | 'critical';
    description: string;
}

export interface HealthScoreAction {
    priority: number; // 1 = highest priority
    component: string;
    action: string;
    impact: string; // e.g., "Could improve score by ~5 points"
    urgency: 'critical' | 'high' | 'medium' | 'low';
}

export interface HealthScore {
    score: number; // 0 to 100
    grade: HealthScoreGrade;
    components: {
        sentiment: HealthScoreComponent;
        trend: HealthScoreComponent;
        issues: HealthScoreComponent;
        clarity: HealthScoreComponent;
        love: HealthScoreComponent;
    };
    interpretation: string;
    topActions: HealthScoreAction[];
    productName?: string;
    calculatedAt: string;
}

export interface HealthScoreRecord {
    id: string;
    sessionId?: string;
    score: number;
    grade: string;
    components: HealthScore['components'];
    actions: HealthScoreAction[];
    shareToken?: string;
    createdAt: string;
}
