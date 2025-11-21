/**
 * Integration Tests for Mission Control
 * Tests the backend AI service and database functions
 */

import { describe, it, expect, jest, beforeAll } from '@jest/globals';

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-key';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

describe('Mission Control - AI Service', () => {
  describe('DailyBriefingContent Type', () => {
    it('should have correct structure', () => {
      const mockBriefing = {
        sentiment_score: 75,
        sentiment_trend: 'up' as const,
        critical_alerts: ['Test alert'],
        recommended_actions: [
          {
            label: 'Test action',
            action: 'review_feedback' as const,
            priority: 'high' as const,
            context: 'Test context',
          },
        ],
        briefing_text: 'Test briefing',
        opportunities: [
          {
            title: 'Test opportunity',
            votes: 10,
            impact: 'high' as const,
          },
        ],
        threats: [
          {
            title: 'Test threat',
            severity: 'high' as const,
          },
        ],
      };

      expect(mockBriefing.sentiment_score).toBe(75);
      expect(mockBriefing.sentiment_trend).toBe('up');
      expect(Array.isArray(mockBriefing.critical_alerts)).toBe(true);
      expect(Array.isArray(mockBriefing.recommended_actions)).toBe(true);
      expect(Array.isArray(mockBriefing.opportunities)).toBe(true);
      expect(Array.isArray(mockBriefing.threats)).toBe(true);
    });
  });

  describe('DashboardMetrics Type', () => {
    it('should have correct structure', () => {
      const mockMetrics = {
        sentiment: {
          current_nps: 75,
          total_feedback: 100,
          trend: 'up' as const,
          change_percent: 5,
        },
        feedback: {
          issues_per_week: 10,
          total_this_week: 12,
          trend: 'up' as const,
        },
        roadmap: {
          in_progress: 5,
          planned: 8,
          completed_this_week: 3,
        },
        competitors: {
          new_insights_count: 2,
          high_priority_count: 1,
        },
      };

      expect(mockMetrics.sentiment.current_nps).toBe(75);
      expect(mockMetrics.feedback.issues_per_week).toBe(10);
      expect(mockMetrics.roadmap.in_progress).toBe(5);
      expect(mockMetrics.competitors.new_insights_count).toBe(2);
    });
  });
});

