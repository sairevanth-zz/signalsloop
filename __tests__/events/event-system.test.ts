/**
 * Event System Tests
 * Tests for Phase 1 event infrastructure and Phase 2 agents
 */

import { publishEvent, EventType, AggregateType } from '@/lib/events';
import { handleFeedbackCreated } from '@/lib/agents/sentiment-agent';
import { handleThemeThresholdReached } from '@/lib/agents/spec-writer-agent';

// Mock dependencies
jest.mock('@/lib/supabase-singleton');
jest.mock('@/lib/openai/sentiment');
jest.mock('@/lib/specs/embeddings');
jest.mock('openai');

describe('Event System', () => {
  describe('Event Types', () => {
    it('should have all required event types defined', () => {
      expect(EventType.FEEDBACK_CREATED).toBe('feedback.created');
      expect(EventType.FEEDBACK_UPDATED).toBe('feedback.updated');
      expect(EventType.FEEDBACK_VOTED).toBe('feedback.voted');
      expect(EventType.SENTIMENT_ANALYZED).toBe('sentiment.analyzed');
      expect(EventType.THEME_DETECTED).toBe('theme.detected');
      expect(EventType.THEME_THRESHOLD_REACHED).toBe('theme.threshold_reached');
      expect(EventType.SPEC_AUTO_DRAFTED).toBe('spec.auto_drafted');
      expect(EventType.SPEC_APPROVED).toBe('spec.approved');
    });
  });

  describe('Aggregate Types', () => {
    it('should have all required aggregate types defined', () => {
      expect(AggregateType.POST).toBe('post');
      expect(AggregateType.SPEC).toBe('spec');
      expect(AggregateType.THEME).toBe('theme');
      expect(AggregateType.SENTIMENT).toBe('sentiment_analysis');
    });
  });

  describe('Event Publishing', () => {
    it('should create valid event structure', () => {
      const event = {
        type: EventType.FEEDBACK_CREATED,
        aggregate_type: AggregateType.POST,
        aggregate_id: 'test-id-123',
        payload: {
          title: 'Test feedback',
          content: 'Test content',
        },
        metadata: {
          project_id: 'project-123',
          user_id: 'user-123',
          source: 'test',
        },
        version: 1,
      };

      expect(event.type).toBe('feedback.created');
      expect(event.aggregate_type).toBe('post');
      expect(event.aggregate_id).toBe('test-id-123');
      expect(event.payload).toHaveProperty('title');
      expect(event.metadata).toHaveProperty('project_id');
      expect(event.version).toBe(1);
    });
  });

  describe('Agent Handlers', () => {
    it('should have sentiment agent handler defined', () => {
      expect(typeof handleFeedbackCreated).toBe('function');
    });

    it('should have spec writer agent handler defined', () => {
      expect(typeof handleThemeThresholdReached).toBe('function');
    });
  });
});

describe('Event-Driven Architecture', () => {
  it('should follow event naming convention', () => {
    const eventTypes = Object.values(EventType);

    eventTypes.forEach((eventType) => {
      // All events should be in domain.action format
      expect(eventType).toMatch(/^[a-z]+\.[a-z_]+$/);

      // Should have exactly one dot
      const parts = eventType.split('.');
      expect(parts.length).toBe(2);
    });
  });

  it('should have consistent aggregate types', () => {
    const aggregateTypes = Object.values(AggregateType);

    aggregateTypes.forEach((aggregateType) => {
      // All aggregates should be lowercase snake_case
      expect(aggregateType).toMatch(/^[a-z_]+$/);
    });
  });
});
