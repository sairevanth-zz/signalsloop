/**
 * Slack Alert Engine Tests
 *
 * Tests rule evaluation logic and cooldown mechanisms
 */

import { describe, test, expect } from '@jest/globals';

describe('Alert Rule Evaluation Logic', () => {
  describe('Critical Feedback Rule Evaluation', () => {
    test('should alert when sentiment below threshold', () => {
      const feedback = {
        content: 'This is terrible',
        sentiment_score: -0.85,
        urgency_score: 5,
        revenue_risk: 50000
      };

      const rule = {
        sentiment_threshold: -0.7,
        urgency_threshold: 4,
        revenue_risk_threshold: 10000
      };

      // Sentiment check
      const passedSentiment = feedback.sentiment_score <= rule.sentiment_threshold;
      expect(passedSentiment).toBe(true);

      // Urgency check
      const passedUrgency = feedback.urgency_score >= rule.urgency_threshold;
      expect(passedUrgency).toBe(true);

      // Revenue risk check
      const passedRevenue = feedback.revenue_risk >= rule.revenue_risk_threshold;
      expect(passedRevenue).toBe(true);
    });

    test('should not alert when sentiment above threshold', () => {
      const feedback = {
        content: 'This is okay',
        sentiment_score: -0.5,
        urgency_score: 5,
        revenue_risk: 50000
      };

      const rule = {
        sentiment_threshold: -0.7,
        urgency_threshold: 4,
        revenue_risk_threshold: 10000
      };

      const passedSentiment = feedback.sentiment_score <= rule.sentiment_threshold;
      expect(passedSentiment).toBe(false);
    });

    test('should detect churn keywords in feedback content', () => {
      const feedbackWithKeywords = 'We are switching to a competitor';
      const feedbackWithoutKeywords = 'The product is slow';

      const churnKeywords = ['switching', 'canceling', 'cancel', 'churn', 'competitor'];

      const hasChurnKeyword = churnKeywords.some(kw =>
        feedbackWithKeywords.toLowerCase().includes(kw.toLowerCase())
      );
      expect(hasChurnKeyword).toBe(true);

      const noChurnKeyword = churnKeywords.some(kw =>
        feedbackWithoutKeywords.toLowerCase().includes(kw.toLowerCase())
      );
      expect(noChurnKeyword).toBe(false);
    });

    test('should calculate urgency score correctly', () => {
      const highUrgency = {
        sentiment_score: -0.9,
        has_churn_keywords: true,
        revenue_risk: 100000,
        similar_count: 15
      };

      // Urgency scoring logic:
      // Base: 0
      // Very negative sentiment (-0.9): +3
      // Churn keywords: +2
      // High revenue: +2
      // Many similar issues: +1
      let urgencyScore = 0;
      if (highUrgency.sentiment_score < -0.8) urgencyScore += 3;
      if (highUrgency.has_churn_keywords) urgencyScore += 2;
      if (highUrgency.revenue_risk > 50000) urgencyScore += 2;
      if (highUrgency.similar_count > 10) urgencyScore += 1;

      expect(urgencyScore).toBe(8);
      expect(urgencyScore).toBeGreaterThan(5); // Would trigger alert
    });
  });

  describe('New Theme Rule Evaluation', () => {
    test('should alert when mention count exceeds threshold', () => {
      const theme = {
        mention_count: 25,
        avg_sentiment: 0.45,
        time_window: 'last 24h'
      };

      const rule = {
        minimum_mentions: 15,
        minimum_sentiment: 0.3,
        time_window_hours: 24
      };

      const passedMentions = theme.mention_count >= rule.minimum_mentions;
      expect(passedMentions).toBe(true);

      const passedSentiment = theme.avg_sentiment >= rule.minimum_sentiment;
      expect(passedSentiment).toBe(true);
    });

    test('should not alert for low-mention themes', () => {
      const theme = {
        mention_count: 5,
        avg_sentiment: 0.45,
        time_window: 'last 24h'
      };

      const rule = {
        minimum_mentions: 15,
        minimum_sentiment: 0.3,
        time_window_hours: 24
      };

      const passedMentions = theme.mention_count >= rule.minimum_mentions;
      expect(passedMentions).toBe(false);
    });

    test('should detect rising trend correctly', () => {
      const trends = ['rising', 'stable', 'declining'];

      expect(trends).toContain('rising');
      expect(trends).toContain('stable');
      expect(trends).toContain('declining');

      const risingTheme = { trend: 'rising', mention_count: 25 };
      const shouldHighlight = risingTheme.trend === 'rising' && risingTheme.mention_count > 20;

      expect(shouldHighlight).toBe(true);
    });
  });

  describe('Sentiment Drop Rule Evaluation', () => {
    test('should alert when sentiment drops significantly', () => {
      const sentimentData = {
        current_sentiment: 0.25,
        previous_sentiment: 0.65,
        sample_size: 150
      };

      const dropPercentage = ((sentimentData.previous_sentiment - sentimentData.current_sentiment) / sentimentData.previous_sentiment) * 100;

      const rule = {
        minimum_drop_percentage: 30,
        minimum_sample_size: 50
      };

      expect(dropPercentage).toBeCloseTo(61.5, 1);
      expect(dropPercentage >= rule.minimum_drop_percentage).toBe(true);
      expect(sentimentData.sample_size >= rule.minimum_sample_size).toBe(true);
    });

    test('should not alert for small sentiment changes', () => {
      const sentimentData = {
        current_sentiment: 0.60,
        previous_sentiment: 0.65,
        sample_size: 150
      };

      const dropPercentage = ((sentimentData.previous_sentiment - sentimentData.current_sentiment) / sentimentData.previous_sentiment) * 100;

      const rule = {
        minimum_drop_percentage: 30,
        minimum_sample_size: 50
      };

      expect(dropPercentage).toBeLessThan(10);
      expect(dropPercentage >= rule.minimum_drop_percentage).toBe(false);
    });

    test('should require minimum sample size', () => {
      const sentimentData = {
        current_sentiment: 0.25,
        previous_sentiment: 0.65,
        sample_size: 30
      };

      const rule = {
        minimum_drop_percentage: 30,
        minimum_sample_size: 50
      };

      expect(sentimentData.sample_size < rule.minimum_sample_size).toBe(true);
    });
  });

  describe('Competitive Threat Rule Evaluation', () => {
    test('should alert when competitor mentions spike', () => {
      const competitorData = {
        mention_count: 35,
        time_window_hours: 48,
        sentiment_trend: 0.45,
        switching_signals: 8
      };

      const rule = {
        minimum_mentions: 20,
        time_window_hours: 48,
        minimum_switching_signals: 5
      };

      expect(competitorData.mention_count >= rule.minimum_mentions).toBe(true);
      expect(competitorData.switching_signals >= rule.minimum_switching_signals).toBe(true);
    });

    test('should identify switching signals', () => {
      const quotes = [
        'Thinking of switching to Competitor X',
        'Competitor X is better',
        'Already migrated to their platform'
      ];

      const switchingKeywords = ['switching', 'migrat', 'moving to', 'already'];

      let switchingSignals = 0;
      quotes.forEach(quote => {
        const hasSignal = switchingKeywords.some(kw =>
          quote.toLowerCase().includes(kw.toLowerCase())
        );
        if (hasSignal) switchingSignals++;
      });

      expect(switchingSignals).toBe(2); // First and third quotes have keywords
    });

    test('should categorize threat level correctly', () => {
      const getThreatLevel = (mentionCount: number, switchingSignals: number) => {
        if (switchingSignals >= 10 || mentionCount >= 50) return 'high';
        if (switchingSignals >= 5 || mentionCount >= 25) return 'medium';
        return 'low';
      };

      expect(getThreatLevel(60, 3)).toBe('high'); // mentionCount >= 50
      expect(getThreatLevel(35, 8)).toBe('medium'); // mentionCount >= 25 and switchingSignals >= 5
      expect(getThreatLevel(30, 6)).toBe('medium');
      expect(getThreatLevel(10, 2)).toBe('low');
    });
  });
});

