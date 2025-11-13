/**
 * Theme Utilities
 * Helper functions for theme operations
 */

import {
  Theme,
  ThemeWithDetails,
  ThemeCluster,
  FeedbackItem,
  ThemeGrowth,
  EmergingTheme,
  ThemeTrend,
  ThemeTrendPoint,
} from '@/types/themes';

/**
 * Calculate theme growth percentage
 */
export function calculateThemeGrowth(
  theme: Theme,
  previousPeriod: Theme | null,
): number {
  if (!previousPeriod || previousPeriod.frequency === 0) {
    return theme.frequency > 0 ? 100 : 0;
  }

  const growth =
    ((theme.frequency - previousPeriod.frequency) / previousPeriod.frequency) *
    100;
  return Math.round(growth);
}

/**
 * Check if a theme is emerging
 * A theme is emerging if it's new or has grown significantly
 */
export function isEmergingTheme(theme: Theme): boolean {
  return theme.is_emerging;
}

/**
 * Get representative feedback for a theme
 * Returns the most relevant feedback items based on confidence and sentiment
 */
export function getRepresentativeFeedback(
  theme: Theme,
  allFeedback: FeedbackItem[],
  limit: number = 3,
): FeedbackItem[] {
  // This is a simplified version - in the real API, you'd join with feedback_themes
  // to get confidence scores and sort by them

  // For now, return a placeholder
  return allFeedback.slice(0, limit);
}

/**
 * Group themes by cluster
 */
export function groupThemesByCluster(
  themes: ThemeWithDetails[],
): Map<string, ThemeWithDetails[]> {
  const grouped = new Map<string, ThemeWithDetails[]>();

  for (const theme of themes) {
    const clusterName = theme.cluster_name || 'Uncategorized';
    const existing = grouped.get(clusterName) || [];
    existing.push(theme);
    grouped.set(clusterName, existing);
  }

  return grouped;
}

/**
 * Convert grouped themes to ThemeCluster objects
 */
