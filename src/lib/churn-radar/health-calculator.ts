/**
 * Customer Health Calculator
 * Calculates health scores based on multiple signals
 */

export interface HealthSignal {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  factors: string[];
}

export interface HealthWeights {
  engagement: number;
  sentiment: number;
  support: number;
  productUsage: number;
  payment: number;
}

export interface CustomerData {
  // Identity
  customerId?: string;
  email?: string;
  name?: string;
  company?: string;
  
  // Engagement data
  lastLoginAt?: Date;
  loginCount7d?: number;
  loginCount30d?: number;
  
  // Product usage
  featureAdoptionRate?: number; // 0-100
  keyFeaturesUsed?: string[];
  
  // Support data
  openTickets?: number;
  ticketsLast30d?: number;
  avgResolutionHours?: number;
  lastSupportContact?: Date;
  
  // Feedback/sentiment
  feedbackCount30d?: number;
  avgSentiment30d?: number; // -1 to 1
  negativeFeedbackCount30d?: number;
  npsScore?: number; // -100 to 100
  
  // Payment
  paymentFailures90d?: number;
  lastPaymentFailure?: Date;
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'trialing';
  
  // Account
  mrr?: number;
  planName?: string;
  contractEndDate?: Date;
  accountCreatedAt?: Date;
}

export interface HealthCalculationResult {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  churnProbability: number;
  
  signals: {
    engagement: HealthSignal;
    sentiment: HealthSignal;
    support: HealthSignal;
    productUsage: HealthSignal;
    payment: HealthSignal;
  };
  
  riskFactors: Array<{
    factor: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    weight: number;
  }>;
  
  positiveSignals: Array<{
    signal: string;
    strength: 'strong' | 'medium' | 'weak';
  }>;
  
  summary: string;
  recommendedActions: string[];
}

// Default weights for health score calculation
export const DEFAULT_WEIGHTS: HealthWeights = {
  engagement: 0.25,
  sentiment: 0.25,
  support: 0.20,
  productUsage: 0.20,
  payment: 0.10,
};

export class HealthCalculator {
  private weights: HealthWeights;
  
  constructor(weights: HealthWeights = DEFAULT_WEIGHTS) {
    this.weights = weights;
  }
  
