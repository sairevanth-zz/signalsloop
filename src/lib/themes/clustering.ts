/**
 * Theme Clustering Algorithm
 * Handles merging, ranking, and organizing themes from AI detection
 */

import {
  Theme,
  DetectedTheme,
  ThemeCluster,
  FeedbackItem,
  ThemeGrowth,
  EmergingTheme,
  ThemeClusteringError,
  EMERGING_THEME_THRESHOLD,
} from '@/types/themes';

/**
 * Merge and rank themes from detection results
 * Combines similar themes and calculates metrics
 */
export function mergeAndRankThemes(
  detectedThemes: DetectedTheme[],
  existingThemes: Theme[],
  feedbackItems: FeedbackItem[],
  projectId: string,
): {
  newThemes: Partial<Theme>[];
  updatedThemes: Partial<Theme>[];
} {
  if (detectedThemes.length === 0) {
    return { newThemes: [], updatedThemes: [] };
  }

  const newThemes: Partial<Theme>[] = [];
  const updatedThemes: Partial<Theme>[] = [];
  const now = new Date().toISOString();

  // Create a map of existing themes by name (case-insensitive)
  const existingThemeMap = new Map<string, Theme>();
  for (const theme of existingThemes) {
    existingThemeMap.set(theme.theme_name.toLowerCase(), theme);
  }

  // Process each detected theme
  for (const detected of detectedThemes) {
    const themeName = detected.theme_name;
    const themeKey = themeName.toLowerCase();
    const existing = existingThemeMap.get(themeKey);

    // Calculate metrics from feedback items
    const frequency = detected.item_indices.length;
    const relatedFeedback = detected.item_indices
      .map((idx) => feedbackItems[idx])
      .filter((item) => item !== undefined);

    const avgSentiment = calculateAverageSentiment(relatedFeedback);
    const firstSeen = relatedFeedback.length > 0
      ? relatedFeedback.reduce((earliest, item) =>
          new Date(item.created_at) < new Date(earliest)
            ? item.created_at
            : earliest,
        relatedFeedback[0].created_at)
      : now;
    const lastSeen = relatedFeedback.length > 0
      ? relatedFeedback.reduce((latest, item) =>
          new Date(item.created_at) > new Date(latest)
            ? item.created_at
            : latest,
        relatedFeedback[0].created_at)
      : now;

    if (existing) {
      // Update existing theme
      const previousFrequency = existing.frequency;
      const newFrequency = Math.max(frequency, previousFrequency);
      const isEmerging = detectEmergingStatus(newFrequency, previousFrequency);

      updatedThemes.push({
        id: existing.id,
        frequency: newFrequency,
        avg_sentiment: avgSentiment,
        first_seen: new Date(existing.first_seen) < new Date(firstSeen)
          ? existing.first_seen
          : firstSeen,
        last_seen: new Date(existing.last_seen) > new Date(lastSeen)
          ? existing.last_seen
          : lastSeen,
        is_emerging: isEmerging,
        updated_at: now,
      });
    } else {
      // Create new theme
      newThemes.push({
        project_id: projectId,
        theme_name: themeName,
        description: detected.description,
        frequency,
        avg_sentiment: avgSentiment,
        first_seen: firstSeen,
        last_seen: lastSeen,
        is_emerging: true, // New themes are always emerging
        created_at: now,
        updated_at: now,
      });
    }
  }

  // Sort new themes by frequency (descending)
  newThemes.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));

  // Sort updated themes by frequency (descending)
  updatedThemes.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));

  console.log(
    `[CLUSTERING] Processed ${detectedThemes.length} themes: ${newThemes.length} new, ${updatedThemes.length} updated`,
  );

  return { newThemes, updatedThemes };
}

/**
 * Calculate average sentiment from feedback items
 */
function calculateAverageSentiment(items: FeedbackItem[]): number {
  if (items.length === 0) return 0;

  const sentimentScores = items
    .map((item) => item.sentiment_score)
    .filter((score): score is number => score !== undefined);

  if (sentimentScores.length === 0) return 0;

  const sum = sentimentScores.reduce((acc, score) => acc + score, 0);
  const avg = sum / sentimentScores.length;

  // Round to 2 decimal places
  return Math.round(avg * 100) / 100;
}

/**
 * Detect if a theme is emerging based on growth
 */
function detectEmergingStatus(
  currentFrequency: number,
  previousFrequency: number,
): boolean {
  if (previousFrequency === 0) {
    // New theme with significant frequency
    return currentFrequency >= 3;
  }

  const growthRate = (currentFrequency - previousFrequency) / previousFrequency;
  return growthRate >= EMERGING_THEME_THRESHOLD; // 100% growth
}

/**
 * Calculate growth metrics for themes
 */
