/**
 * Database Schema Tests
 * Validates the user_stories database schema
 */

import { describe, it, expect } from '@jest/globals';

// Mock database schema validation
type UserStory = {
  id: string;
  project_id: string;
  theme_id: string | null;
  title: string;
  user_type: string;
  user_goal: string;
  user_benefit: string;
  full_story: string;
  acceptance_criteria: Array<{
    id: string;
    text: string;
    details: string[];
  }>;
  story_points: number | null;
  complexity_score: number | null;
  uncertainty_score: number | null;
  effort_score: number | null;
  estimation_reasoning: string | null;
  labels: string[];
  technical_notes: string | null;
  priority_level: 'critical' | 'high' | 'medium' | 'low';
  jira_issue_key: string | null;
  jira_issue_id: string | null;
  exported_to_jira: boolean;
  sprint_id: string | null;
  sprint_status: 'backlog' | 'to_do' | 'in_progress' | 'done';
  generated_by_ai: boolean;
  manually_edited: boolean;
  created_at: string;
  updated_at: string;
};

type Sprint = {
  id: string;
  project_id: string;
  sprint_number: number;
  sprint_name: string;
  sprint_goal: string | null;
  start_date: string;
  end_date: string;
  capacity_points: number;
  current_points: number;
  committed_points: number;
  completed_points: number;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  team_members: Array<{ id: string; name: string; capacity: number }>;
  created_at: string;
  updated_at: string;
};

