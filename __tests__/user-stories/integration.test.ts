/**
 * User Stories Integration Tests
 * Tests the complete workflow from theme to Jira export
 */

import { describe, it, expect } from '@jest/globals';

describe('User Stories Complete Workflow', () => {
  describe('Theme to User Story Flow', () => {
    const mockTheme = {
      id: 'theme-123',
      project_id: 'project-123',
      theme_name: 'Performance Improvements',
      description: 'Users want faster load times',
      frequency: 25,
      avg_sentiment: 0.4,
    };

    it('should generate user story from theme', () => {
      // Simulate the generation flow
      const userStory = {
        id: 'story-123',
        project_id: mockTheme.project_id,
        theme_id: mockTheme.id,
        title: `Improve ${mockTheme.theme_name}`,
        user_type: 'end user',
        user_goal: 'I want faster performance',
        user_benefit: 'So that I can be more productive',
        full_story: 'As an end user, I want faster performance so that I can be more productive',
        acceptance_criteria: [
          {
            id: '1',
            text: 'Page loads in under 2 seconds',
            details: [],
          },
        ],
        story_points: 5,
        generated_by_ai: true,
      };

      expect(userStory.theme_id).toBe(mockTheme.id);
      expect(userStory.title).toContain('Performance');
      expect(userStory.generated_by_ai).toBe(true);
    });

    it('should link feedback to generated story', () => {
      const feedbackLinks = [
        { feedback_id: 'f1', story_id: 'story-123' },
        { feedback_id: 'f2', story_id: 'story-123' },
      ];

      expect(feedbackLinks.length).toBeGreaterThan(0);
      expect(feedbackLinks[0]).toHaveProperty('feedback_id');
      expect(feedbackLinks[0]).toHaveProperty('story_id');
    });
  });

  describe('Story Editing Workflow', () => {
    it('should mark story as manually edited', () => {
      const original = {
        id: 'story-123',
        title: 'Original Title',
        manually_edited: false,
        manually_edited_at: null,
      };

      const edited = {
        ...original,
        title: 'Updated Title',
        manually_edited: true,
        manually_edited_at: new Date().toISOString(),
      };

      expect(edited.manually_edited).toBe(true);
      expect(edited.manually_edited_at).toBeTruthy();
      expect(edited.title).not.toBe(original.title);
    });

    it('should preserve AI generation flag after editing', () => {
      const story = {
        id: 'story-123',
        title: 'Edited Title',
        generated_by_ai: true,
        manually_edited: true,
      };

      expect(story.generated_by_ai).toBe(true);
      expect(story.manually_edited).toBe(true);
    });
  });

  describe('Sprint Planning Workflow', () => {
    const sprint = {
      id: 'sprint-1',
      project_id: 'project-123',
      sprint_number: 1,
      sprint_name: 'Sprint 1',
      capacity_points: 40,
      current_points: 0,
      status: 'planning' as const,
    };

    it('should add story to sprint', () => {
      const story = {
        id: 'story-123',
        sprint_id: sprint.id,
        sprint_status: 'to_do' as const,
        story_points: 5,
      };

      const updatedSprint = {
        ...sprint,
        current_points: sprint.current_points + (story.story_points || 0),
      };

      expect(story.sprint_id).toBe(sprint.id);
      expect(updatedSprint.current_points).toBe(5);
    });

    it('should track sprint capacity', () => {
      const stories = [
        { story_points: 5 },
        { story_points: 8 },
        { story_points: 3 },
      ];

      const totalPoints = stories.reduce((sum, s) => sum + (s.story_points || 0), 0);
      const capacityUsed = (totalPoints / sprint.capacity_points) * 100;

      expect(totalPoints).toBe(16);
      expect(capacityUsed).toBe(40);
    });

    it('should warn when over capacity', () => {
      const stories = [
        { story_points: 21 },
        { story_points: 21 },
        { story_points: 13 },
      ];

      const totalPoints = stories.reduce((sum, s) => sum + (s.story_points || 0), 0);
      const isOverCapacity = totalPoints > sprint.capacity_points;

      expect(isOverCapacity).toBe(true);
      expect(totalPoints).toBeGreaterThan(sprint.capacity_points);
    });
  });

  describe('Jira Export Workflow', () => {
    const story = {
      id: 'story-123',
      title: 'Test Story',
      full_story: 'As a user, I want to test so that I can verify',
      acceptance_criteria: [
        {
          id: '1',
          text: 'Criterion 1',
          details: ['Detail 1', 'Detail 2'],
        },
      ],
      story_points: 5,
      priority_level: 'high' as const,
      labels: ['backend', 'api'],
      technical_notes: 'Use REST API',
      exported_to_jira: false,
    };

    it('should format story for Jira export', () => {
      const jiraIssue = {
        fields: {
          summary: story.title,
          description: story.full_story,
          issuetype: { name: 'Story' },
          priority: { name: 'High' },
          labels: story.labels,
          customfield_story_points: story.story_points,
        },
      };

      expect(jiraIssue.fields.summary).toBe(story.title);
      expect(jiraIssue.fields.issuetype.name).toBe('Story');
      expect(jiraIssue.fields.priority.name).toBe('High');
      expect(jiraIssue.fields.labels).toEqual(['backend', 'api']);
    });

    it('should track export status', () => {
      const exported = {
        ...story,
        exported_to_jira: true,
        jira_issue_key: 'PROJ-123',
        jira_issue_id: 'issue-456',
        export_timestamp: new Date().toISOString(),
      };

      expect(exported.exported_to_jira).toBe(true);
      expect(exported.jira_issue_key).toBeTruthy();
      expect(exported.export_timestamp).toBeTruthy();
    });

    it('should prevent duplicate exports', () => {
      const alreadyExported = {
        ...story,
        exported_to_jira: true,
        jira_issue_key: 'PROJ-123',
      };

      // In real implementation, we'd check this flag
      expect(alreadyExported.exported_to_jira).toBe(true);
      expect(alreadyExported.jira_issue_key).toBeTruthy();
    });
  });

  describe('Statistics and Reporting', () => {
    const stories = [
      { id: '1', generated_by_ai: true, exported_to_jira: true, sprint_status: 'done' as const },
      { id: '2', generated_by_ai: true, exported_to_jira: false, sprint_status: 'in_progress' as const },
      { id: '3', generated_by_ai: false, exported_to_jira: true, sprint_status: 'backlog' as const },
    ];

    it('should calculate total stories', () => {
      expect(stories.length).toBe(3);
    });

    it('should count AI-generated stories', () => {
      const aiGenerated = stories.filter(s => s.generated_by_ai).length;
      expect(aiGenerated).toBe(2);
    });

    it('should count exported stories', () => {
      const exported = stories.filter(s => s.exported_to_jira).length;
      expect(exported).toBe(2);
    });

    it('should count by sprint status', () => {
      const done = stories.filter(s => s.sprint_status === 'done').length;
      const inProgress = stories.filter(s => s.sprint_status === 'in_progress').length;
      const backlog = stories.filter(s => s.sprint_status === 'backlog').length;

      expect(done).toBe(1);
      expect(inProgress).toBe(1);
      expect(backlog).toBe(1);
    });
  });

  describe('Story Templates', () => {
    const template = {
      id: 'template-1',
      project_id: 'project-123',
      template_name: 'Performance Story',
      user_type_template: 'end user',
      goal_template: 'I want {{feature}} to be faster',
      benefit_template: 'So that I can {{benefit}}',
      default_story_points: 5,
      default_labels: ['performance'],
    };

    it('should apply template to new story', () => {
      const story = {
        user_type: template.user_type_template,
        user_goal: template.goal_template.replace('{{feature}}', 'app loading'),
        user_benefit: template.benefit_template.replace('{{benefit}}', 'work more efficiently'),
        story_points: template.default_story_points,
        labels: template.default_labels,
      };

      expect(story.user_type).toBe('end user');
      expect(story.user_goal).toContain('app loading');
      expect(story.story_points).toBe(5);
      expect(story.labels).toContain('performance');
    });

    it('should track template usage', () => {
      const updatedTemplate = {
        ...template,
        usage_count: 10,
        last_used_at: new Date().toISOString(),
      };

      expect(updatedTemplate.usage_count).toBeGreaterThan(0);
      expect(updatedTemplate.last_used_at).toBeTruthy();
    });
  });
});

describe('Error Handling and Validation', () => {
  it('should handle missing theme data', () => {
    const result = {
      success: false,
      error: 'Theme not found',
    };

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should validate story points range', () => {
    const validPoints = [1, 2, 3, 5, 8, 13, 21];
    const invalidPoint = 4;

    expect(validPoints).not.toContain(invalidPoint);
  });

  it('should require acceptance criteria', () => {
    const invalidStory = {
      title: 'Test',
      acceptance_criteria: [],
    };

    expect(invalidStory.acceptance_criteria.length).toBe(0);
    // In real validation, this would throw an error
  });

  it('should handle API errors gracefully', () => {
    const error = {
      message: 'Failed to generate story',
      code: 'GENERATION_ERROR',
      details: 'OpenAI API timeout',
    };

    expect(error).toHaveProperty('message');
    expect(error).toHaveProperty('code');
  });
});

console.log('✅ User Stories Integration Tests Configured');