export function calculateThemeGrowth(
  currentThemes: Theme[],
  previousThemes: Theme[],
): ThemeGrowth[] {
  const growthMetrics: ThemeGrowth[] = [];

  // Create a map of previous themes
  const previousMap = new Map<string, Theme>();
  for (const theme of previousThemes) {
    previousMap.set(theme.id, theme);
  }

  for (const current of currentThemes) {
    const previous = previousMap.get(current.id);

    if (!previous) {
      // New theme
      growthMetrics.push({
        theme_id: current.id,
        current_frequency: current.frequency,
        previous_frequency: 0,
        growth_percentage: 100,
        growth_absolute: current.frequency,
        is_new: true,
      });
    } else {
      // Existing theme
      const growthAbsolute = current.frequency - previous.frequency;
      const growthPercentage =
        previous.frequency > 0
          ? (growthAbsolute / previous.frequency) * 100
          : 0;

      growthMetrics.push({
        theme_id: current.id,
        current_frequency: current.frequency,
        previous_frequency: previous.frequency,
        growth_percentage: Math.round(growthPercentage),
        growth_absolute: growthAbsolute,
        is_new: false,
      });
    }
  }

  // Sort by growth percentage (descending)
  growthMetrics.sort((a, b) => b.growth_percentage - a.growth_percentage);

  return growthMetrics;
}

/**
 * Identify emerging themes
 * Returns themes that are new or have significant growth
 */
export function identifyEmergingThemes(
  currentThemes: Theme[],
  previousThemes: Theme[],
): EmergingTheme[] {
  const growthMetrics = calculateThemeGrowth(currentThemes, previousThemes);
  const emergingThemes: EmergingTheme[] = [];

  for (const metric of growthMetrics) {
    const theme = currentThemes.find((t) => t.id === metric.theme_id);
    if (!theme) continue;

    // Only include themes with significant growth or new themes
    if (
      metric.is_new ||
      metric.growth_percentage >= EMERGING_THEME_THRESHOLD * 100
    ) {
      const growthLabel = metric.is_new
        ? 'New theme'
        : `${metric.growth_percentage > 0 ? '+' : ''}${metric.growth_percentage}% ${metric.growth_percentage > 0 ? 'increase' : 'decrease'}`;

      emergingThemes.push({
        ...theme,
        recent_mentions: metric.current_frequency,
        previous_mentions: metric.previous_frequency,
        growth_rate: metric.growth_percentage,
        growth_label: growthLabel,
      });
    }
  }

  return emergingThemes;
}

/**
 * Group themes into clusters based on similarity
 * Uses simple keyword-based clustering
 */
export function groupThemesIntoClusters(
  themes: Theme[],
): Map<string, Theme[]> {
  const clusters = new Map<string, Theme[]>();

  // Define cluster categories based on common patterns
  const clusterDefinitions = [
    {
      name: 'Feature Requests',
      keywords: ['feature', 'add', 'implement', 'support', 'request', 'want', 'need'],
    },
    {
      name: 'Bug Reports',
      keywords: ['bug', 'error', 'crash', 'broken', 'issue', 'problem', 'fail', 'not working'],
    },
    {
      name: 'Performance',
      keywords: ['slow', 'performance', 'speed', 'lag', 'loading', 'fast', 'optimize'],
    },
    {
      name: 'User Experience',
      keywords: ['ui', 'ux', 'design', 'interface', 'confusing', 'difficult', 'usability'],
    },
    {
      name: 'Mobile & Platforms',
      keywords: ['mobile', 'app', 'ios', 'android', 'phone', 'tablet', 'desktop'],
    },
    {
      name: 'Integrations',
      keywords: ['integration', 'connect', 'sync', 'import', 'export', 'api', 'webhook'],
    },
    {
      name: 'Documentation & Support',
      keywords: ['docs', 'documentation', 'help', 'tutorial', 'guide', 'support', 'learning'],
    },
    {
      name: 'Pricing & Billing',
      keywords: ['price', 'pricing', 'cost', 'billing', 'subscription', 'plan', 'payment'],
    },
  ];

  // Assign themes to clusters
  for (const theme of themes) {
    const themeLower = `${theme.theme_name} ${theme.description}`.toLowerCase();
    let assigned = false;

    for (const cluster of clusterDefinitions) {
      if (cluster.keywords.some((keyword) => themeLower.includes(keyword))) {
        const existing = clusters.get(cluster.name) || [];
        existing.push(theme);
        clusters.set(cluster.name, existing);
        assigned = true;
        break;
      }
    }

    // If no cluster matched, add to "Other"
    if (!assigned) {
      const existing = clusters.get('Other') || [];
      existing.push(theme);
      clusters.set('Other', existing);
    }
  }

  return clusters;
}

/**
 * Create theme clusters from grouped themes
 */
export function createThemeClusters(
  themes: Theme[],
  projectId: string,
): Partial<ThemeCluster>[] {
  const grouped = groupThemesIntoClusters(themes);
  const clusters: Partial<ThemeCluster>[] = [];
  const now = new Date().toISOString();

  for (const [clusterName, clusterThemes] of grouped.entries()) {
    if (clusterThemes.length === 0) continue;

    // Generate a description based on the themes in the cluster
    const topThemes = clusterThemes
      .slice(0, 3)
      .map((t) => t.theme_name)
      .join(', ');
    const description = `Cluster containing themes like: ${topThemes}${clusterThemes.length > 3 ? ', and more' : ''}`;

    clusters.push({
      project_id: projectId,
      cluster_name: clusterName,
      description,
      theme_count: clusterThemes.length,
      created_at: now,
      updated_at: now,
    });
  }

  // Sort by theme count (descending)
  clusters.sort((a, b) => (b.theme_count || 0) - (a.theme_count || 0));

  console.log(
    `[CLUSTERING] Created ${clusters.length} clusters from ${themes.length} themes`,
  );

  return clusters;
}