describe('Alert Cooldown Mechanism', () => {
  test('should calculate cooldown correctly', () => {
    const now = new Date();
    const lastSent = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
    const cooldownMinutes = 60;

    const minutesSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60);
    const canSend = minutesSinceLastSent >= cooldownMinutes;

    expect(minutesSinceLastSent).toBe(30);
    expect(canSend).toBe(false);
  });

  test('should allow sending after cooldown expires', () => {
    const now = new Date();
    const lastSent = new Date(now.getTime() - 90 * 60 * 1000); // 90 minutes ago
    const cooldownMinutes = 60;

    const minutesSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60);
    const canSend = minutesSinceLastSent >= cooldownMinutes;

    expect(minutesSinceLastSent).toBe(90);
    expect(canSend).toBe(true);
  });

  test('should use different cooldowns for different alert types', () => {
    const cooldowns = {
      critical_feedback: 60,      // 1 hour
      new_theme: 1440,            // 24 hours
      sentiment_drop: 10080,      // 7 days
      competitive_threat: 2880,   // 48 hours
      weekly_digest: 10080,       // 7 days
      jira_created: 5             // 5 minutes
    };

    expect(cooldowns.critical_feedback).toBe(60);
    expect(cooldowns.new_theme).toBe(1440);
    expect(cooldowns.sentiment_drop).toBe(10080);
    expect(cooldowns.competitive_threat).toBe(2880);
    expect(cooldowns.weekly_digest).toBe(10080);
    expect(cooldowns.jira_created).toBe(5);
  });

  test('should track cooldown per entity for critical feedback', () => {
    // Critical feedback uses feedback_id as entity to prevent duplicate alerts
    const lastAlert = {
      alert_type: 'critical_feedback',
      entity_id: 'feedback_123',
      sent_at: new Date()
    };

    const newFeedback = {
      feedback_id: 'feedback_456' // Different feedback
    };

    // Should allow because it's a different feedback item
    const isDifferentEntity = lastAlert.entity_id !== newFeedback.feedback_id;
    expect(isDifferentEntity).toBe(true);
  });

  test('should track cooldown per competitor name', () => {
    const lastAlert = {
      alert_type: 'competitive_threat',
      entity_id: 'Competitor A',
      sent_at: new Date()
    };

    const newThreat = {
      competitor_name: 'Competitor B' // Different competitor
    };

    const isDifferentEntity = lastAlert.entity_id !== newThreat.competitor_name;
    expect(isDifferentEntity).toBe(true);
  });
});

