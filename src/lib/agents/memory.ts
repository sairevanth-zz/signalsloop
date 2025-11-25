import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { generateEmbedding } from '@/lib/specs/embeddings';

export interface AgentMemoryRecord {
  id: string;
  agent_name: string;
  memory_type: string;
  content: string;
  metadata?: Record<string, any>;
  similarity?: number;
  created_at: string;
}

export interface SearchAgentMemoryParams {
  projectId: string;
  query: string;
  embedding?: number[];
  agentNames?: string[];
  limit?: number;
  minImportance?: number;
  similarityThreshold?: number;
}

export interface RecordAgentMemoryParams {
  projectId: string;
  agentName: string;
  content: string;
  memoryType?: 'observation' | 'decision' | 'spec_context' | 'alert';
  metadata?: Record<string, any>;
  sourceId?: string;
  sourceType?: string;
  importance?: number;
  embeddingText?: string;
  embedding?: number[];
}

/**
 * Store a memory entry for an agent, optionally vectorizing the content.
 */
export async function recordAgentMemory(params: RecordAgentMemoryParams): Promise<string | null> {
  const supabase = getServiceRoleClient();
  const {
    projectId,
    agentName,
    content,
    memoryType = 'observation',
    metadata = {},
    sourceId,
    sourceType,
    importance = 1,
    embeddingText,
    embedding: providedEmbedding,
  } = params;

  let embedding: number[] | null = providedEmbedding || null;

  if (!embedding) {
    try {
      embedding = await generateEmbedding(embeddingText || content);
    } catch (error) {
      console.error('[Agent Memory] Failed to generate embedding, storing without vector:', error);
    }
  }

  const clampedImportance = Math.max(1, Math.min(5, importance));

  const { data, error } = await supabase
    .from('agent_memory')
    .insert({
      project_id: projectId,
      agent_name: agentName,
      memory_type: memoryType,
      content,
      embedding,
      metadata,
      source_id: sourceId,
      source_type: sourceType,
      importance: clampedImportance,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Agent Memory] Failed to record memory:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Retrieve relevant agent memories using vector similarity.
 */
export async function searchAgentMemory(params: SearchAgentMemoryParams): Promise<AgentMemoryRecord[]> {
  const {
    projectId,
    query,
    embedding,
    agentNames,
    limit = 6,
    minImportance = 1,
    similarityThreshold = 0.6,
  } = params;

  const supabase = getServiceRoleClient();
  let queryEmbedding = embedding;

  if (!queryEmbedding) {
    try {
      queryEmbedding = await generateEmbedding(query);
    } catch (error) {
      console.error('[Agent Memory] Failed to generate query embedding:', error);
      return [];
    }
  }

  if (!queryEmbedding) {
    return [];
  }

  const { data, error } = await supabase.rpc('search_agent_memory', {
    p_project_id: projectId,
    p_query_embedding: queryEmbedding,
    p_agent_names: agentNames || null,
    p_limit: limit,
    p_min_importance: minImportance,
    p_similarity_threshold: similarityThreshold,
  });

  if (error) {
    console.error('[Agent Memory] Failed to search memory:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    agent_name: row.agent_name,
    memory_type: row.memory_type,
    content: row.content,
    metadata: row.metadata || {},
    similarity: row.similarity,
    created_at: row.created_at,
  }));
}

/**
 * Format memory records into a compact string for prompts.
 */
export function formatMemoryContext(memories: AgentMemoryRecord[]): string {
  if (!memories || memories.length === 0) {
    return '';
  }

  return memories
    .map((memory) => {
      const relevance = memory.similarity ? ` (${Math.round(memory.similarity * 100)}% match)` : '';
      return `- [${memory.agent_name}${relevance}] ${memory.content}`;
    })
    .join('\n');
}