  /**
   * Calculate health score for a customer
   */
  calculate(data: CustomerData): HealthCalculationResult {
    // Calculate individual signal scores
    const engagementSignal = this.calculateEngagementScore(data);
    const sentimentSignal = this.calculateSentimentScore(data);
    const supportSignal = this.calculateSupportScore(data);
    const productUsageSignal = this.calculateProductUsageScore(data);
    const paymentSignal = this.calculatePaymentScore(data);
    
    // Calculate weighted overall score
    const overallScore = Math.round(
      engagementSignal.score * this.weights.engagement +
      sentimentSignal.score * this.weights.sentiment +
      supportSignal.score * this.weights.support +
      productUsageSignal.score * this.weights.productUsage +
      paymentSignal.score * this.weights.payment
    );
    
    // Determine grade and risk
    const grade = this.scoreToGrade(overallScore);
    const churnRisk = this.scoreToRisk(overallScore);
    const churnProbability = this.calculateChurnProbability(overallScore, {
      engagement: engagementSignal,
      sentiment: sentimentSignal,
      support: supportSignal,
      productUsage: productUsageSignal,
      payment: paymentSignal,
    });
    
    // Extract risk factors and positive signals
    const riskFactors = this.extractRiskFactors({
      engagement: engagementSignal,
      sentiment: sentimentSignal,
      support: supportSignal,
      productUsage: productUsageSignal,
      payment: paymentSignal,
    });
    
    const positiveSignals = this.extractPositiveSignals({
      engagement: engagementSignal,
      sentiment: sentimentSignal,
      support: supportSignal,
      productUsage: productUsageSignal,
      payment: paymentSignal,
    });
    
    // Generate summary and recommendations
    const summary = this.generateSummary(overallScore, churnRisk, riskFactors, positiveSignals);
    const recommendedActions = this.generateRecommendations(churnRisk, riskFactors, data);
    
    return {
      overallScore,
      grade,
      churnRisk,
      churnProbability,
      signals: {
        engagement: engagementSignal,
        sentiment: sentimentSignal,
        support: supportSignal,
        productUsage: productUsageSignal,
        payment: paymentSignal,
      },
      riskFactors,
      positiveSignals,
      summary,
      recommendedActions,
    };
  }
  
  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(data: CustomerData): HealthSignal {
    let score = 50; // Default neutral score
    const factors: string[] = [];
    
    // Days since last login
    if (data.lastLoginAt) {
      const daysSinceLogin = Math.floor(
        (Date.now() - data.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLogin <= 1) {
        score += 30;
        factors.push('Active today');
      } else if (daysSinceLogin <= 7) {
        score += 20;
        factors.push('Active this week');
      } else if (daysSinceLogin <= 14) {
        score += 0;
        factors.push('No activity in 1-2 weeks');
      } else if (daysSinceLogin <= 30) {
        score -= 20;
        factors.push('No activity in 2-4 weeks');
      } else {
        score -= 40;
        factors.push(`No login in ${daysSinceLogin} days`);
      }
    } else {
      score -= 20;
      factors.push('No login data available');
    }
    
    // Login frequency
    if (data.loginCount7d !== undefined) {
      if (data.loginCount7d >= 5) {
        score += 15;
        factors.push('High weekly activity');
      } else if (data.loginCount7d >= 2) {
        score += 5;
        factors.push('Moderate weekly activity');
      } else if (data.loginCount7d === 0) {
        score -= 10;
        factors.push('No activity this week');
      }
    }
    
    return {
      name: 'Engagement',
      score: Math.max(0, Math.min(100, score)),
      weight: this.weights.engagement,
      factors,
    };
  }
  
  /**
   * Calculate sentiment score
   */
  private calculateSentimentScore(data: CustomerData): HealthSignal {
    let score = 50;
    const factors: string[] = [];
    
    // Average sentiment
    if (data.avgSentiment30d !== undefined) {
      // Convert -1 to 1 range to 0-100
      const sentimentScore = Math.round((data.avgSentiment30d + 1) * 50);
      score = sentimentScore;
      
      if (data.avgSentiment30d > 0.3) {
        factors.push('Positive feedback sentiment');
      } else if (data.avgSentiment30d < -0.3) {
        factors.push('Negative feedback sentiment');
      } else {
        factors.push('Neutral feedback sentiment');
      }
    }
    
    // Negative feedback count
    if (data.negativeFeedbackCount30d !== undefined) {
      if (data.negativeFeedbackCount30d >= 3) {
        score -= 20;
        factors.push(`${data.negativeFeedbackCount30d} negative feedback items`);
      } else if (data.negativeFeedbackCount30d >= 1) {
        score -= 10;
        factors.push('Some negative feedback');
      }
    }
    
    // NPS score if available
    if (data.npsScore !== undefined) {
      if (data.npsScore >= 9) {
        score += 20;
        factors.push('Promoter (NPS 9-10)');
      } else if (data.npsScore >= 7) {
        score += 5;
        factors.push('Passive (NPS 7-8)');
      } else {
        score -= 20;
        factors.push('Detractor (NPS 0-6)');
      }
    }
    
    return {
      name: 'Sentiment',
      score: Math.max(0, Math.min(100, score)),
      weight: this.weights.sentiment,
      factors,
    };
  }
  
  /**
   * Calculate support score
   */
  private calculateSupportScore(data: CustomerData): HealthSignal {
    let score = 80; // Start high - no support issues is good
    const factors: string[] = [];
    
    // Open tickets
    if (data.openTickets !== undefined) {
      if (data.openTickets >= 3) {
        score -= 30;
        factors.push(`${data.openTickets} open support tickets`);
      } else if (data.openTickets >= 1) {
        score -= 10;
        factors.push('Has open support tickets');
      } else {
        factors.push('No open tickets');
      }
    }
    
    // Recent ticket volume
    if (data.ticketsLast30d !== undefined) {
      if (data.ticketsLast30d >= 5) {
        score -= 20;
        factors.push('High support volume');
      } else if (data.ticketsLast30d >= 2) {
        score -= 5;
        factors.push('Moderate support usage');
      }
    }
    
    // Resolution time
    if (data.avgResolutionHours !== undefined) {
      if (data.avgResolutionHours > 48) {
        score -= 15;
        factors.push('Slow ticket resolution');
      } else if (data.avgResolutionHours <= 4) {
        score += 10;
        factors.push('Fast ticket resolution');
      }
    }
    
    return {
      name: 'Support',
      score: Math.max(0, Math.min(100, score)),
      weight: this.weights.support,
      factors,
    };
  }
  
  /**
   * Calculate product usage score
   */
  private calculateProductUsageScore(data: CustomerData): HealthSignal {
    let score = 50;
    const factors: string[] = [];
    
    // Feature adoption rate
    if (data.featureAdoptionRate !== undefined) {
      score = data.featureAdoptionRate;
      
      if (data.featureAdoptionRate >= 70) {
        factors.push('High feature adoption');
      } else if (data.featureAdoptionRate >= 40) {
        factors.push('Moderate feature adoption');
      } else {
        factors.push('Low feature adoption');
      }
    }
    
    // Key features used
    if (data.keyFeaturesUsed && data.keyFeaturesUsed.length > 0) {
      if (data.keyFeaturesUsed.length >= 5) {
        score += 15;
        factors.push('Using multiple key features');
      } else if (data.keyFeaturesUsed.length >= 2) {
        score += 5;
        factors.push('Using some key features');
      }
    }
    
    return {
      name: 'Product Usage',
      score: Math.max(0, Math.min(100, score)),
      weight: this.weights.productUsage,
      factors,
    };
  }
  
  /**
   * Calculate payment score
   */
  private calculatePaymentScore(data: CustomerData): HealthSignal {
    let score = 100; // Start at 100 - payment issues reduce
    const factors: string[] = [];
    
    // Payment failures
    if (data.paymentFailures90d !== undefined) {
      if (data.paymentFailures90d >= 3) {
        score -= 50;
        factors.push('Multiple payment failures');
      } else if (data.paymentFailures90d >= 1) {
        score -= 25;
        factors.push('Recent payment failure');
      } else {
        factors.push('No payment issues');
      }
    }
    
    // Subscription status
    if (data.subscriptionStatus) {
      switch (data.subscriptionStatus) {
        case 'active':
          factors.push('Active subscription');
          break;
        case 'past_due':
          score -= 40;
          factors.push('Past due subscription');
          break;
        case 'canceled':
          score -= 60;
          factors.push('Canceled subscription');
          break;
        case 'trialing':
          score -= 10;
          factors.push('In trial period');
          break;
      }
    }
    
    return {
      name: 'Payment',
      score: Math.max(0, Math.min(100, score)),
      weight: this.weights.payment,
      factors,
    };
  }
  
  /**
   * Convert score to letter grade
   */
  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  }
  
