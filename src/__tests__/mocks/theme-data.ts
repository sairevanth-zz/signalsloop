/**
 * Mock data for theme detection tests
 */

import {
  Theme,
  ThemeWithDetails,
  FeedbackItem,
  DetectedTheme,
  EmergingTheme,
  ThemeCluster,
  ThemeTrendPoint,
} from '@/types/themes';

export const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';
export const mockThemeId = '223e4567-e89b-12d3-a456-426614174001';
export const mockClusterId = '323e4567-e89b-12d3-a456-426614174002';

// Mock Feedback Items
export const mockFeedbackItems: FeedbackItem[] = [
  {
    id: 'f1',
    title: 'Dark mode needed',
    description: 'Please add dark mode support to the app',
    category: 'feature_request',
    created_at: '2025-01-01T10:00:00Z',
    sentiment_score: 0.2,
    sentiment_category: 'neutral',
  },
  {
    id: 'f2',
    title: 'Dark theme would be great',
    description: 'I would love to have a dark theme option',
    category: 'feature_request',
    created_at: '2025-01-02T10:00:00Z',
    sentiment_score: 0.6,
    sentiment_category: 'positive',
  },
  {
    id: 'f3',
    title: 'App crashes on iOS',
    description: 'The app keeps crashing when I open it on my iPhone',
    category: 'bug',
    created_at: '2025-01-03T10:00:00Z',
    sentiment_score: -0.8,
    sentiment_category: 'negative',
  },
  {
    id: 'f4',
    title: 'Slow loading times',
    description: 'Pages take too long to load, especially the dashboard',
    category: 'bug',
    created_at: '2025-01-04T10:00:00Z',
    sentiment_score: -0.5,
    sentiment_category: 'negative',
  },
  {
    id: 'f5',
    title: 'Love the new UI',
    description: 'The recent UI update looks amazing!',
    category: 'feedback',
    created_at: '2025-01-05T10:00:00Z',
    sentiment_score: 0.9,
    sentiment_category: 'positive',
  },
  {
    id: 'f6',
    title: 'Export to CSV feature',
    description: 'Need ability to export data to CSV format',
    category: 'feature_request',
    created_at: '2025-01-06T10:00:00Z',
    sentiment_score: 0.3,
    sentiment_category: 'positive',
  },
  {
    id: 'f7',
    title: 'Excel export would be useful',
    description: 'Can we export reports to Excel?',
    category: 'feature_request',
    created_at: '2025-01-07T10:00:00Z',
    sentiment_score: 0.4,
    sentiment_category: 'positive',
  },
  {
    id: 'f8',
    title: 'Performance issues',
    description: 'The app feels sluggish when working with large datasets',
    category: 'bug',
    created_at: '2025-01-08T10:00:00Z',
    sentiment_score: -0.6,
    sentiment_category: 'negative',
  },
  {
    id: 'f9',
    title: 'Mobile responsive design needed',
    description: 'The app does not work well on mobile devices',
    category: 'feature_request',
    created_at: '2025-01-09T10:00:00Z',
    sentiment_score: -0.3,
    sentiment_category: 'negative',
  },
  {
    id: 'f10',
    title: 'Great customer support',
    description: 'Your support team is very helpful and responsive',
    category: 'feedback',
    created_at: '2025-01-10T10:00:00Z',
    sentiment_score: 0.95,
    sentiment_category: 'positive',
  },
];

// Mock Detected Themes (from AI)
export const mockDetectedThemes: DetectedTheme[] = [
  {
    theme_name: 'Dark Mode / Theme Support',
    description: 'Users requesting dark mode or theme customization options',
    item_indices: [0, 1],
    confidence: 0.92,
  },
  {
    theme_name: 'Performance Issues',
    description: 'Reports of slow loading times and app sluggishness',
    item_indices: [3, 7],
    confidence: 0.88,
  },
  {
    theme_name: 'Data Export Features',
    description: 'Requests for exporting data to various formats (CSV, Excel)',
    item_indices: [5, 6],
    confidence: 0.85,
  },
  {
    theme_name: 'Mobile Responsiveness',
    description: 'Issues and requests related to mobile device compatibility',
    item_indices: [8],
    confidence: 0.78,
  },
  {
    theme_name: 'iOS Stability',
    description: 'App crashes and stability issues on iOS devices',
    item_indices: [2],
    confidence: 0.95,
  },
];