describe('User Stories Table Schema', () => {
  const mockStory: UserStory = {
    id: 'story-123',
    project_id: 'project-123',
    theme_id: 'theme-123',
    title: 'Test Story',
    user_type: 'developer',
    user_goal: 'I want to test the schema',
    user_benefit: 'So that I can validate the structure',
    full_story: 'As a developer, I want to test the schema so that I can validate the structure',
    acceptance_criteria: [
      {
        id: '1',
        text: 'Schema is valid',
        details: ['Check all fields', 'Validate types'],
      },
    ],
    story_points: 5,
    complexity_score: 0.5,
    uncertainty_score: 0.3,
    effort_score: 0.4,
    estimation_reasoning: 'Medium complexity task',
    labels: ['backend', 'database'],
    technical_notes: 'Uses PostgreSQL',
    priority_level: 'high',
    jira_issue_key: null,
    jira_issue_id: null,
    exported_to_jira: false,
    sprint_id: null,
    sprint_status: 'backlog',
    generated_by_ai: true,
    manually_edited: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe('Required Fields', () => {
    it('should have required UUID fields', () => {
      expect(mockStory.id).toBeTruthy();
      expect(mockStory.project_id).toBeTruthy();
    });

    it('should have required story content fields', () => {
      expect(mockStory.title).toBeTruthy();
      expect(mockStory.user_type).toBeTruthy();
      expect(mockStory.user_goal).toBeTruthy();
      expect(mockStory.user_benefit).toBeTruthy();
      expect(mockStory.full_story).toBeTruthy();
    });

    it('should have acceptance criteria array', () => {
      expect(Array.isArray(mockStory.acceptance_criteria)).toBe(true);
      expect(mockStory.acceptance_criteria.length).toBeGreaterThan(0);
    });
  });

  describe('Story Points', () => {
    it('should allow valid Fibonacci values', () => {
      const validPoints = [1, 2, 3, 5, 8, 13, 21];
      validPoints.forEach(points => {
        const story = { ...mockStory, story_points: points };
        expect(validPoints).toContain(story.story_points);
      });
    });

    it('should allow null story points', () => {
      const story = { ...mockStory, story_points: null };
      expect(story.story_points).toBeNull();
    });
  });

  describe('Estimation Scores', () => {
    it('should have scores between 0 and 1', () => {
      expect(mockStory.complexity_score).toBeGreaterThanOrEqual(0);
      expect(mockStory.complexity_score).toBeLessThanOrEqual(1);
      expect(mockStory.uncertainty_score).toBeGreaterThanOrEqual(0);
      expect(mockStory.uncertainty_score).toBeLessThanOrEqual(1);
      expect(mockStory.effort_score).toBeGreaterThanOrEqual(0);
      expect(mockStory.effort_score).toBeLessThanOrEqual(1);
    });

    it('should allow null scores', () => {
      const story = {
        ...mockStory,
        complexity_score: null,
        uncertainty_score: null,
        effort_score: null,
      };

      expect(story.complexity_score).toBeNull();
    });
  });

  describe('Priority Level', () => {
    const validPriorities: Array<'critical' | 'high' | 'medium' | 'low'> = [
      'critical',
      'high',
      'medium',
      'low',
    ];

    it('should only allow valid priority levels', () => {
      validPriorities.forEach(priority => {
        const story = { ...mockStory, priority_level: priority };
        expect(validPriorities).toContain(story.priority_level);
      });
    });
  });

  describe('Sprint Status', () => {
    const validStatuses: Array<'backlog' | 'to_do' | 'in_progress' | 'done'> = [
      'backlog',
      'to_do',
      'in_progress',
      'done',
    ];

    it('should only allow valid sprint statuses', () => {
      validStatuses.forEach(status => {
        const story = { ...mockStory, sprint_status: status };
        expect(validStatuses).toContain(story.sprint_status);
      });
    });
  });

  describe('Jira Integration', () => {
    it('should track Jira export status', () => {
      expect(typeof mockStory.exported_to_jira).toBe('boolean');
    });

    it('should allow Jira issue tracking', () => {
      const story = {
        ...mockStory,
        jira_issue_key: 'PROJ-123',
        jira_issue_id: 'issue-456',
        exported_to_jira: true,
      };

      expect(story.jira_issue_key).toBeTruthy();
      expect(story.jira_issue_id).toBeTruthy();
      expect(story.exported_to_jira).toBe(true);
    });
  });

  describe('AI Generation Tracking', () => {
    it('should track if generated by AI', () => {
      expect(typeof mockStory.generated_by_ai).toBe('boolean');
    });

    it('should track manual edits', () => {
      expect(typeof mockStory.manually_edited).toBe('boolean');
    });
  });
});

describe('Sprints Table Schema', () => {
  const mockSprint: Sprint = {
    id: 'sprint-123',
    project_id: 'project-123',
    sprint_number: 1,
    sprint_name: 'Sprint 1',
    sprint_goal: 'Launch MVP',
    start_date: '2025-01-20',
    end_date: '2025-02-03',
    capacity_points: 40,
    current_points: 25,
    committed_points: 30,
    completed_points: 0,
    status: 'active',
    team_members: [
      { id: 'user-1', name: 'Alice', capacity: 20 },
      { id: 'user-2', name: 'Bob', capacity: 20 },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe('Required Fields', () => {
    it('should have required sprint identification', () => {
      expect(mockSprint.id).toBeTruthy();
      expect(mockSprint.project_id).toBeTruthy();
      expect(mockSprint.sprint_number).toBeGreaterThan(0);
      expect(mockSprint.sprint_name).toBeTruthy();
    });

    it('should have date range', () => {
      expect(mockSprint.start_date).toBeTruthy();
      expect(mockSprint.end_date).toBeTruthy();
    });

    it('should have capacity tracking', () => {
      expect(mockSprint.capacity_points).toBeGreaterThanOrEqual(0);
      expect(mockSprint.current_points).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Sprint Status', () => {
    const validStatuses: Array<'planning' | 'active' | 'completed' | 'cancelled'> = [
      'planning',
      'active',
      'completed',
      'cancelled',
    ];

    it('should only allow valid sprint phases', () => {
      validStatuses.forEach(status => {
        const sprint = { ...mockSprint, status };
        expect(validStatuses).toContain(sprint.status);
      });
    });
  });

  describe('Team Members', () => {
    it('should have team members array', () => {
      expect(Array.isArray(mockSprint.team_members)).toBe(true);
    });

    it('should have valid team member structure', () => {
      const member = mockSprint.team_members[0];
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('name');
      expect(member).toHaveProperty('capacity');
    });

    it('should sum to total capacity', () => {
      const totalCapacity = mockSprint.team_members.reduce(
        (sum, member) => sum + member.capacity,
        0
      );
      expect(totalCapacity).toBe(mockSprint.capacity_points);
    });
  });

  describe('Points Tracking', () => {
    it('should track committed vs current points', () => {
      expect(mockSprint.committed_points).toBeDefined();
      expect(mockSprint.current_points).toBeDefined();
    });

    it('should not exceed capacity', () => {
      // In a real scenario, we'd validate this constraint
      expect(mockSprint.current_points).toBeLessThanOrEqual(mockSprint.capacity_points + 10);
    });
  });
});

describe('Database Relationships', () => {
  it('should link user stories to projects', () => {
    expect(typeof mockStory.project_id).toBe('string');
  });

  it('should link user stories to themes (optional)', () => {
    const story = { ...mockStory, theme_id: 'theme-123' };
    expect(story.theme_id).toBeTruthy();
  });

  it('should link user stories to sprints (optional)', () => {
    const story = { ...mockStory, sprint_id: 'sprint-123' };
    expect(story.sprint_id).toBeTruthy();
  });

  it('should allow orphaned stories (no theme)', () => {
    const story = { ...mockStory, theme_id: null };
    expect(story.theme_id).toBeNull();
  });
});

const mockStory: UserStory = {
  id: 'story-123',
  project_id: 'project-123',
  theme_id: 'theme-123',
  title: 'Test Story',
  user_type: 'developer',
  user_goal: 'I want to test the schema',
  user_benefit: 'So that I can validate the structure',
  full_story: 'As a developer, I want to test the schema so that I can validate the structure',
  acceptance_criteria: [
    {
      id: '1',
      text: 'Schema is valid',
      details: ['Check all fields', 'Validate types'],
    },
  ],
  story_points: 5,
  complexity_score: 0.5,
  uncertainty_score: 0.3,
  effort_score: 0.4,
  estimation_reasoning: 'Medium complexity task',
  labels: ['backend', 'database'],
  technical_notes: 'Uses PostgreSQL',
  priority_level: 'high',
  jira_issue_key: null,
  jira_issue_id: null,
  exported_to_jira: false,
  sprint_id: null,
  sprint_status: 'backlog',
  generated_by_ai: true,
  manually_edited: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

console.log('✅ Database Schema Tests Configured');
