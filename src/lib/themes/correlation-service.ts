/**
 * Theme Correlation Service
 * 
 * Analyzes relationships between feedback themes to surface:
 * - Themes that frequently appear together
 * - Themes with opposing sentiment patterns
 * - Causal relationships (Theme A leads to Theme B)
 * - Thematic clusters
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { complete } from '@/lib/ai/router';
import type {
    ThemeCorrelation,
    ThemeNetwork,
    ThemeNode,
    ThemeEdge,
    CorrelationInsight,
    CorrelationAnalysis
} from '@/types/theme-correlation';

const MIN_COOCCURRENCES = 3; // Minimum posts for valid correlation
const CORRELATION_THRESHOLD = 0.3; // Minimum correlation score to include

/**
 * Calculate correlations between all themes in a project
 */
export async function calculateThemeCorrelations(
    projectId: string
): Promise<CorrelationAnalysis> {
    const supabase = getServiceRoleClient();
    if (!supabase) throw new Error('Database unavailable');

    console.log(`[ThemeCorrelation] Analyzing themes for project ${projectId}`);

    // 1. Get all themes for the project
    const { data: themes } = await supabase
        .from('themes')
        .select('id, theme_name, frequency, avg_sentiment')
        .eq('project_id', projectId)
        .order('frequency', { ascending: false })
        .limit(50);

    if (!themes || themes.length < 2) {
        return {
            projectId,
            network: { nodes: [], edges: [], clusters: [] },
            correlations: [],
            insights: [],
            analyzedAt: new Date()
        };
    }

    // 2. Get posts with their theme assignments
    const { data: posts } = await supabase
        .from('posts')
        .select('id, theme_ids, sentiment_score, created_at')
        .eq('project_id', projectId)
        .not('theme_ids', 'is', null);

    if (!posts || posts.length < 10) {
        return {
            projectId,
            network: {
                nodes: themes.map(t => ({
                    id: t.id,
                    name: t.theme_name,
                    frequency: t.frequency,
                    sentiment: t.avg_sentiment || 0
                })), edges: [], clusters: []
            },
            correlations: [],
            insights: [],
            analyzedAt: new Date()
        };
    }

    // 3. Build co-occurrence matrix
    const coOccurrences = new Map<string, Map<string, string[]>>();

    for (const theme of themes) {
        coOccurrences.set(theme.id, new Map());
    }

    for (const post of posts) {
        const postThemes = post.theme_ids as string[];
        if (!postThemes || postThemes.length < 2) continue;

        // For each pair of themes in this post
        for (let i = 0; i < postThemes.length; i++) {
            for (let j = i + 1; j < postThemes.length; j++) {
                const t1 = postThemes[i];
                const t2 = postThemes[j];

                if (!coOccurrences.has(t1) || !coOccurrences.has(t2)) continue;

                // Add to both directions
                const t1Map = coOccurrences.get(t1)!;
                if (!t1Map.has(t2)) t1Map.set(t2, []);
                t1Map.get(t2)!.push(post.id);

                const t2Map = coOccurrences.get(t2)!;
                if (!t2Map.has(t1)) t2Map.set(t1, []);
                t2Map.get(t1)!.push(post.id);
            }
        }
    }

    // 4. Calculate correlation scores
    const correlations: ThemeCorrelation[] = [];
    const themeMap = new Map(themes.map(t => [t.id, t]));
    const processedPairs = new Set<string>();

    for (const [themeId1, relations] of coOccurrences) {
        for (const [themeId2, postIds] of relations) {
            const pairKey = [themeId1, themeId2].sort().join('-');
            if (processedPairs.has(pairKey)) continue;
            processedPairs.add(pairKey);

            if (postIds.length < MIN_COOCCURRENCES) continue;

            const theme1 = themeMap.get(themeId1);
            const theme2 = themeMap.get(themeId2);
            if (!theme1 || !theme2) continue;

            // Calculate Jaccard similarity
            const t1Posts = posts.filter(p => (p.theme_ids as string[])?.includes(themeId1));
            const t2Posts = posts.filter(p => (p.theme_ids as string[])?.includes(themeId2));
            const intersection = postIds.length;
            const union = t1Posts.length + t2Posts.length - intersection;

            const correlationScore = union > 0 ? intersection / union : 0;

            if (correlationScore < CORRELATION_THRESHOLD) continue;

            // Determine correlation type based on sentiment patterns
            const t1Sentiment = theme1.avg_sentiment || 0;
            const t2Sentiment = theme2.avg_sentiment || 0;
            const sentimentDiff = Math.abs(t1Sentiment - t2Sentiment);

            const correlationType: 'positive' | 'negative' | 'neutral' =
                sentimentDiff > 0.5 ? 'negative' :
                    sentimentDiff < 0.2 ? 'positive' : 'neutral';

            correlations.push({
                themeId1,
                themeName1: theme1.theme_name,
                themeId2,
                themeName2: theme2.theme_name,
                correlationScore,
                correlationType,
                coOccurrences: postIds.length,
                samplePosts: postIds.slice(0, 3)
            });
        }
    }

    // Sort by correlation strength
    correlations.sort((a, b) => b.correlationScore - a.correlationScore);

    // 5. Build network
    const nodes: ThemeNode[] = themes.map(t => ({
        id: t.id,
        name: t.theme_name,
        frequency: t.frequency,
        sentiment: t.avg_sentiment || 0
    }));

    const edges: ThemeEdge[] = correlations.map(c => ({
        source: c.themeId1,
        target: c.themeId2,
        weight: c.correlationScore,
        type: c.correlationType === 'negative' ? 'negative' : 'positive'
    }));

    // 6. Generate insights
    const insights = await generateCorrelationInsights(correlations, themes);

    console.log(`[ThemeCorrelation] Found ${correlations.length} correlations, ${insights.length} insights`);

    return {
        projectId,
        network: { nodes, edges, clusters: [] },
        correlations: correlations.slice(0, 20), // Top 20
        insights,
        analyzedAt: new Date()
    };
}