// Mock Themes (stored in DB)
export const mockThemes: Theme[] = [
  {
    id: mockThemeId,
    project_id: mockProjectId,
    cluster_id: mockClusterId,
    theme_name: 'Dark Mode / Theme Support',
    description: 'Users requesting dark mode or theme customization options',
    frequency: 15,
    avg_sentiment: 0.45,
    first_seen: '2024-12-01T10:00:00Z',
    last_seen: '2025-01-10T10:00:00Z',
    is_emerging: false,
    created_at: '2024-12-01T10:00:00Z',
    updated_at: '2025-01-10T10:00:00Z',
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174003',
    project_id: mockProjectId,
    cluster_id: mockClusterId,
    theme_name: 'Performance Issues',
    description: 'Reports of slow loading times and app sluggishness',
    frequency: 8,
    avg_sentiment: -0.55,
    first_seen: '2025-01-01T10:00:00Z',
    last_seen: '2025-01-08T10:00:00Z',
    is_emerging: true,
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-08T10:00:00Z',
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174004',
    project_id: mockProjectId,
    cluster_id: '323e4567-e89b-12d3-a456-426614174003',
    theme_name: 'Data Export Features',
    description: 'Requests for exporting data to various formats',
    frequency: 5,
    avg_sentiment: 0.35,
    first_seen: '2025-01-05T10:00:00Z',
    last_seen: '2025-01-07T10:00:00Z',
    is_emerging: false,
    created_at: '2025-01-05T10:00:00Z',
    updated_at: '2025-01-07T10:00:00Z',
  },
];

// Mock Theme with Details
export const mockThemeWithDetails: ThemeWithDetails = {
  ...mockThemes[0],
  cluster_name: 'Feature Requests',
  actual_feedback_count: 15,
  related_categories: ['feature_request', 'enhancement'],
};

// Mock Emerging Themes
export const mockEmergingThemes: EmergingTheme[] = [
  {
    id: '223e4567-e89b-12d3-a456-426614174003',
    project_id: mockProjectId,
    theme_name: 'Performance Issues',
    description: 'Reports of slow loading times and app sluggishness',
    frequency: 8,
    avg_sentiment: -0.55,
    first_seen: '2025-01-01T10:00:00Z',
    last_seen: '2025-01-08T10:00:00Z',
    is_emerging: true,
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-08T10:00:00Z',
    growth_rate: 1.5,
    growth_label: '+150% this week',
  },
];

// Mock Theme Clusters
export const mockThemeClusters: ThemeCluster[] = [
  {
    id: mockClusterId,
    project_id: mockProjectId,
    cluster_name: 'Feature Requests',
    description: 'User-requested features and enhancements',
    theme_count: 5,
    created_at: '2024-12-01T10:00:00Z',
    updated_at: '2025-01-10T10:00:00Z',
  },
  {
    id: '323e4567-e89b-12d3-a456-426614174003',
    project_id: mockProjectId,
    cluster_name: 'Bug Reports',
    description: 'Reported bugs and technical issues',
    theme_count: 3,
    created_at: '2024-12-01T10:00:00Z',
    updated_at: '2025-01-10T10:00:00Z',
  },
];

// Mock Theme Trend Data
export const mockThemeTrend: ThemeTrendPoint[] = [
  { date: '2025-01-01', frequency: 2 },
  { date: '2025-01-02', frequency: 3 },
  { date: '2025-01-03', frequency: 4 },
  { date: '2025-01-04', frequency: 5 },
  { date: '2025-01-05', frequency: 7 },
  { date: '2025-01-06', frequency: 9 },
  { date: '2025-01-07', frequency: 12 },
  { date: '2025-01-08', frequency: 15 },
];

// Mock OpenAI Response
export const mockOpenAIThemeResponse = {
  themes: mockDetectedThemes,
};

// Large dataset for comprehensive testing (100+ items)
export const mockLargeFeedbackDataset: FeedbackItem[] = Array.from(
  { length: 120 },
  (_, i) => ({
    id: `feedback-${i}`,
    title: `Feedback item ${i}`,
    description: `Description for feedback item ${i}`,
    category: ['bug', 'feature_request', 'feedback'][i % 3],
    created_at: new Date(2025, 0, (i % 30) + 1).toISOString(),
    sentiment_score: (Math.random() * 2 - 1) * 0.9, // -0.9 to 0.9
    sentiment_category: ['positive', 'neutral', 'negative'][i % 3],
  })
);

// Edge case: No themes detected
export const mockNoThemesResponse = {
  themes: [],
};

// Edge case: Single theme
export const mockSingleThemeResponse = {
  themes: [mockDetectedThemes[0]],
};

// Edge case: Many themes (20+)
export const mockManyThemesResponse = {
  themes: Array.from({ length: 25 }, (_, i) => ({
    theme_name: `Theme ${i + 1}`,
    description: `Description for theme ${i + 1}`,
    item_indices: [i, i + 1],
    confidence: 0.7 + Math.random() * 0.3,
  })),
};
