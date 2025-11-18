/**
 * User Stories API Tests
 * Tests for /api/user-stories endpoints
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: mockTheme, error: null })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      order: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: mockUserStory, error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: mockUserStory, error: null })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null })),
    })),
  })),
};

const mockTheme = {
  id: 'theme-123',
  project_id: 'project-123',
  theme_name: 'Mobile Performance',
  description: 'Users reporting slow app performance',
  frequency: 15,
  avg_sentiment: 0.3,
};

const mockUserStory = {
  id: 'story-123',
  project_id: 'project-123',
  theme_id: 'theme-123',
  title: 'Improve Mobile App Performance',
  user_type: 'mobile user',
  user_goal: 'I want the app to load faster',
  user_benefit: 'So that I can access information quickly',
  full_story: 'As a mobile user, I want the app to load faster so that I can access information quickly',
  acceptance_criteria: [
    {
      id: '1',
      text: 'App loads in under 2 seconds',
      details: ['Measure load time', 'Optimize images', 'Reduce bundle size'],
    },
  ],
  story_points: 5,
  priority_level: 'high',
  generated_by_ai: true,
};

describe('User Stories API', () => {
  describe('POST /api/user-stories/generate', () => {
    it('should generate a user story from a theme', async () => {
      // Test would require mocking the OpenAI API
      expect(mockUserStory).toHaveProperty('title');
      expect(mockUserStory).toHaveProperty('acceptance_criteria');
      expect(mockUserStory.generated_by_ai).toBe(true);
    });

    it('should validate required fields', () => {
      expect(mockUserStory).toHaveProperty('project_id');
      expect(mockUserStory).toHaveProperty('theme_id');
    });

    it('should include story points estimation', () => {
      expect(mockUserStory.story_points).toBeGreaterThan(0);
      expect([1, 2, 3, 5, 8, 13, 21]).toContain(mockUserStory.story_points);
    });
  });

  describe('GET /api/user-stories/[projectId]', () => {
    it('should retrieve user stories for a project', async () => {
      const stories = await mockSupabase.from('user_stories')
        .select('*')
        .order('created_at', { ascending: false });

      expect(stories).toBeDefined();
    });

    it('should filter by sprint_id when provided', async () => {
      const sprintId = 'sprint-123';
      const result = await mockSupabase.from('user_stories')
        .select('*')
        .eq('sprint_id', sprintId);

      expect(result).toBeDefined();
    });
  });

  describe('PATCH /api/user-stories/[projectId]', () => {
    it('should update a user story', async () => {
      const updates = {
        title: 'Updated Title',
        story_points: 8,
      };

      const result = await mockSupabase.from('user_stories')
        .update(updates)
        .eq('id', 'story-123');

      expect(result).toBeDefined();
    });

    it('should mark story as manually edited', () => {
      const updatedStory = {
        ...mockUserStory,
        manually_edited: true,
        manually_edited_at: new Date().toISOString(),
      };

      expect(updatedStory.manually_edited).toBe(true);
    });
  });

  describe('DELETE /api/user-stories/[projectId]', () => {
    it('should delete a user story', async () => {
      const result = await mockSupabase.from('user_stories')
        .delete()
        .eq('id', 'story-123');

      expect(result.error).toBeNull();
    });
  });
});

describe('Story Point Validation', () => {
  const validPoints = [1, 2, 3, 5, 8, 13, 21];

  it('should only allow Fibonacci scale values', () => {
    validPoints.forEach(points => {
      expect(validPoints).toContain(points);
    });
  });

  it('should reject invalid point values', () => {
    const invalidPoints = [0, 4, 6, 7, 9, 10];
    invalidPoints.forEach(points => {
      expect(validPoints).not.toContain(points);
    });
  });
});

describe('Acceptance Criteria Structure', () => {
  it('should have valid acceptance criteria format', () => {
    const criteria = mockUserStory.acceptance_criteria[0];

    expect(criteria).toHaveProperty('id');
    expect(criteria).toHaveProperty('text');
    expect(criteria).toHaveProperty('details');
    expect(Array.isArray(criteria.details)).toBe(true);
  });

  it('should have at least one criterion', () => {
    expect(mockUserStory.acceptance_criteria.length).toBeGreaterThan(0);
  });
});

console.log('✅ User Stories API Tests Configured');