/**
 * Assign themes to clusters
 */
export function assignThemesToClusters(
  themes: Theme[],
  clusters: ThemeCluster[],
): Map<string, string> {
  const themeToClusterMap = new Map<string, string>();
  const clusterMap = new Map<string, ThemeCluster>();

  // Index clusters by name
  for (const cluster of clusters) {
    clusterMap.set(cluster.cluster_name, cluster);
  }

  const grouped = groupThemesIntoClusters(themes);

  for (const [clusterName, clusterThemes] of grouped.entries()) {
    const cluster = clusterMap.get(clusterName);
    if (!cluster) continue;

    for (const theme of clusterThemes) {
      themeToClusterMap.set(theme.id, cluster.id);
    }
  }

  return themeToClusterMap;
}

/**
 * Remove duplicate themes
 * Keeps the theme with higher frequency when duplicates are found
 */
export function deduplicateThemes(themes: Theme[]): Theme[] {
  const themeMap = new Map<string, Theme>();

  for (const theme of themes) {
    const key = theme.theme_name.toLowerCase();
    const existing = themeMap.get(key);

    if (!existing || theme.frequency > existing.frequency) {
      themeMap.set(key, theme);
    }
  }

  return Array.from(themeMap.values());
}

/**
 * Merge similar themes based on name similarity
 * Uses simple string matching
 */
export function mergeSimilarThemes(themes: Theme[]): Theme[] {
  if (themes.length <= 1) return themes;

  const merged: Theme[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < themes.length; i++) {
    if (processed.has(themes[i].id)) continue;

    const currentTheme = themes[i];
    const similar: Theme[] = [currentTheme];

    // Find similar themes
    for (let j = i + 1; j < themes.length; j++) {
      if (processed.has(themes[j].id)) continue;

      if (areThemesSimilar(currentTheme.theme_name, themes[j].theme_name)) {
        similar.push(themes[j]);
        processed.add(themes[j].id);
      }
    }

    if (similar.length === 1) {
      merged.push(currentTheme);
    } else {
      // Merge similar themes
      const mergedTheme = combineThemes(similar);
      merged.push(mergedTheme);
    }

    processed.add(currentTheme.id);
  }

  console.log(
    `[CLUSTERING] Merged ${themes.length} themes into ${merged.length} unique themes`,
  );

  return merged;
}

/**
 * Check if two theme names are similar
 */
function areThemesSimilar(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  // Exact match
  if (n1 === n2) return true;

  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Similar keywords (simple approach)
  const words1 = new Set(n1.split(/\s+/));
  const words2 = new Set(n2.split(/\s+/));

  const commonWords = Array.from(words1).filter((word) => words2.has(word));
  const similarityRatio = commonWords.length / Math.min(words1.size, words2.size);

  return similarityRatio >= 0.6; // 60% similarity threshold
}

/**
 * Combine multiple similar themes into one
 */
function combineThemes(themes: Theme[]): Theme {
  // Use the theme with highest frequency as base
  const base = themes.reduce((prev, current) =>
    current.frequency > prev.frequency ? current : prev,
  );

  // Sum frequencies
  const totalFrequency = themes.reduce((sum, t) => sum + t.frequency, 0);

  // Average sentiment
  const avgSentiment =
    themes.reduce((sum, t) => sum + t.avg_sentiment, 0) / themes.length;

  // Earliest first_seen
  const firstSeen = themes.reduce((earliest, t) =>
    new Date(t.first_seen) < new Date(earliest) ? t.first_seen : earliest,
  base.first_seen);

  // Latest last_seen
  const lastSeen = themes.reduce((latest, t) =>
    new Date(t.last_seen) > new Date(latest) ? t.last_seen : latest,
  base.last_seen);

  return {
    ...base,
    frequency: totalFrequency,
    avg_sentiment: Math.round(avgSentiment * 100) / 100,
    first_seen: firstSeen,
    last_seen: lastSeen,
  };
}

/**
 * Rank themes by importance
 * Considers frequency, sentiment, and recency
 */
export function rankThemes(themes: Theme[]): Theme[] {
  return themes.sort((a, b) => {
    // Primary: Frequency (descending)
    if (a.frequency !== b.frequency) {
      return b.frequency - a.frequency;
    }

    // Secondary: Recency (more recent = higher)
    const aRecent = new Date(a.last_seen).getTime();
    const bRecent = new Date(b.last_seen).getTime();

    if (aRecent !== bRecent) {
      return bRecent - aRecent;
    }

    // Tertiary: Emerging status
    if (a.is_emerging !== b.is_emerging) {
      return a.is_emerging ? -1 : 1;
    }

    // Quaternary: Sentiment (more negative = higher priority for action)
    return a.avg_sentiment - b.avg_sentiment;
  });
}