  /**
   * Convert score to churn risk level
   */
  private scoreToRisk(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 70) return 'low';
    if (score >= 50) return 'medium';
    if (score >= 30) return 'high';
    return 'critical';
  }
  
  /**
   * Calculate churn probability
   */
  private calculateChurnProbability(
    overallScore: number,
    signals: Record<string, HealthSignal>
  ): number {
    // Base probability from score
    let probability = (100 - overallScore) / 100;
    
    // Adjust based on critical factors
    if (signals.payment.score < 50) {
      probability += 0.15;
    }
    if (signals.engagement.score < 30) {
      probability += 0.10;
    }
    if (signals.sentiment.score < 30) {
      probability += 0.10;
    }
    
    return Math.min(0.99, Math.max(0.01, probability));
  }
  
  /**
   * Extract risk factors from signals
   */
  private extractRiskFactors(
    signals: Record<string, HealthSignal>
  ): Array<{ factor: string; severity: 'critical' | 'high' | 'medium' | 'low'; weight: number }> {
    const factors: Array<{ factor: string; severity: 'critical' | 'high' | 'medium' | 'low'; weight: number }> = [];
    
    for (const [, signal] of Object.entries(signals)) {
      if (signal.score < 50) {
        signal.factors.forEach(factor => {
          let severity: 'critical' | 'high' | 'medium' | 'low';
          if (signal.score < 20) severity = 'critical';
          else if (signal.score < 35) severity = 'high';
          else if (signal.score < 50) severity = 'medium';
          else severity = 'low';
          
          if (!factor.includes('No ') || signal.score < 40) {
            factors.push({
              factor,
              severity,
              weight: signal.weight,
            });
          }
        });
      }
    }
    
    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    factors.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    return factors.slice(0, 5);
  }
  
  /**
   * Extract positive signals
   */
  private extractPositiveSignals(
    signals: Record<string, HealthSignal>
  ): Array<{ signal: string; strength: 'strong' | 'medium' | 'weak' }> {
    const positive: Array<{ signal: string; strength: 'strong' | 'medium' | 'weak' }> = [];
    
    for (const [, signal] of Object.entries(signals)) {
      if (signal.score >= 60) {
        signal.factors.forEach(factor => {
          if (!factor.toLowerCase().includes('no ') && !factor.toLowerCase().includes('low')) {
            let strength: 'strong' | 'medium' | 'weak';
            if (signal.score >= 85) strength = 'strong';
            else if (signal.score >= 70) strength = 'medium';
            else strength = 'weak';
            
            positive.push({ signal: factor, strength });
          }
        });
      }
    }
    
    return positive.slice(0, 5);
  }
  
  /**
   * Generate health summary
   */
  private generateSummary(
    score: number,
    risk: string,
    riskFactors: Array<{ factor: string; severity: string }>,
    positiveSignals: Array<{ signal: string; strength: string }>
  ): string {
    if (risk === 'critical') {
      return `Critical churn risk with health score of ${score}. Immediate attention required. Top concerns: ${riskFactors.slice(0, 2).map(f => f.factor).join(', ')}.`;
    }
    if (risk === 'high') {
      return `High churn risk detected. Health score is ${score}. Key issues: ${riskFactors.slice(0, 2).map(f => f.factor).join(', ')}.`;
    }
    if (risk === 'medium') {
      return `Moderate health with score of ${score}. Some areas need attention but account is relatively stable.`;
    }
    return `Healthy account with score of ${score}. ${positiveSignals.length > 0 ? `Strengths: ${positiveSignals.slice(0, 2).map(s => s.signal).join(', ')}.` : ''}`;
  }
  
  /**
   * Generate recommended actions
   */
  private generateRecommendations(
    risk: string,
    riskFactors: Array<{ factor: string; severity: string }>,
    data: CustomerData
  ): string[] {
    const recommendations: string[] = [];
    
    // Check for specific issues
    for (const { factor } of riskFactors) {
      if (factor.includes('login') || factor.includes('activity')) {
        recommendations.push('Send re-engagement email with recent feature updates');
      }
      if (factor.includes('Negative feedback') || factor.includes('sentiment')) {
        recommendations.push('Schedule customer success call to address concerns');
      }
      if (factor.includes('support ticket') || factor.includes('Support')) {
        recommendations.push('Review open tickets and prioritize resolution');
      }
      if (factor.includes('payment') || factor.includes('Payment')) {
        recommendations.push('Contact customer about payment issues');
      }
      if (factor.includes('adoption')) {
        recommendations.push('Offer onboarding session for unused features');
      }
    }
    
    // Add risk-level recommendations
    if (risk === 'critical') {
      recommendations.unshift('Escalate to account manager immediately');
    } else if (risk === 'high') {
      recommendations.unshift('Schedule urgent check-in call');
    }
    
    // Contract renewal
    if (data.contractEndDate) {
      const daysUntilRenewal = Math.floor(
        (data.contractEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilRenewal <= 30 && daysUntilRenewal > 0) {
        recommendations.push(`Contract expires in ${daysUntilRenewal} days - initiate renewal discussion`);
      }
    }
    
    return [...new Set(recommendations)].slice(0, 5);
  }
}

// Export singleton
export const healthCalculator = new HealthCalculator();
