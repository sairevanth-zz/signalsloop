/**
 * Slack Block Kit Message Builder Tests
 *
 * Tests message formatting for different alert types
 */

import { describe, test, expect } from '@jest/globals';
import {
  buildCriticalFeedbackAlert,
  buildNewThemeAlert,
  buildSentimentDropAlert,
  buildCompetitiveThreatAlert,
  buildWeeklyDigest,
  buildSuccessMessage,
  buildErrorMessage,
  CriticalFeedbackData,
  NewThemeData,
  SentimentDropData,
  CompetitiveThreatData,
  WeeklyDigestData
} from '@/lib/slack/messages';

describe('Critical Feedback Alert Messages', () => {
  const mockFeedback: CriticalFeedbackData = {
    feedback_id: 'feedback_123',
    content: 'This is terrible, we are switching to a competitor',
    sentiment_score: -0.85,
    revenue_risk: 50000,
    platform: 'Intercom',
    user_name: 'John Doe',
    user_email: 'john@example.com',
    theme_name: 'Product Reliability',
    similar_count: 12,
    urgency_score: 5,
    trend_percentage: 35,
    detected_keywords: ['switching', 'terrible', 'competitor'],
    created_at: new Date().toISOString()
  };

  test('builds valid Block Kit structure', () => {
    const blocks = buildCriticalFeedbackAlert(mockFeedback, 'https://app.test.com');

    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThan(0);
  });

  test('includes header block', () => {
    const blocks = buildCriticalFeedbackAlert(mockFeedback, 'https://app.test.com');

    const headerBlock = blocks.find(b => b.type === 'header');
    expect(headerBlock).toBeDefined();
    expect(headerBlock?.text?.text).toContain('CRITICAL FEEDBACK');
  });

  test('includes sentiment score', () => {
    const blocks = buildCriticalFeedbackAlert(mockFeedback, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('-0.85');
    expect(blockJson).toContain('Sentiment');
  });

  test('includes revenue risk', () => {
    const blocks = buildCriticalFeedbackAlert(mockFeedback, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('50,000');
    expect(blockJson).toContain('Revenue');
  });

  test('includes feedback content', () => {
    const blocks = buildCriticalFeedbackAlert(mockFeedback, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('terrible');
    expect(blockJson).toContain('switching');
  });

  test('includes action buttons', () => {
    const blocks = buildCriticalFeedbackAlert(mockFeedback, 'https://app.test.com');

    const actionsBlock = blocks.find(b => b.type === 'actions');
    expect(actionsBlock).toBeDefined();
    expect(actionsBlock?.elements).toBeDefined();
    expect(actionsBlock?.elements?.length).toBeGreaterThan(0);
  });

  test('Create Jira Issue button has correct action_id', () => {
    const blocks = buildCriticalFeedbackAlert(mockFeedback, 'https://app.test.com');

    const actionsBlock = blocks.find(b => b.type === 'actions');
    const jiraButton = actionsBlock?.elements?.find(
      (e: any) => e.action_id === 'create_jira_issue'
    );

    expect(jiraButton).toBeDefined();
    expect(jiraButton?.value).toBe(mockFeedback.feedback_id);
  });

  test('truncates long feedback content', () => {
    const longFeedback = { ...mockFeedback, content: 'A'.repeat(1000) };
    const blocks = buildCriticalFeedbackAlert(longFeedback, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    // Should be truncated to 500 chars
    const contentMatches = blockJson.match(/A{500}\.\.\./);
    expect(contentMatches).toBeTruthy();
  });
});

describe('New Theme Alert Messages', () => {
  const mockTheme: NewThemeData = {
    theme_id: 'theme_123',
    theme_name: 'Dark Mode Support',
    description: 'Users requesting dark mode for better accessibility',
    mention_count: 25,
    avg_sentiment: 0.45,
    time_window: 'last 24h',
    sources: [
      { platform: 'Twitter', count: 12 },
      { platform: 'Product Hunt', count: 8 },
      { platform: 'Support', count: 5 }
    ],
    top_quotes: [
      'Would love dark mode!',
      'Dark mode is a must-have',
      'My eyes hurt without dark theme'
    ],
    trend: 'rising',
    competitor_comparison: '3 out of 5 competitors offer dark mode',
    first_detected_at: new Date().toISOString()
  };

  test('builds valid Block Kit structure', () => {
    const blocks = buildNewThemeAlert(mockTheme, 'https://app.test.com');

    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThan(0);
  });

  test('includes theme name in header', () => {
    const blocks = buildNewThemeAlert(mockTheme, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('NEW THEME DETECTED');
    expect(blockJson).toContain('Dark Mode Support');
  });

  test('includes mention count', () => {
    const blocks = buildNewThemeAlert(mockTheme, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('25');
    expect(blockJson).toContain('Mentions');
  });

  test('includes top user quotes', () => {
    const blocks = buildNewThemeAlert(mockTheme, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('Would love dark mode');
    expect(blockJson).toContain('must-have');
  });

  test('includes competitive comparison when provided', () => {
    const blocks = buildNewThemeAlert(mockTheme, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('3 out of 5 competitors');
  });

  test('includes Create Epic button', () => {
    const blocks = buildNewThemeAlert(mockTheme, 'https://app.test.com');

    const actionsBlock = blocks.find(b => b.type === 'actions');
    const epicButton = actionsBlock?.elements?.find(
      (e: any) => e.action_id === 'create_epic'
    );

    expect(epicButton).toBeDefined();
    expect(epicButton?.value).toBe(mockTheme.theme_id);
  });
});

describe('Sentiment Drop Alert Messages', () => {
  const mockSentimentDrop: SentimentDropData = {
    project_name: 'My SaaS Product',
    current_sentiment: 0.25,
    previous_sentiment: 0.65,
    drop_percentage: 61.5,
    time_period_days: 7,
    sample_size: 150,
    top_negative_feedback: [
      { content: 'Product is buggy', sentiment: -0.75, platform: 'Twitter' },
      { content: 'Support is slow', sentiment: -0.60, platform: 'Email' }
    ],
    affected_themes: ['Reliability', 'Customer Support', 'Performance']
  };

  test('builds valid Block Kit structure', () => {
    const blocks = buildSentimentDropAlert(mockSentimentDrop, 'https://app.test.com');

    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThan(0);
  });

  test('shows sentiment drop percentage', () => {
    const blocks = buildSentimentDropAlert(mockSentimentDrop, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('61.5');
    expect(blockJson).toContain('Drop');
  });

  test('includes affected themes', () => {
    const blocks = buildSentimentDropAlert(mockSentimentDrop, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('Reliability');
    expect(blockJson).toContain('Customer Support');
  });
});

describe('Competitive Threat Alert Messages', () => {
  const mockThreat: CompetitiveThreatData = {
    competitor_name: 'Competitor X',
    threat_level: 'high',
    mention_count: 35,
    sentiment_trend: 0.45,
    time_window_hours: 48,
    key_features_mentioned: ['Better pricing', 'Easier to use', 'More integrations'],
    user_quotes: [
      'Competitor X is so much easier',
      'Thinking of switching to Competitor X'
    ],
    switching_signals: 8,
    recommended_actions: [
      'Analyze pricing strategy',
      'Improve onboarding UX',
      'Expand integration marketplace'
    ]
  };

  test('builds valid Block Kit structure', () => {
    const blocks = buildCompetitiveThreatAlert(mockThreat, 'https://app.test.com');

    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThan(0);
  });

  test('shows threat level with emoji', () => {
    const blocks = buildCompetitiveThreatAlert(mockThreat, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('HIGH'); // Uppercase
    expect(blockJson).toContain('🔴');
  });

  test('includes key features mentioned', () => {
    const blocks = buildCompetitiveThreatAlert(mockThreat, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('Better pricing');
    expect(blockJson).toContain('Easier to use');
  });

  test('includes switching signals', () => {
    const blocks = buildCompetitiveThreatAlert(mockThreat, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('8');
    expect(blockJson).toContain('Switching');
  });
});

describe('Weekly Digest Messages', () => {
  const mockDigest: WeeklyDigestData = {
    project_name: 'My SaaS',
    week_start: '2025-11-11',
    week_end: '2025-11-17',
    total_feedback: 245,
    feedback_change_pct: 12.5,
    overall_sentiment: 0.62,
    sentiment_change: 0.05,
    top_themes: [
      { name: 'Performance', mention_count: 45, sentiment: -0.25, trend: '📈' },
      { name: 'UI/UX', mention_count: 38, sentiment: 0.35, trend: '📉' }
    ],
    competitive_updates: [
      { competitor: 'Competitor A', mentions: 15, change_pct: 25, highlights: 'New pricing announced' }
    ],
    critical_issues: [
      { title: 'Login errors', status: 'In Progress', impact: 'High - affecting 50 users' }
    ],
    wins: [
      { title: 'New feature launch', impact: 'Very positive feedback, 4.5/5 rating' }
    ],
    action_items: [
      { priority: 'high', task: 'Fix login errors', owner: 'Engineering' },
      { priority: 'medium', task: 'Improve performance', owner: 'Product' }
    ]
  };

  test('builds valid Block Kit structure', () => {
    const blocks = buildWeeklyDigest(mockDigest, 'https://app.test.com');

    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThan(0);
  });

  test('includes week date range', () => {
    const blocks = buildWeeklyDigest(mockDigest, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('11/11/2025'); // Date is formatted as MM/DD/YYYY
    expect(blockJson).toContain('11/17/2025');
  });

  test('includes feedback metrics', () => {
    const blocks = buildWeeklyDigest(mockDigest, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('245');
    expect(blockJson).toContain('13%'); // Rounded percentage with + sign
  });

  test('includes top themes', () => {
    const blocks = buildWeeklyDigest(mockDigest, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('Performance');
    expect(blockJson).toContain('UI/UX');
  });

  test('includes action items', () => {
    const blocks = buildWeeklyDigest(mockDigest, 'https://app.test.com');

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('Fix login errors');
    expect(blockJson).toContain('Improve performance');
  });
});

describe('Utility Message Builders', () => {
  test('buildSuccessMessage creates valid structure', () => {
    const blocks = buildSuccessMessage('Operation completed successfully');

    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBe(1);

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('✅');
    expect(blockJson).toContain('Operation completed');
  });

  test('buildErrorMessage creates valid structure', () => {
    const blocks = buildErrorMessage('Operation failed');

    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBe(1);

    const blockJson = JSON.stringify(blocks);
    expect(blockJson).toContain('❌');
    expect(blockJson).toContain('Operation failed');
  });
});
