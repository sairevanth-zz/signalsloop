/**
 * Unit tests for Component Validation
 */

import { validateComponent, validateResponse } from '@/lib/stakeholder/validation';
import { ComponentSpec } from '@/types/stakeholder';

describe('Component Validation', () => {
  describe('SummaryText validation', () => {
    it('should validate valid SummaryText component', () => {
      const component: ComponentSpec = {
        type: 'SummaryText',
        order: 1,
        props: {
          content: 'This is a valid summary',
          sources: []
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty content', () => {
      const component: ComponentSpec = {
        type: 'SummaryText',
        order: 1,
        props: {
          content: '',
          sources: []
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Empty summary content');
    });
  });

  describe('MetricCard validation', () => {
    it('should validate valid MetricCard', () => {
      const component: ComponentSpec = {
        type: 'MetricCard',
        order: 1,
        props: {
          title: 'Total Feedback',
          value: 156,
          trend: 'up',
          delta: '+15%'
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(true);
    });

    it('should reject missing title', () => {
      const component: ComponentSpec = {
        type: 'MetricCard',
        order: 1,
        props: {
          value: 156
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing metric title');
    });

    it('should reject missing value', () => {
      const component: ComponentSpec = {
        type: 'MetricCard',
        order: 1,
        props: {
          title: 'Total Feedback'
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing metric value');
    });
  });

  describe('SentimentChart validation', () => {
    it('should validate valid SentimentChart', () => {
      const component: ComponentSpec = {
        type: 'SentimentChart',
        order: 1,
        props: {
          data: [
            { date: '2024-01-01', value: 0.5 },
            { date: '2024-01-02', value: 0.6 }
          ],
          timeRange: '30d',
          title: 'Sentiment Trend'
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(true);
    });

    it('should reject empty data array', () => {
      const component: ComponentSpec = {
        type: 'SentimentChart',
        order: 1,
        props: {
          data: [],
          timeRange: '30d'
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No chart data');
    });

    it('should reject invalid data points', () => {
      const component: ComponentSpec = {
        type: 'SentimentChart',
        order: 1,
        props: {
          data: [
            { date: '2024-01-01' }, // Missing value
            { value: 0.5 } // Missing date
          ]
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid chart data points');
    });
  });

  describe('FeedbackList validation', () => {
    it('should accept FeedbackList with data_query', () => {
      const component: ComponentSpec = {
        type: 'FeedbackList',
        order: 1,
        props: {
          limit: 5,
          showSentiment: true
        },
        data_query: {
          type: 'feedback',
          limit: 5
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(true);
    });

    it('should reject FeedbackList without data_query', () => {
      const component: ComponentSpec = {
        type: 'FeedbackList',
        order: 1,
        props: {
          limit: 5,
          showSentiment: true
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requires data_query');
    });

    it('should filter out placeholder items', () => {
      const component: ComponentSpec = {
        type: 'FeedbackList',
        order: 1,
        props: {
          items: [
            { id: '1', title: 'Real feedback', content: 'Good product' },
            { id: 'placeholder', title: 'Invalid Data', content: '' },
            { id: '2', title: 'Another real item', content: 'Great!' }
          ],
          limit: 5
        },
        data_query: {
          type: 'feedback',
          limit: 5
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(true);
      expect(component.props.items).toHaveLength(2);
      expect(component.props.items.find((i: any) => i.title === 'Invalid Data')).toBeUndefined();
    });

    it('should reject items with banned phrases', () => {
      const bannedPhrases = ['Invalid Data', 'No data', 'Sample', 'Placeholder', 'Example'];

      bannedPhrases.forEach(phrase => {
        const component: ComponentSpec = {
          type: 'FeedbackList',
          order: 1,
          props: {
            items: [{ id: '1', title: phrase, content: '' }],
            limit: 5
          },
          data_query: {
            type: 'feedback',
            limit: 5
          }
        };

        validateComponent(component);
        expect(component.props.items).toHaveLength(0);
      });
    });
  });

  describe('ThemeCloud validation', () => {
    it('should validate valid ThemeCloud', () => {
      const component: ComponentSpec = {
        type: 'ThemeCloud',
        order: 1,
        props: {
          themes: [
            { name: 'Mobile Bugs', count: 47, sentiment: -0.5, trend: 'up' },
            { name: 'Feature Requests', count: 38, sentiment: 0.3, trend: 'stable' },
            { name: 'Performance', count: 25, sentiment: -0.2, trend: 'down' }
          ],
          title: 'Top Themes'
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(true);
    });

    it('should reject if less than 3 themes', () => {
      const component: ComponentSpec = {
        type: 'ThemeCloud',
        order: 1,
        props: {
          themes: [
            { name: 'Theme 1', count: 10 },
            { name: 'Theme 2', count: 5 }
          ]
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 3 themes');
    });

    it('should reject invalid theme structure', () => {
      const component: ComponentSpec = {
        type: 'ThemeCloud',
        order: 1,
        props: {
          themes: [
            { name: 'Theme 1', count: 10 },
            { name: 'Theme 2' }, // Missing count
            { count: 5 } // Missing name
          ]
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid theme data');
    });
  });

  describe('ActionCard validation', () => {
    it('should validate valid ActionCard', () => {
      const component: ComponentSpec = {
        type: 'ActionCard',
        order: 1,
        props: {
          title: 'Critical Issue',
          description: 'Mobile app crashes',
          severity: 'high',
          cta: 'Review Now'
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid severity levels', () => {
      const component: ComponentSpec = {
        type: 'ActionCard',
        order: 1,
        props: {
          title: 'Issue',
          description: 'Something wrong',
          severity: 'urgent' // Invalid
        }
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid severity level');
    });
  });

  describe('validateResponse', () => {
    it('should filter out invalid components', () => {
      const components: ComponentSpec[] = [
        {
          type: 'SummaryText',
          order: 1,
          props: { content: 'Valid summary', sources: [] }
        },
        {
          type: 'MetricCard',
          order: 2,
          props: { title: 'Missing value' } // Invalid - no value
        },
        {
          type: 'ThemeCloud',
          order: 3,
          props: {
            themes: [
              { name: 'Theme 1', count: 10 },
              { name: 'Theme 2', count: 5 }
            ] // Invalid - less than 3
          }
        }
      ];

      const result = validateResponse(components);

      expect(result.validComponents).toHaveLength(1);
      expect(result.errors).toHaveLength(2);
      expect(result.validComponents[0].type).toBe('SummaryText');
    });

    it('should return all components if all valid', () => {
      const components: ComponentSpec[] = [
        {
          type: 'SummaryText',
          order: 1,
          props: { content: 'Valid summary', sources: [] }
        },
        {
          type: 'MetricCard',
          order: 2,
          props: { title: 'Total Feedback', value: 156 }
        }
      ];

      const result = validateResponse(components);

      expect(result.validComponents).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });
  });
});
