/**
 * Context Retrieval for Ask SignalsLoop Anything
 * Retrieves relevant context based on query type using semantic search and database queries
 */

import { getSupabaseServerClient } from '@/lib/supabase-client';
import { generateEmbedding } from '@/lib/specs/embeddings';
import type { MessageSource, QueryType, ExtractedEntities } from '@/types/ask';

// ============================================================================
// Type Definitions
// ============================================================================

export interface RetrievalResult {
  context: string;
  sources: MessageSource[];
}

interface SemanticSearchRow {
  feedback_id: string;
  content: string;
  title: string;
  status: string;
  category: string;
  upvotes: number;
  created_at: string;
  similarity: number;
}

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * Generate embedding for text using OpenAI text-embedding-3-small
 *
 * @param text - Text to generate embedding for
 * @returns Vector embedding as number array (1536 dimensions)
 */
export async function generateQueryEmbedding(text: string): Promise<number[]> {
  return generateEmbedding(text);
}

// ============================================================================
// Semantic Search
// ============================================================================

/**
 * Search feedback using semantic similarity
 *
 * @param projectId - Project UUID
 * @param query - Search query text
 * @param limit - Maximum number of results (default: 10)
 * @returns Context string and source references
 */
export async function searchFeedbackSemantic(
  projectId: string,
  query: string,
  limit: number = 10
): Promise<RetrievalResult> {
  try {
    // Temporary safety: skip semantic search entirely if the vector function/index isn't available
    // (e.g., missing columns like p.upvotes). This prevents hard failures until the DB function is fixed.
    if (process.env.ASK_SEMANTIC_DISABLED !== 'false') {
      return {
        context: 'Semantic search is temporarily disabled. You can still ask about sentiment trends, themes, or provide more context.',
        sources: [],
      };
    }

    const supabase = getSupabaseServerClient();

    if (!supabase) {
      throw new Error('Database connection not available');
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Call the database function for semantic search
    const { data, error } = await supabase.rpc('search_feedback_semantic', {
      query_embedding: queryEmbedding,
      p_project_id: projectId,
      match_threshold: 0.7,
      match_count: limit,
    });

    if (error) {
      console.error('Error in semantic search:', error);
      return {
        context: 'Semantic search is currently unavailable. Try asking about sentiment, themes, or provide more context.',
        sources: [],
      };
    }

    if (!data || data.length === 0) {
      return {
        context: 'No relevant feedback found for this query.',
        sources: [],
      };
    }

    // Format context string
    const contextParts = data.map((row: SemanticSearchRow, index: number) => {
      return `[${index + 1}] ${row.title}\n` +
        `Status: ${row.status} | Category: ${row.category || 'N/A'} | Votes: ${row.upvotes ?? 0}\n` +
        `${row.content}\n` +
        `(Similarity: ${(row.similarity * 100).toFixed(1)}%)\n`;
    });

    const context = contextParts.join('\n---\n\n');

    // Create source references
    const sources: MessageSource[] = data.map((row: SemanticSearchRow) => ({
      type: 'feedback',
      id: row.feedback_id,
      title: row.title,
      preview: row.content.substring(0, 150) + (row.content.length > 150 ? '...' : ''),
      similarity: row.similarity,
    }));

    return { context, sources };

  } catch (error) {
    console.error('Error in searchFeedbackSemantic:', error);
    return {
      context: 'Unable to retrieve specific feedback right now. Try asking about sentiment, themes, or provide more context.',
      sources: [],
    };
  }
}

// ============================================================================
// Sentiment Context
// ============================================================================

/**
 * Get sentiment analysis context for the project
 *
 * @param projectId - Project UUID
 * @param timeRange - Optional time range filter (in days, default: 30)
 * @returns Formatted context string with sentiment statistics
 */
export async function getSentimentContext(
  projectId: string,
  timeRange?: { days?: number; start?: string; end?: string }
): Promise<RetrievalResult> {
  try {
    const supabase = getSupabaseServerClient();

    if (!supabase) {
      throw new Error('Database connection not available');
    }
    const days = timeRange?.days || 30;

    // Get sentiment distribution using the database function
    const { data: distribution, error: distError } = await supabase
      .rpc('get_sentiment_distribution', {
        p_project_id: projectId,
        p_days_ago: days,
      });

    if (distError) {
      console.error('Error getting sentiment distribution:', distError);
    }

    // Fetch relevant post IDs for this project
    const { data: projectPosts, error: postsError } = await supabase
      .from('posts')
      .select('id')
      .eq('project_id', projectId);

    if (postsError) {
      console.error('Error getting posts for sentiment:', postsError);
    }

    const postIds = projectPosts?.map((post: { id: string }) => post.id) || [];

    let sentimentData: Array<{
      sentiment_category: string | null;
      sentiment_score: string | number | null;
      emotional_tone?: string | null;
    }> = [];

    if (postIds.length > 0) {
      // Get overall sentiment stats
      const { data, error: sentError } = await supabase
        .from('sentiment_analysis')
        .select('sentiment_category, sentiment_score, emotional_tone, post_id')
        .in('post_id', postIds)
        .gte('analyzed_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (sentError) {
        console.error('Error getting sentiment data:', sentError);
      } else if (data) {
        sentimentData = data;
      }
    }

    // Calculate statistics
    const totalFeedback = distribution?.reduce((sum: number, row: any) => sum + parseInt(row.count), 0) || 0;

    let avgSentimentScore = 0;
    if (sentimentData && sentimentData.length > 0) {
      const sum = sentimentData.reduce((acc: number, row: any) => acc + parseFloat(row.sentiment_score || 0), 0);
      avgSentimentScore = sum / sentimentData.length;
    }

    // Build context string
    let context = `## Sentiment Analysis (Last ${days} Days)\n\n`;
    context += `Total Feedback Analyzed: ${totalFeedback}\n`;
    context += `Average Sentiment Score: ${avgSentimentScore.toFixed(2)} (-1 to 1 scale)\n\n`;

    if (distribution && distribution.length > 0) {
      context += `### Sentiment Distribution:\n`;
      distribution.forEach((row: any) => {
        context += `- ${row.sentiment_category}: ${row.count} (${row.percentage}%)\n`;
      });
    }

    // Extract common emotional tones
    if (sentimentData && sentimentData.length > 0) {
      const tones = sentimentData
        .filter((row: any) => row.emotional_tone)
        .map((row: any) => row.emotional_tone)
        .slice(0, 5);

      if (tones.length > 0) {
        context += `\n### Common Emotional Tones:\n`;
        context += tones.map((tone: string) => `- ${tone}`).join('\n');
      }
    }

    return {
      context,
      sources: [{
        type: 'metric',
        id: 'sentiment-analysis',
        title: `Sentiment Analysis (${days} days)`,
        preview: `${totalFeedback} items analyzed`,
      }],
    };

  } catch (error) {
    console.error('Error in getSentimentContext:', error);
    return {
      context: 'Unable to retrieve sentiment data.',
      sources: [],
    };
  }
}

// ============================================================================
// Competitive Context
// ============================================================================

/**
 * Get competitive intelligence context
 *
 * @param projectId - Project UUID
 * @param competitors - Optional array of competitor names to filter by
 * @returns Formatted context string with competitor mentions
 */
export async function getCompetitiveContext(
  projectId: string,
  competitors?: string[]
): Promise<RetrievalResult> {
  try {
    const supabase = getSupabaseServerClient();

    if (!supabase) {
      throw new Error('Database connection not available');
    }
    // Build query for competitors
    let competitorQuery = supabase
      .from('competitors')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('total_mentions', { ascending: false })
      .limit(10);

    // Filter by specific competitors if provided
    if (competitors && competitors.length > 0) {
      competitorQuery = competitorQuery.in('name', competitors);
    }

    const { data: competitorData, error: compError } = await competitorQuery;

    if (compError) {
      console.error('Error getting competitor data:', compError);
      return {
        context: 'No competitive intelligence data available.',
        sources: [],
      };
    }

    if (!competitorData || competitorData.length === 0) {
      return {
        context: 'No competitor mentions found.',
        sources: [],
      };
    }

    // Get recent competitive mentions
    const competitorIds = competitorData.map(c => c.id);
    const { data: mentions, error: mentionError } = await supabase
      .from('competitive_mentions')
      .select('*, discovered_feedback(title, content, platform)')
      .in('competitor_id', competitorIds)
      .order('created_at', { ascending: false })
      .limit(20);

    if (mentionError) {
      console.error('Error getting competitive mentions:', mentionError);
    }

    // Build context string
    let context = `## Competitive Intelligence\n\n`;
    context += `Active Competitors Being Monitored: ${competitorData.length}\n\n`;

    competitorData.forEach((comp: any) => {
      context += `### ${comp.name}\n`;
      context += `- Category: ${comp.category || 'N/A'}\n`;
      context += `- Total Mentions: ${comp.total_mentions}\n`;
      context += `- Sentiment vs You: ${comp.avg_sentiment_vs_you?.toFixed(2) || 'N/A'}\n`;
      context += `- Sentiment About Them: ${comp.avg_sentiment_about_them?.toFixed(2) || 'N/A'}\n`;
      context += `- Switches to You: ${comp.switches_to_you || 0}\n`;
      context += `- Switches from You: ${comp.switches_from_you || 0}\n\n`;
    });

    // Add sample mentions if available
    if (mentions && mentions.length > 0) {
      context += `### Recent Mentions:\n\n`;
      mentions.slice(0, 5).forEach((mention: any) => {
        context += `- ${mention.mention_type}: "${mention.context_snippet || mention.discovered_feedback?.content?.substring(0, 150)}"\n`;
      });
    }

    const sources: MessageSource[] = competitorData.map((comp: any) => ({
      type: 'competitor',
      id: comp.id,
      title: comp.name,
      preview: `${comp.total_mentions} mentions`,
    }));

    return { context, sources };

  } catch (error) {
    console.error('Error in getCompetitiveContext:', error);
    return {
      context: 'Unable to retrieve competitive data.',
      sources: [],
    };
  }
}

// ============================================================================
// Themes Context
// ============================================================================

/**
 * Get detected themes context
 *
 * @param projectId - Project UUID
 * @returns Formatted context string with top themes
 */
export async function getThemesContext(projectId: string): Promise<RetrievalResult> {
  try {
    const supabase = getSupabaseServerClient();

    if (!supabase) {
      throw new Error('Database connection not available');
    }
    // Get top themes ordered by frequency
    const { data: themes, error } = await supabase
      .from('themes')
      .select('*')
      .eq('project_id', projectId)
      .order('frequency', { ascending: false })
      .limit(15);

    if (error) {
      console.error('Error getting themes:', error);
      return {
        context: 'No theme data available.',
        sources: [],
      };
    }

    if (!themes || themes.length === 0) {
      return {
        context: 'No themes have been detected yet.',
        sources: [],
      };
    }

    // Build context string
    let context = `## Detected Themes\n\n`;
    context += `Total Themes Identified: ${themes.length}\n\n`;

    themes.forEach((theme: any, index: number) => {
      const emoji = theme.is_emerging ? '🔥 ' : '';
      context += `${index + 1}. ${emoji}${theme.theme_name}\n`;
      context += `   - Description: ${theme.description}\n`;
      context += `   - Frequency: ${theme.frequency} mentions\n`;
      context += `   - Avg Sentiment: ${theme.avg_sentiment?.toFixed(2) || 'N/A'}\n`;

      if (theme.is_emerging) {
        context += `   - Status: Emerging Theme 🔥\n`;
      }

      context += `\n`;
    });

    const sources: MessageSource[] = themes.map((theme: any) => ({
      type: 'theme',
      id: theme.id,
      title: theme.theme_name,
      preview: `${theme.frequency} mentions`,
    }));

    return { context, sources };

  } catch (error) {
    console.error('Error in getThemesContext:', error);
    return {
      context: 'Unable to retrieve theme data.',
      sources: [],
    };
  }
}

// ============================================================================
// Main Orchestrator
// ============================================================================

/**
 * Main context retrieval orchestrator
 * Routes to appropriate retrieval functions based on query type
 *
 * @param projectId - Project UUID
 * @param queryType - Classified query type
 * @param searchQuery - Rewritten search query from classifier
 * @param entities - Extracted entities from query
 * @returns Combined context and sources
 */
export async function retrieveContext(
  projectId: string,
  queryType: QueryType,
  searchQuery: string,
  entities: ExtractedEntities
): Promise<RetrievalResult> {
  try {
    switch (queryType) {
      case 'feedback': {
        // Search for specific feedback using semantic search
        return await searchFeedbackSemantic(projectId, searchQuery, 10);
      }

      case 'sentiment': {
        // Get sentiment analysis context
        const timeRange = entities.timeRange?.relative
          ? parseDaysFromRelative(entities.timeRange.relative)
          : undefined;

        return await getSentimentContext(projectId, { days: timeRange });
      }

      case 'competitive': {
        // Get competitive intelligence context
        return await getCompetitiveContext(projectId, entities.competitors);
      }

      case 'themes': {
        // Get detected themes
        return await getThemesContext(projectId);
      }

      case 'metrics':
      case 'actions': {
        // Combine feedback, sentiment, and themes for comprehensive view
        const [feedbackResult, sentimentResult, themesResult] = await Promise.all([
          searchFeedbackSemantic(projectId, searchQuery, 5),
          getSentimentContext(projectId, { days: 30 }),
          getThemesContext(projectId),
        ]);

        const combinedContext =
          `${sentimentResult.context}\n\n---\n\n` +
          `${themesResult.context}\n\n---\n\n` +
          `## Relevant Feedback\n\n${feedbackResult.context}`;

        const combinedSources = [
          ...sentimentResult.sources,
          ...themesResult.sources,
          ...feedbackResult.sources,
        ];

        return {
          context: combinedContext,
          sources: combinedSources,
        };
      }

      case 'general':
      default: {
        // For general queries, return minimal context or help text
        return {
          context: 'I can help you analyze feedback, sentiment, themes, competitors, and metrics. What would you like to know?',
          sources: [],
        };
      }
    }
  } catch (error) {
    console.error('Error in retrieveContext:', error);
    throw error;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse relative time expressions to days
 */
function parseDaysFromRelative(relative: string): number {
  const lower = relative.toLowerCase();

  if (lower.includes('week')) {
    const match = lower.match(/(\d+)\s*week/);
    return match ? parseInt(match[1]) * 7 : 7;
  }

  if (lower.includes('month')) {
    const match = lower.match(/(\d+)\s*month/);
    return match ? parseInt(match[1]) * 30 : 30;
  }

  if (lower.includes('day')) {
    const match = lower.match(/(\d+)\s*day/);
    return match ? parseInt(match[1]) : 1;
  }

  if (lower.includes('today')) {
    return 1;
  }

  if (lower.includes('yesterday')) {
    return 2;
  }

  // Default to 30 days
  return 30;
}