export function groupedThemesToClusters(
  groupedThemes: Map<string, ThemeWithDetails[]>,
  projectId: string,
): ThemeCluster[] {
  const clusters: ThemeCluster[] = [];

  for (const [clusterName, themes] of groupedThemes.entries()) {
    const totalFrequency = themes.reduce((sum, t) => sum + t.frequency, 0);
    const avgSentiment =
      themes.reduce((sum, t) => sum + t.avg_sentiment, 0) / themes.length;

    clusters.push({
      id: `cluster-${clusterName.toLowerCase().replace(/\s+/g, '-')}`,
      project_id: projectId,
      cluster_name: clusterName,
      description: `Contains ${themes.length} themes with ${totalFrequency} total mentions`,
      theme_count: themes.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return clusters;
}

/**
 * Format theme growth as a readable string
 */
export function formatThemeGrowth(growth: number): string {
  if (growth > 0) {
    return `+${growth}%`;
  } else if (growth < 0) {
    return `${growth}%`;
  } else {
    return '0%';
  }
}

/**
 * Get theme sentiment label
 */
export function getThemeSentimentLabel(avgSentiment: number): string {
  if (avgSentiment >= 0.5) return 'Very Positive';
  if (avgSentiment >= 0.2) return 'Positive';
  if (avgSentiment >= -0.2) return 'Neutral';
  if (avgSentiment >= -0.5) return 'Negative';
  return 'Very Negative';
}

/**
 * Get theme sentiment color
 */
export function getThemeSentimentColor(avgSentiment: number): string {
  if (avgSentiment >= 0.3) return 'text-green-600';
  if (avgSentiment <= -0.3) return 'text-red-600';
  return 'text-gray-600';
}

/**
 * Get theme priority level based on frequency, sentiment, and recency
 */
export function getThemePriority(theme: Theme): 'high' | 'medium' | 'low' {
  const score =
    theme.frequency * 0.5 +
    (theme.is_emerging ? 20 : 0) +
    Math.abs(theme.avg_sentiment) * 10;

  if (score >= 30) return 'high';
  if (score >= 15) return 'medium';
  return 'low';
}

/**
 * Get theme priority color
 */
export function getThemePriorityColor(
  priority: 'high' | 'medium' | 'low',
): string {
  switch (priority) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'medium':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'low':
      return 'text-blue-600 bg-blue-50 border-blue-200';
  }
}

/**
 * Filter themes by search term
 */
export function filterThemesBySearch(
  themes: Theme[],
  searchTerm: string,
): Theme[] {
  if (!searchTerm || searchTerm.trim() === '') {
    return themes;
  }

  const term = searchTerm.toLowerCase().trim();

  return themes.filter(
    (theme) =>
      theme.theme_name.toLowerCase().includes(term) ||
      theme.description.toLowerCase().includes(term),
  );
}

/**
 * Filter themes by sentiment
 */
export function filterThemesBySentiment(
  themes: Theme[],
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed',
): Theme[] {
  return themes.filter((theme) => {
    switch (sentiment) {
      case 'positive':
        return theme.avg_sentiment >= 0.3;
      case 'negative':
        return theme.avg_sentiment <= -0.3;
      case 'neutral':
        return theme.avg_sentiment > -0.3 && theme.avg_sentiment < 0.3;
      case 'mixed':
        // Mixed is harder to determine from avg_sentiment alone
        return false;
      default:
        return true;
    }
  });
}

/**
 * Filter themes by frequency range
 */
export function filterThemesByFrequency(
  themes: Theme[],
  minFrequency?: number,
  maxFrequency?: number,
): Theme[] {
  return themes.filter((theme) => {
    if (minFrequency !== undefined && theme.frequency < minFrequency) {
      return false;
    }
    if (maxFrequency !== undefined && theme.frequency > maxFrequency) {
      return false;
    }
    return true;
  });
}

/**
 * Sort themes by various criteria
 */
export function sortThemes(
  themes: Theme[],
  sortBy:
    | 'frequency_desc'
    | 'frequency_asc'
    | 'sentiment_desc'
    | 'sentiment_asc'
    | 'newest'
    | 'oldest'
    | 'name_asc'
    | 'name_desc',
): Theme[] {
  const sorted = [...themes];

  switch (sortBy) {
    case 'frequency_desc':
      return sorted.sort((a, b) => b.frequency - a.frequency);
    case 'frequency_asc':
      return sorted.sort((a, b) => a.frequency - b.frequency);
    case 'sentiment_desc':
      return sorted.sort((a, b) => b.avg_sentiment - a.avg_sentiment);
    case 'sentiment_asc':
      return sorted.sort((a, b) => a.avg_sentiment - b.avg_sentiment);
    case 'newest':
      return sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    case 'oldest':
      return sorted.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    case 'name_asc':
      return sorted.sort((a, b) => a.theme_name.localeCompare(b.theme_name));
    case 'name_desc':
      return sorted.sort((a, b) => b.theme_name.localeCompare(a.theme_name));
    default:
      return sorted;
  }
}

/**
 * Calculate trend direction
 */
export function calculateTrendDirection(
  trendData: ThemeTrendPoint[],
): 'up' | 'down' | 'stable' {
  if (trendData.length < 2) return 'stable';

  const recentData = trendData.slice(0, 7); // Last 7 days
  const olderData = trendData.slice(7, 14); // Previous 7 days

  if (olderData.length === 0) return 'stable';

  const recentAvg =
    recentData.reduce((sum, d) => sum + d.feedback_count, 0) /
    recentData.length;
  const olderAvg =
    olderData.reduce((sum, d) => sum + d.feedback_count, 0) / olderData.length;

  const change = ((recentAvg - olderAvg) / (olderAvg || 1)) * 100;

  if (change > 10) return 'up';
  if (change < -10) return 'down';
  return 'stable';
}

/**
 * Format date for display
 */
export function formatThemeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;

  return date.toLocaleDateString();
}

/**
 * Format theme frequency for display
 */
export function formatThemeFrequency(frequency: number): string {
  if (frequency === 1) return '1 mention';
  return `${frequency} mentions`;
}

/**
 * Get time range label
 */
export function getTimeRangeLabel(days: number | 'all'): string {
  if (days === 'all') return 'All time';
  if (days === 7) return 'Last 7 days';
  if (days === 30) return 'Last 30 days';
  if (days === 90) return 'Last 90 days';
  return `Last ${days} days`;
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(
  current: number,
  previous: number,
): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Get theme icon based on sentiment
 */
export function getThemeIcon(avgSentiment: number): string {
  if (avgSentiment >= 0.3) return '😊';
  if (avgSentiment <= -0.3) return '😞';
  return '😐';
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Calculate theme score for ranking
 * Combines frequency, sentiment intensity, and recency
 */
export function calculateThemeScore(theme: Theme): number {
  const frequencyScore = theme.frequency * 10;
  const sentimentScore = Math.abs(theme.avg_sentiment) * 5;
  const emergingBonus = theme.is_emerging ? 20 : 0;

  // Recency score (more recent = higher)
  const now = new Date();
  const lastSeen = new Date(theme.last_seen);
  const daysSinceLastSeen = Math.floor(
    (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24),
  );
  const recencyScore = Math.max(0, 10 - daysSinceLastSeen * 0.5);

  return frequencyScore + sentimentScore + emergingBonus + recencyScore;
}

/**
 * Get top themes by score
 */
export function getTopThemes(themes: Theme[], limit: number = 10): Theme[] {
  const scored = themes.map((theme) => ({
    theme,
    score: calculateThemeScore(theme),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((item) => item.theme);
}

/**
 * Check if theme is actionable
 * Actionable themes are those with negative sentiment and high frequency
 */
export function isThemeActionable(theme: Theme): boolean {
  return theme.avg_sentiment < -0.3 && theme.frequency >= 5;
}

/**
 * Get actionable themes
 */
export function getActionableThemes(themes: Theme[]): Theme[] {
  return themes.filter(isThemeActionable).sort((a, b) => {
    // Sort by combination of negative sentiment and frequency
    const scoreA = Math.abs(a.avg_sentiment) * a.frequency;
    const scoreB = Math.abs(b.avg_sentiment) * b.frequency;
    return scoreB - scoreA;
  });
}

/**
 * Calculate theme velocity
 * Measures how quickly a theme is gaining mentions
 */
export function calculateThemeVelocity(
  theme: Theme,
  trendData: ThemeTrendPoint[],
): number {
  if (trendData.length < 2) return 0;

  const recent = trendData.slice(0, 7);
  const older = trendData.slice(7, 14);

  if (older.length === 0) return 0;

  const recentCount = recent.reduce((sum, d) => sum + d.feedback_count, 0);
  const olderCount = older.reduce((sum, d) => sum + d.feedback_count, 0);

  return recentCount - olderCount;
}

/**
 * Format velocity for display
 */
export function formatVelocity(velocity: number): string {
  if (velocity > 0) return `+${velocity} this week`;
  if (velocity < 0) return `${velocity} this week`;
  return 'No change';
}

/**
 * Get theme status badge
 */
export function getThemeStatusBadge(theme: Theme): {
  label: string;
  color: string;
} {
  if (theme.is_emerging) {
    return {
      label: 'Emerging',
      color: 'bg-orange-100 text-orange-800 border-orange-300',
    };
  }

  if (theme.frequency >= 20) {
    return {
      label: 'High Volume',
      color: 'bg-purple-100 text-purple-800 border-purple-300',
    };
  }

  if (isThemeActionable(theme)) {
    return {
      label: 'Action Needed',
      color: 'bg-red-100 text-red-800 border-red-300',
    };
  }

  return {
    label: 'Active',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
  };
}

/**
 * Generate theme summary
 */
export function generateThemeSummary(theme: Theme): string {
  const sentimentLabel = getThemeSentimentLabel(theme.avg_sentiment);
  const priority = getThemePriority(theme);

  return `${theme.frequency} mentions with ${sentimentLabel.toLowerCase()} sentiment. Priority: ${priority}.`;
}

/**
 * Export themes to CSV format
 */
export function exportThemesToCSV(themes: Theme[]): string {
  const headers = [
    'Theme Name',
    'Description',
    'Frequency',
    'Average Sentiment',
    'First Seen',
    'Last Seen',
    'Is Emerging',
  ];

  const rows = themes.map((theme) => [
    theme.theme_name,
    theme.description,
    theme.frequency.toString(),
    theme.avg_sentiment.toFixed(2),
    formatThemeDate(theme.first_seen),
    formatThemeDate(theme.last_seen),
    theme.is_emerging ? 'Yes' : 'No',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}
