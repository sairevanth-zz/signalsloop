/**
 * Component Data Validation
 * Ensures components have valid data before rendering
 */

import { ComponentSpec } from '@/types/stakeholder';

/**
 * Validate component data and props
 */
export function validateComponent(component: ComponentSpec): { valid: boolean; error?: string } {
  try {
    // Check component has required fields
    if (!component.type || !component.props) {
      return { valid: false, error: 'Missing type or props' };
    }

    // Type-specific validation
    switch (component.type) {
      case 'SummaryText':
        if (!component.props.content || component.props.content.trim().length === 0) {
          return { valid: false, error: 'Empty summary content' };
        }
        break;

      case 'MetricCard':
        if (!component.props.title) {
          return { valid: false, error: 'Missing metric title' };
        }
        if (component.props.value === undefined || component.props.value === null) {
          return { valid: false, error: 'Missing metric value' };
        }
        break;

      case 'SentimentChart':
        if (!Array.isArray(component.props.data) || component.props.data.length === 0) {
          return { valid: false, error: 'No chart data' };
        }
        // Validate data points
        const hasValidPoints = component.props.data.every((point: any) =>
          point.date && typeof point.value === 'number'
        );
        if (!hasValidPoints) {
          return { valid: false, error: 'Invalid chart data points' };
        }
        break;

      case 'FeedbackList':
        // Allow empty data_query (will be fetched), but validate if items provided
        if (component.props.items && !Array.isArray(component.props.items)) {
          return { valid: false, error: 'Invalid feedback items' };
        }
        break;

      case 'ThemeCloud':
        if (!Array.isArray(component.props.themes) || component.props.themes.length < 3) {
          return { valid: false, error: 'Need at least 3 themes' };
        }
        // Validate theme structure
        const hasValidThemes = component.props.themes.every((theme: any) =>
          theme.name && typeof theme.count === 'number' && theme.count > 0
        );
        if (!hasValidThemes) {
          return { valid: false, error: 'Invalid theme data' };
        }
        break;

      case 'TimelineEvents':
        if (!Array.isArray(component.props.events)) {
          return { valid: false, error: 'Invalid events data' };
        }
        break;

      case 'ActionCard':
        if (!component.props.title || !component.props.description) {
          return { valid: false, error: 'Missing action title or description' };
        }
        if (!component.props.severity || !['critical', 'high', 'medium', 'low'].includes(component.props.severity)) {
          return { valid: false, error: 'Invalid severity level' };
        }
        break;

      case 'CompetitorCompare':
        if (!Array.isArray(component.props.competitors) || component.props.competitors.length === 0) {
          return { valid: false, error: 'No competitors' };
        }
        if (!Array.isArray(component.props.metrics) || component.props.metrics.length === 0) {
          return { valid: false, error: 'No metrics to compare' };
        }
        break;
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Validation error' };
  }
}

/**
 * Validate entire response and filter out invalid components
 */
export function validateResponse(components: ComponentSpec[]): {
  validComponents: ComponentSpec[];
  errors: string[];
} {
  const validComponents: ComponentSpec[] = [];
  const errors: string[] = [];

  for (const component of components) {
    const validation = validateComponent(component);
    if (validation.valid) {
      validComponents.push(component);
    } else {
      errors.push(`${component.type}: ${validation.error}`);
      console.warn(`[Validation] Skipping invalid component: ${component.type} - ${validation.error}`);
    }
  }

  return { validComponents, errors };
}
