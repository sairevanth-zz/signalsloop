/**
 * RAG Context Retrieval for Spec Generation
 */

import { getSupabaseServerClient } from '../supabase-client';
import { generateEmbedding } from './embeddings';
import type {
  RetrievedContext,
  PastSpecContext,
  PersonaContext,
  CompetitorContext,
  FeedbackContext,
} from '@/types/specs';

// ============================================================================
// Main Context Retrieval Function
// ============================================================================

/**
 * Retrieve relevant context for spec generation using vector similarity
 */
export async function retrieveContext(
  projectId: string,
  query: string,
  limit: number = 10
): Promise<RetrievedContext> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error('Database connection not available');
  }

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Retrieve different types of context in parallel
  const [pastSpecs, personas, competitors, relatedFeedback] = await Promise.all([
    retrievePastSpecs(projectId, queryEmbedding, Math.ceil(limit * 0.4)),
    retrievePersonas(projectId, query, Math.ceil(limit * 0.2)),
    retrieveCompetitors(projectId, query, Math.ceil(limit * 0.2)),
    retrieveRelatedFeedback(projectId, queryEmbedding, Math.ceil(limit * 0.2)),
  ]);

  return {
    pastSpecs,
    personas,
    competitors,
    relatedFeedback,
  };
}

// ============================================================================
// Past Specs Retrieval
// ============================================================================

/**
 * Retrieve similar past specs using vector similarity
 */
async function retrievePastSpecs(
  projectId: string,
  queryEmbedding: number[],
  limit: number
): Promise<PastSpecContext[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  try {
    // Query spec_embeddings table for similar specs
    const { data, error } = await supabase.rpc('search_similar_specs', {
      p_project_id: projectId,
      p_query_embedding: queryEmbedding,
      p_limit: limit,
      p_similarity_threshold: 0.7, // Only return specs with >70% similarity
    });

    if (error) {
      console.error('Error retrieving past specs:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map((row: any) => ({
      id: row.spec_id,
      title: row.title,
      preview: row.preview,
      relevanceScore: row.similarity,
      created_at: row.created_at,
    }));
  } catch (error) {
    console.error('Error in retrievePastSpecs:', error);
    return [];
  }
}

// ============================================================================
// Personas Retrieval
// ============================================================================

/**
 * Retrieve relevant personas for the project
 */
async function retrievePersonas(
  projectId: string,
  query: string,
  limit: number
): Promise<PersonaContext[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  try {
    // Search personas using full-text search on name and description
    const { data, error } = await supabase
      .from('personas')
      .select('id, name, description')
      .eq('project_id', projectId)
      .limit(limit);

    if (error) {
      console.error('Error retrieving personas:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Simple relevance scoring based on keyword matching
    return data
      .map((persona) => ({
        id: persona.id,
        name: persona.name,
        description: persona.description,
        relevanceScore: calculateTextRelevance(query, `${persona.name} ${persona.description}`),
      }))
      .filter((p) => p.relevanceScore > 0.1) // Filter out irrelevant personas
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  } catch (error) {
    console.error('Error in retrievePersonas:', error);
    return [];
  }
}

// ============================================================================
// Competitors Retrieval
// ============================================================================

/**
 * Retrieve relevant competitor features
 */
async function retrieveCompetitors(
  projectId: string,
  query: string,
  limit: number
): Promise<CompetitorContext[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  try {
    // Retrieve competitor features from competitive_insights table
    const { data, error } = await supabase
      .from('competitive_insights')
      .select('id, competitor_name, insight_type, description')
      .eq('project_id', projectId)
      .eq('insight_type', 'feature') // Focus on features
      .limit(limit * 2); // Get more to filter

    if (error) {
      console.error('Error retrieving competitors:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Score and filter by relevance
    return data
      .map((insight) => ({
        id: insight.id,
        name: insight.competitor_name,
        feature: insight.insight_type,
        description: insight.description,
        relevanceScore: calculateTextRelevance(query, insight.description),
      }))
      .filter((c) => c.relevanceScore > 0.1)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  } catch (error) {
    console.error('Error in retrieveCompetitors:', error);
    return [];
  }
}

// ============================================================================
// Related Feedback Retrieval
// ============================================================================

/**
 * Retrieve related feedback using vector similarity
 */
async function retrieveRelatedFeedback(
  projectId: string,
  queryEmbedding: number[],
  limit: number
): Promise<FeedbackContext[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  try {
    // Query posts_embeddings table for similar feedback
    const { data, error } = await supabase.rpc('search_similar_feedback', {
      p_project_id: projectId,
      p_query_embedding: queryEmbedding,
      p_limit: limit,
      p_similarity_threshold: 0.65, // Slightly lower threshold for feedback
    });

    if (error) {
      console.error('Error retrieving related feedback:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map((row: any) => ({
      id: row.post_id,
      content: row.content,
      votes: row.votes || 0,
      segment: row.segment,
      relevanceScore: row.similarity,
    }));
  } catch (error) {
    console.error('Error in retrieveRelatedFeedback:', error);
    return [];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate simple text relevance score using keyword matching
 * Returns a score between 0 and 1
 */
function calculateTextRelevance(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const textLower = text.toLowerCase();

  if (queryWords.length === 0) {
    return 0;
  }

  const matches = queryWords.filter(word => textLower.includes(word)).length;
  return matches / queryWords.length;
}

// ============================================================================
// Database Functions (to be created in Supabase)
// ============================================================================

/*
  These database functions need to be created in Supabase:

  1. search_similar_specs:
     - Takes project_id, query_embedding, limit, similarity_threshold
     - Returns specs with similarity scores

  2. search_similar_feedback:
     - Takes project_id, query_embedding, limit, similarity_threshold
     - Returns feedback with similarity scores

  SQL for these functions should be added to the migration file.
*/