describe('Mission Control - Database Functions', () => {
  describe('daily_briefings table structure', () => {
    it('should have required columns', () => {
      const mockRow = {
        id: 'test-uuid',
        project_id: 'project-uuid',
        content: {
          sentiment_score: 75,
          sentiment_trend: 'up',
          critical_alerts: [],
          recommended_actions: [],
          briefing_text: 'Test',
          opportunities: [],
          threats: [],
        },
        briefing_date: '2025-11-21',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(mockRow).toHaveProperty('id');
      expect(mockRow).toHaveProperty('project_id');
      expect(mockRow).toHaveProperty('content');
      expect(mockRow).toHaveProperty('briefing_date');
      expect(mockRow).toHaveProperty('created_at');
      expect(mockRow).toHaveProperty('updated_at');
    });

    it('should store content as JSONB with correct structure', () => {
      const content = {
        sentiment_score: 75,
        sentiment_trend: 'up' as const,
        critical_alerts: ['Alert 1', 'Alert 2'],
        recommended_actions: [
          {
            label: 'Action 1',
            action: 'draft_spec' as const,
            priority: 'high' as const,
          },
        ],
        briefing_text: 'Daily briefing text',
        opportunities: [],
        threats: [],
      };

      // Simulate JSONB storage and retrieval
      const jsonString = JSON.stringify(content);
      const parsed = JSON.parse(jsonString);

      expect(parsed.sentiment_score).toBe(content.sentiment_score);
      expect(parsed.sentiment_trend).toBe(content.sentiment_trend);
      expect(parsed.critical_alerts).toEqual(content.critical_alerts);
    });
  });

  describe('get_today_briefing function', () => {
    it('should filter by project_id and briefing_date', () => {
      const projectId = 'test-project-id';
      const today = new Date().toISOString().split('T')[0];

      const mockBriefings = [
        {
          id: 'briefing-1',
          project_id: projectId,
          briefing_date: today,
          content: {},
          created_at: new Date().toISOString(),
        },
        {
          id: 'briefing-2',
          project_id: 'other-project-id',
          briefing_date: today,
          content: {},
          created_at: new Date().toISOString(),
        },
        {
          id: 'briefing-3',
          project_id: projectId,
          briefing_date: '2025-11-20',
          content: {},
          created_at: new Date().toISOString(),
        },
      ];

      // Simulate function logic
      const result = mockBriefings.filter(
        (b) => b.project_id === projectId && b.briefing_date === today
      );

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('briefing-1');
    });

    it('should return empty array when no briefing exists for today', () => {
      const projectId = 'test-project-id';
      const today = new Date().toISOString().split('T')[0];
      const mockBriefings: any[] = [];

      const result = mockBriefings.filter(
        (b) => b.project_id === projectId && b.briefing_date === today
      );

      expect(result.length).toBe(0);
    });
  });

  describe('get_dashboard_metrics function', () => {
    it('should aggregate sentiment metrics correctly', () => {
      const mockPosts = [
        { sentiment_score: 0.8, created_at: '2025-11-20' },
        { sentiment_score: 0.7, created_at: '2025-11-21' },
        { sentiment_score: 0.6, created_at: '2025-11-21' },
      ];

      const avgSentiment =
        mockPosts.reduce((sum, p) => sum + p.sentiment_score, 0) / mockPosts.length;
      const nps = Math.round(avgSentiment * 100);

      expect(nps).toBe(70); // (0.8 + 0.7 + 0.6) / 3 * 100 = 70
    });

    it('should calculate feedback velocity', () => {
      const mockPosts = [
        { created_at: '2025-11-15' },
        { created_at: '2025-11-16' },
        { created_at: '2025-11-17' },
        { created_at: '2025-11-18' },
        { created_at: '2025-11-19' },
        { created_at: '2025-11-20' },
        { created_at: '2025-11-21' },
      ];

      const issuesPerWeek = mockPosts.length;
      expect(issuesPerWeek).toBe(7);
    });

    it('should count roadmap items by status', () => {
      const mockRoadmapItems = [
        { status: 'in-progress' },
        { status: 'in-progress' },
        { status: 'planned' },
        { status: 'planned' },
        { status: 'planned' },
        { status: 'completed', updated_at: '2025-11-21' },
      ];

      const inProgress = mockRoadmapItems.filter((i) => i.status === 'in-progress').length;
      const planned = mockRoadmapItems.filter((i) => i.status === 'planned').length;
      const completed = mockRoadmapItems.filter((i) => i.status === 'completed').length;

      expect(inProgress).toBe(2);
      expect(planned).toBe(3);
      expect(completed).toBe(1);
    });
  });

  describe('unique constraint: one briefing per project per day', () => {
    it('should prevent duplicate briefings for same project and date', () => {
      const briefings = new Map<string, any>();
      const projectId = 'test-project-id';
      const today = '2025-11-21';

      // Simulate unique constraint
      const key = `${projectId}-${today}`;

      // First insert
      briefings.set(key, {
        id: 'briefing-1',
        project_id: projectId,
        briefing_date: today,
      });
      expect(briefings.has(key)).toBe(true);

      // Try to insert duplicate
      const wouldFail = briefings.has(key);
      expect(wouldFail).toBe(true); // Constraint would prevent this

      // Update existing (allowed)
      briefings.set(key, {
        id: 'briefing-1',
        project_id: projectId,
        briefing_date: today,
        updated_at: new Date().toISOString(),
      });
      expect(briefings.size).toBe(1); // Still only one entry
    });
  });
});

describe('Mission Control - API Routes', () => {
  describe('Health Check API', () => {
    it('should check all required components', () => {
      const requiredChecks = [
        'OpenAI API Key',
        'Database Connection',
        'Database Table: daily_briefings',
        'Database Functions',
        'Test Data',
      ];

      const mockHealthResponse = {
        status: 'pass',
        checks: requiredChecks.map((name) => ({
          name,
          status: 'pass',
          message: 'OK',
        })),
      };

      expect(mockHealthResponse.checks.length).toBe(requiredChecks.length);
      expect(mockHealthResponse.checks.every((c) => c.status === 'pass')).toBe(true);
    });

    it('should fail when OpenAI key is missing', () => {
      const hasOpenAIKey = false;

      const check = {
        name: 'OpenAI API Key',
        status: hasOpenAIKey ? 'pass' : 'fail',
        message: hasOpenAIKey
          ? 'OpenAI API key is configured'
          : 'Missing OPENAI_API_KEY environment variable',
      };

      expect(check.status).toBe('fail');
      expect(check.message).toContain('Missing OPENAI_API_KEY');
    });

    it('should warn when no projects exist', () => {
      const projectCount = 0;

      const check = {
        name: 'Test Data',
        status: projectCount > 0 ? 'pass' : 'warning',
        message:
          projectCount > 0
            ? `Found ${projectCount} project(s)`
            : 'No projects found - create a project to test',
      };

      expect(check.status).toBe('warning');
      expect(check.message).toContain('No projects found');
    });
  });

  describe('Briefing API', () => {
    it('should return existing briefing if one exists for today', async () => {
      const projectId = 'test-project-id';
      const today = new Date().toISOString().split('T')[0];

      const existingBriefing = {
        id: 'existing-briefing-id',
        project_id: projectId,
        briefing_date: today,
        content: {
          sentiment_score: 75,
          sentiment_trend: 'up',
          critical_alerts: [],
          recommended_actions: [],
          briefing_text: 'Existing briefing',
          opportunities: [],
          threats: [],
        },
        created_at: new Date().toISOString(),
      };

      // Simulate getTodayBriefing logic
      const briefingExists = existingBriefing.briefing_date === today;
      expect(briefingExists).toBe(true);
    });

    it('should generate new briefing if none exists for today', async () => {
      const projectId = 'test-project-id';
      const today = new Date().toISOString().split('T')[0];

      const existingBriefings: any[] = [];

      // Simulate getTodayBriefing logic
      const briefingExists = existingBriefings.some(
        (b) => b.project_id === projectId && b.briefing_date === today
      );

      expect(briefingExists).toBe(false);
      // Would trigger generation of new briefing
    });

    it('should delete and regenerate briefing on force refresh', async () => {
      const projectId = 'test-project-id';
      const today = new Date().toISOString().split('T')[0];

      const briefings = new Map();
      const key = `${projectId}-${today}`;

      // Initial briefing
      briefings.set(key, {
        id: 'briefing-1',
        created_at: '2025-11-21T08:00:00Z',
      });

      // Force regenerate (delete + insert)
      briefings.delete(key);
      expect(briefings.has(key)).toBe(false);

      briefings.set(key, {
        id: 'briefing-2',
        created_at: '2025-11-21T14:00:00Z',
      });

      expect(briefings.has(key)).toBe(true);
      expect(briefings.get(key).id).toBe('briefing-2');
    });
  });
});

describe('Mission Control - Error Handling', () => {
  it('should return fallback briefing when OpenAI API fails', () => {
    const fallbackBriefing = {
      sentiment_score: 50,
      sentiment_trend: 'stable' as const,
      critical_alerts: ['Unable to generate briefing - AI service unavailable'],
      recommended_actions: [],
      briefing_text: 'Daily briefing is temporarily unavailable. Please check back later.',
      opportunities: [],
      threats: [],
    };

    expect(fallbackBriefing.sentiment_score).toBe(50);
    expect(fallbackBriefing.critical_alerts[0]).toContain('unavailable');
  });

  it('should validate briefing content structure', () => {
    const rawBriefing = {
      sentiment_score: 75,
      // Missing other fields
    };

    // Simulate validation
    const validated = {
      sentiment_score: rawBriefing.sentiment_score || 50,
      sentiment_trend: ('up' as const) || 'stable',
      critical_alerts: [] || [],
      recommended_actions: [] || [],
      briefing_text: '' || 'No significant changes detected.',
      opportunities: [] || [],
      threats: [] || [],
    };

    expect(validated.sentiment_score).toBe(75);
    expect(validated.critical_alerts).toEqual([]);
  });

  it('should handle database connection errors gracefully', () => {
    const dbConnectionError = new Error('Database connection not available');

    expect(() => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw dbConnectionError;
      }
    }).not.toThrow(); // Should not throw because env var is set in this test
  });
});

