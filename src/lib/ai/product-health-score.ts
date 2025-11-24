/**
 * Product Health Score Algorithm
 * Combines sentiment, feedback velocity, roadmap progress, and competitive position
 * into a unified health score (0-100)
 */

import type { DashboardMetrics } from './mission-control';

export interface ProductHealthScore {
  overall_score: number;
  rating: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  trend: 'improving' | 'stable' | 'declining';

  // Component scores for transparency
  components: {
    sentiment: {
      score: number;
      weight: number;
      weighted_contribution: number;
    };
    feedback: {
      score: number;
      weight: number;
      weighted_contribution: number;
    };
    roadmap: {
      score: number;
      weight: number;
      weighted_contribution: number;
    };
    competitive: {
      score: number;
      weight: number;
      weighted_contribution: number;
    };
  };

  // Actionable insights
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
}

/**
 * Calculate Product Health Score from dashboard metrics
 *
 * Algorithm:
 * - Sentiment (40%): Customer satisfaction is the primary indicator
 * - Roadmap (30%): Execution velocity and progress
 * - Feedback (20%): Issue volume and trend
 * - Competitive (10%): External threats
 */
export function calculateProductHealthScore(metrics: DashboardMetrics): ProductHealthScore {
  // ============================================================================
  // 1. SENTIMENT HEALTH (40% weight)
  // ============================================================================
  const sentimentBase = metrics.sentiment?.current_nps || 0;
  const sentimentModifier =
    metrics.sentiment?.trend === 'up' ? 5 :
    metrics.sentiment?.trend === 'down' ? -5 : 0;
  const sentimentScore = Math.min(100, Math.max(0, sentimentBase + sentimentModifier));

  // ============================================================================
  // 2. FEEDBACK HEALTH (20% weight)
  // ============================================================================
  // Lower feedback volume = healthier (fewer issues)
  // Cap at 50 issues per week to avoid extreme penalties
  const feedbackVolume = metrics.feedback?.total_this_week || 0;
  const feedbackBase = 100 - Math.min(feedbackVolume, 50) * 2;

  // Penalty if feedback is increasing (more issues coming in)
  const feedbackModifier =
    metrics.feedback?.trend === 'up' ? -10 :
    metrics.feedback?.trend === 'down' ? 10 : 0;
  const feedbackScore = Math.min(100, Math.max(0, feedbackBase + feedbackModifier));

  // ============================================================================
  // 3. ROADMAP HEALTH (30% weight)
  // ============================================================================
  const inProgress = metrics.roadmap?.in_progress || 0;
  const planned = metrics.roadmap?.planned || 0;
  const completedThisWeek = metrics.roadmap?.completed_this_week || 0;
  const totalItems = inProgress + planned + completedThisWeek;

  let roadmapScore = 50; // Neutral baseline

  if (totalItems > 0) {
    // Calculate completion rate
    const completionRate = (completedThisWeek / totalItems) * 100;
    roadmapScore = completionRate;

    // Velocity bonus: shipping = good
    if (completedThisWeek > 0) {
      roadmapScore += 20;
    }

    // Progress penalty: nothing in progress = stalled
    if (inProgress === 0 && planned > 0) {
      roadmapScore -= 20;
    }

    // Balance bonus: healthy in-progress to planned ratio
    if (inProgress > 0 && planned > 0) {
      const ratio = inProgress / planned;
      if (ratio >= 0.3 && ratio <= 2.0) {
        roadmapScore += 10; // Good balance
      }
    }
  } else {
    // No roadmap items = needs planning
    roadmapScore = 40;
  }

  roadmapScore = Math.min(100, Math.max(0, roadmapScore));

  // ============================================================================
  // 4. COMPETITIVE HEALTH (10% weight)
  // ============================================================================
  const highPriorityThreats = metrics.competitors?.high_priority_count || 0;
  const competitiveScore = Math.max(0, 100 - (highPriorityThreats * 10));

  // ============================================================================
  // 5. CALCULATE WEIGHTED OVERALL SCORE
  // ============================================================================
  const weights = {
    sentiment: 0.4,
    feedback: 0.2,
    roadmap: 0.3,
    competitive: 0.1,
  };

  const components = {
    sentiment: {
      score: sentimentScore,
      weight: weights.sentiment,
      weighted_contribution: sentimentScore * weights.sentiment,
    },
    feedback: {
      score: feedbackScore,
      weight: weights.feedback,
      weighted_contribution: feedbackScore * weights.feedback,
    },
    roadmap: {
      score: roadmapScore,
      weight: weights.roadmap,
      weighted_contribution: roadmapScore * weights.roadmap,
    },
    competitive: {
      score: competitiveScore,
      weight: weights.competitive,
      weighted_contribution: competitiveScore * weights.competitive,
    },
  };

  const overallScore = Math.round(
    components.sentiment.weighted_contribution +
    components.feedback.weighted_contribution +
    components.roadmap.weighted_contribution +
    components.competitive.weighted_contribution
  );

  // ============================================================================
  // 6. DETERMINE RATING
  // ============================================================================
  let rating: ProductHealthScore['rating'];
  if (overallScore >= 90) rating = 'excellent';
  else if (overallScore >= 75) rating = 'good';
  else if (overallScore >= 60) rating = 'fair';
  else if (overallScore >= 40) rating = 'poor';
  else rating = 'critical';

  // ============================================================================
  // 7. DETERMINE TREND
  // ============================================================================
  // Simplified trend based on sentiment and feedback trends
  let trend: ProductHealthScore['trend'] = 'stable';
  const positiveSignals = [
    metrics.sentiment?.trend === 'up',
    metrics.feedback?.trend === 'down', // Less feedback = good
    completedThisWeek > 0,
  ].filter(Boolean).length;

  const negativeSignals = [
    metrics.sentiment?.trend === 'down',
    metrics.feedback?.trend === 'up',
    highPriorityThreats > 2,
  ].filter(Boolean).length;

  if (positiveSignals > negativeSignals) trend = 'improving';
  else if (negativeSignals > positiveSignals) trend = 'declining';

  // ============================================================================
  // 8. GENERATE ACTIONABLE INSIGHTS
  // ============================================================================
  const recommendations: string[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Analyze sentiment
  if (sentimentScore >= 80) {
    strengths.push('Strong customer satisfaction');
  } else if (sentimentScore < 50) {
    weaknesses.push('Low customer sentiment');
    recommendations.push('Address urgent negative feedback to improve satisfaction');
  }

  // Analyze feedback
  if (feedbackVolume < 10) {
    strengths.push('Low issue volume');
  } else if (feedbackVolume > 30) {
    weaknesses.push('High volume of feedback/issues');
    recommendations.push('Triage and prioritize feedback to reduce backlog');
  }

  if (metrics.feedback?.trend === 'up') {
    recommendations.push('Investigate cause of increasing feedback volume');
  }

  // Analyze roadmap
  if (completedThisWeek > 0) {
    strengths.push(`Shipped ${completedThisWeek} feature${completedThisWeek > 1 ? 's' : ''} this week`);
  } else {
    weaknesses.push('No features completed this week');
    recommendations.push('Review roadmap progress and identify blockers');
  }

  if (inProgress === 0 && planned > 0) {
    recommendations.push('Move planned items to in-progress to maintain velocity');
  }

  if (inProgress > planned * 2) {
    recommendations.push('Balance work-in-progress - consider completing current items before starting new ones');
  }

  // Analyze competitive position
  if (highPriorityThreats === 0) {
    strengths.push('No high-priority competitive threats');
  } else if (highPriorityThreats > 2) {
    weaknesses.push(`${highPriorityThreats} high-priority competitive threats`);
    recommendations.push('Review competitive intelligence and adjust roadmap priorities');
  }

  // Fallback messages
  if (strengths.length === 0) {
    strengths.push('Areas for improvement identified');
  }

  if (recommendations.length === 0) {
    if (overallScore >= 80) {
      recommendations.push('Maintain current momentum and execution velocity');
    } else {
      recommendations.push('Focus on improving lowest-scoring health components');
    }
  }

  return {
    overall_score: overallScore,
    rating,
    trend,
    components,
    recommendations,
    strengths,
    weaknesses,
  };
}

/**
 * Get rating emoji and color
 */
export function getHealthScoreDisplay(rating: ProductHealthScore['rating']): {
  emoji: string;
  color: string;
  label: string;
} {
  switch (rating) {
    case 'excellent':
      return { emoji: '⭐⭐⭐⭐⭐', color: 'text-green-400', label: 'Excellent' };
    case 'good':
      return { emoji: '⭐⭐⭐⭐', color: 'text-blue-400', label: 'Good' };
    case 'fair':
      return { emoji: '⭐⭐⭐', color: 'text-yellow-400', label: 'Fair' };
    case 'poor':
      return { emoji: '⭐⭐', color: 'text-orange-400', label: 'Poor' };
    case 'critical':
      return { emoji: '⭐', color: 'text-red-400', label: 'Critical' };
  }
}

/**
 * Get trend display
 */
export function getTrendDisplay(trend: ProductHealthScore['trend']): {
  emoji: string;
  color: string;
  label: string;
} {
  switch (trend) {
    case 'improving':
      return { emoji: '↗️', color: 'text-green-400', label: 'Improving' };
    case 'stable':
      return { emoji: '→', color: 'text-slate-400', label: 'Stable' };
    case 'declining':
      return { emoji: '↘️', color: 'text-red-400', label: 'Declining' };
  }
}