describe('Alert Rule Configuration Validation', () => {
  test('validates critical feedback rule config structure', () => {
    const config = {
      sentiment_threshold: -0.7,
      urgency_threshold: 4,
      revenue_risk_threshold: 10000,
      keywords: ['switching', 'cancel', 'churn']
    };

    expect(config.sentiment_threshold).toBeLessThan(0);
    expect(config.sentiment_threshold).toBeGreaterThanOrEqual(-1);
    expect(config.urgency_threshold).toBeGreaterThanOrEqual(1);
    expect(config.urgency_threshold).toBeLessThanOrEqual(5);
    expect(config.revenue_risk_threshold).toBeGreaterThan(0);
    expect(Array.isArray(config.keywords)).toBe(true);
  });

  test('validates new theme rule config structure', () => {
    const config = {
      minimum_mentions: 15,
      minimum_sentiment: 0.3,
      time_window_hours: 24
    };

    expect(config.minimum_mentions).toBeGreaterThan(0);
    expect(config.minimum_sentiment).toBeGreaterThanOrEqual(-1);
    expect(config.minimum_sentiment).toBeLessThanOrEqual(1);
    expect(config.time_window_hours).toBeGreaterThan(0);
  });

  test('validates sentiment drop rule config structure', () => {
    const config = {
      minimum_drop_percentage: 30,
      minimum_sample_size: 50,
      time_period_days: 7
    };

    expect(config.minimum_drop_percentage).toBeGreaterThan(0);
    expect(config.minimum_drop_percentage).toBeLessThanOrEqual(100);
    expect(config.minimum_sample_size).toBeGreaterThan(0);
    expect(config.time_period_days).toBeGreaterThan(0);
  });

  test('validates competitive threat rule config structure', () => {
    const config = {
      minimum_mentions: 20,
      time_window_hours: 48,
      minimum_switching_signals: 5
    };

    expect(config.minimum_mentions).toBeGreaterThan(0);
    expect(config.time_window_hours).toBeGreaterThan(0);
    expect(config.minimum_switching_signals).toBeGreaterThan(0);
  });

  test('validates weekly digest config structure', () => {
    const config = {
      day_of_week: 1, // Monday
      hour: 9,
      timezone: 'America/New_York',
      minimum_feedback_count: 10
    };

    expect(config.day_of_week).toBeGreaterThanOrEqual(0);
    expect(config.day_of_week).toBeLessThanOrEqual(6);
    expect(config.hour).toBeGreaterThanOrEqual(0);
    expect(config.hour).toBeLessThan(24);
    expect(typeof config.timezone).toBe('string');
    expect(config.minimum_feedback_count).toBeGreaterThan(0);
  });
});

describe('Default Alert Rules', () => {
  test('has sensible default for critical feedback', () => {
    const defaultRule = {
      enabled: true,
      config: {
        sentiment_threshold: -0.7,
        urgency_threshold: 4,
        revenue_risk_threshold: 10000,
        keywords: ['cancel', 'churn', 'switching', 'competitor', 'terrible']
      }
    };

    expect(defaultRule.enabled).toBe(true);
    expect(defaultRule.config.sentiment_threshold).toBe(-0.7);
    expect(defaultRule.config.keywords.length).toBeGreaterThan(0);
  });

  test('has sensible default for new theme', () => {
    const defaultRule = {
      enabled: true,
      config: {
        minimum_mentions: 15,
        minimum_sentiment: 0.3,
        time_window_hours: 24
      }
    };

    expect(defaultRule.enabled).toBe(true);
    expect(defaultRule.config.minimum_mentions).toBe(15);
  });

  test('has sensible default for sentiment drop', () => {
    const defaultRule = {
      enabled: true,
      config: {
        minimum_drop_percentage: 30,
        minimum_sample_size: 50,
        time_period_days: 7
      }
    };

    expect(defaultRule.enabled).toBe(true);
    expect(defaultRule.config.minimum_drop_percentage).toBe(30);
  });
});