/**
 * Generate actionable insights from correlations
 */
async function generateCorrelationInsights(
    correlations: ThemeCorrelation[],
    themes: { id: string; theme_name: string; frequency: number }[]
): Promise<CorrelationInsight[]> {
    const insights: CorrelationInsight[] = [];

    // Find hub themes (appear in many correlations)
    const themeCounts = new Map<string, number>();
    for (const c of correlations) {
        themeCounts.set(c.themeId1, (themeCounts.get(c.themeId1) || 0) + 1);
        themeCounts.set(c.themeId2, (themeCounts.get(c.themeId2) || 0) + 1);
    }

    const sortedThemes = [...themeCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    for (const [themeId, count] of sortedThemes) {
        if (count < 3) continue;

        const theme = themes.find(t => t.id === themeId);
        if (!theme) continue;

        const relatedCorrelations = correlations.filter(
            c => c.themeId1 === themeId || c.themeId2 === themeId
        );
        const relatedThemes = relatedCorrelations.map(c =>
            c.themeId1 === themeId ? c.themeName2 : c.themeName1
        );

        insights.push({
            type: 'driver',
            title: `"${theme.theme_name}" is a central theme`,
            description: `This theme correlates with ${count} other themes: ${relatedThemes.slice(0, 3).join(', ')}. Addressing it may impact multiple areas.`,
            themeIds: [themeId, ...relatedCorrelations.map(c => c.themeId1 === themeId ? c.themeId2 : c.themeId1)],
            actionable: true,
            suggestedAction: `Prioritize "${theme.theme_name}" to create cascading improvements`
        });
    }

    // Find opposing themes
    const opposing = correlations.filter(c => c.correlationType === 'negative').slice(0, 2);
    for (const c of opposing) {
        insights.push({
            type: 'opposing',
            title: `"${c.themeName1}" vs "${c.themeName2}"`,
            description: `These themes have opposing sentiment patterns. Users who mention one often have different feelings about the other.`,
            themeIds: [c.themeId1, c.themeId2],
            actionable: true,
            suggestedAction: `Investigate if these represent different user segments or conflicting needs`
        });
    }

    // Find strongly correlated clusters
    const strongCorrelations = correlations.filter(c => c.correlationScore > 0.5).slice(0, 2);
    for (const c of strongCorrelations) {
        insights.push({
            type: 'cluster',
            title: `Strong link: "${c.themeName1}" ↔ "${c.themeName2}"`,
            description: `These themes appear together in ${c.coOccurrences} pieces of feedback. They may be part of the same user journey.`,
            themeIds: [c.themeId1, c.themeId2],
            actionable: true,
            suggestedAction: `Consider addressing these together as a single initiative`
        });
    }

    return insights;
}

/**
 * Get cached or fresh correlation analysis
 */
export async function getCorrelationAnalysis(
    projectId: string,
    maxAgeMinutes: number = 60
): Promise<CorrelationAnalysis> {
    // For now, always calculate fresh
    // TODO: Add caching layer
    return calculateThemeCorrelations(projectId);
}