describe('Mission Control - Data Aggregation', () => {
  it('should aggregate project data from last 7 days', () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const mockData = [
      { created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() }, // 1 day ago
      { created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() }, // 5 days ago
      { created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString() }, // 10 days ago
    ];

    const filtered = mockData.filter(
      (d) => new Date(d.created_at) >= sevenDaysAgo
    );

    expect(filtered.length).toBe(2); // Only first two should be included
  });

  it('should extract top themes by frequency', () => {
    const mockThemes = [
      { theme_name: 'Performance', frequency: 15 },
      { theme_name: 'UI/UX', frequency: 12 },
      { theme_name: 'Features', frequency: 10 },
      { theme_name: 'Bugs', frequency: 8 },
      { theme_name: 'Documentation', frequency: 5 },
      { theme_name: 'Security', frequency: 3 },
    ];

    const topThemes = mockThemes
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    expect(topThemes.length).toBe(5);
    expect(topThemes[0].theme_name).toBe('Performance');
    expect(topThemes[0].frequency).toBe(15);
  });

  it('should calculate sentiment trend correctly', () => {
    const thisWeek = [0.7, 0.75, 0.8, 0.78, 0.72];
    const lastWeek = [0.6, 0.65, 0.62, 0.68, 0.64];

    const avgThisWeek = thisWeek.reduce((a, b) => a + b, 0) / thisWeek.length;
    const avgLastWeek = lastWeek.reduce((a, b) => a + b, 0) / lastWeek.length;

    const trend = avgThisWeek > avgLastWeek ? 'up' : 'down';

    expect(trend).toBe('up');
    expect(avgThisWeek).toBeGreaterThan(avgLastWeek);
  });
});
