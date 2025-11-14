/**
 * Hunter-Theme Integration Bridge
 * Connects Hunter feedback with Theme Detection feature
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Check if theme detection should be triggered
 */
export async function checkThemeDetectionTrigger(
  projectId: string
): Promise<{
  shouldTrigger: boolean;
  pendingCount: number;
  threshold: number;
}> {
  const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

  try {
    // Get hunter config
    const { data: config } = await supabase
      .from('hunter_configs')
      .select('theme_detection_threshold, auto_theme_detection')
      .eq('project_id', projectId)
      .single();

    if (!config || !config.auto_theme_detection) {
      return { shouldTrigger: false, pendingCount: 0, threshold: 0 };
    }

    // Count unanalyzed feedback
    const { count } = await supabase
      .from('discovered_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .is('theme_analyzed_at', null)
      .eq('is_duplicate', false)
      .eq('is_archived', false);

    const pendingCount = count || 0;
    const threshold = config.theme_detection_threshold || 50;

    return {
      shouldTrigger: pendingCount >= threshold,
      pendingCount,
      threshold,
    };
  } catch (error) {
    console.error('[Hunter-Theme] Error checking trigger:', error);
    return { shouldTrigger: false, pendingCount: 0, threshold: 0 };
  }
}

/**
 * Trigger theme detection for hunter feedback
 */
export async function triggerThemeDetection(
  projectId: string
): Promise<{ success: boolean; themesDetected: number }> {
  const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

  try {
    // Get unanalyzed feedback
    const { data: feedback } = await supabase
      .from('discovered_feedback')
      .select('id, content, title, classification')
      .eq('project_id', projectId)
      .is('theme_analyzed_at', null)
      .eq('is_duplicate', false)
      .eq('is_archived', false)
      .limit(200); // Limit to prevent overwhelming the system

    if (!feedback || feedback.length === 0) {
      return { success: false, themesDetected: 0 };
    }

    // TODO: Call the theme detection API
    // This would integrate with the existing theme detection feature
    // For now, we just mark items as analyzed

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('discovered_feedback')
      .update({ theme_analyzed_at: now })
      .in(
        'id',
        feedback.map((f) => f.id)
      );

    if (error) {
      throw error;
    }

    console.log(
      `[Hunter-Theme] Marked ${feedback.length} items for theme analysis`
    );

    return { success: true, themesDetected: 0 };
  } catch (error) {
    console.error('[Hunter-Theme] Error triggering detection:', error);
    return { success: false, themesDetected: 0 };
  }
}

/**
 * Get themes from hunter feedback
 */
export async function getHunterThemes(projectId: string): Promise<{
  themes: Array<{
    theme: string;
    count: number;
    platforms: string[];
    avgSentiment: number;
  }>;
}> {
  const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

  try {
    // Get feedback with themes
    const { data: feedback } = await supabase
      .from('discovered_feedback')
      .select('tags, platform, sentiment_score')
      .eq('project_id', projectId)
      .not('tags', 'is', null)
      .not('theme_analyzed_at', 'is', null);

    if (!feedback || feedback.length === 0) {
      return { themes: [] };
    }

    // Aggregate themes
    const themeMap = new Map<
      string,
      {
        count: number;
        platforms: Set<string>;
        sentiments: number[];
      }
    >();

    for (const item of feedback) {
      const tags = item.tags || [];
      const platform = item.platform;
      const sentiment = item.sentiment_score || 0;

      for (const tag of tags) {
        if (!themeMap.has(tag)) {
          themeMap.set(tag, {
            count: 0,
            platforms: new Set(),
            sentiments: [],
          });
        }

        const themeData = themeMap.get(tag)!;
        themeData.count++;
        themeData.platforms.add(platform);
        themeData.sentiments.push(sentiment);
      }
    }

    // Convert to array and calculate averages
    const themes = Array.from(themeMap.entries())
      .map(([theme, data]) => ({
        theme,
        count: data.count,
        platforms: Array.from(data.platforms),
        avgSentiment:
          data.sentiments.reduce((sum, s) => sum + s, 0) /
          data.sentiments.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 themes

    return { themes };
  } catch (error) {
    console.error('[Hunter-Theme] Error getting themes:', error);
    return { themes: [] };
  }
}
