import { generateEmbeddingsBatch, generateContentHash } from '@/lib/specs/embeddings';
import { generateProjectEmbeddings, getServiceRoleClient } from './embeddings';

type EmbeddingSummary = {
  success: number;
  errors: number;
  total: number;
  skipped: number;
};

export interface ExpandedEmbeddingResult {
  feedback: EmbeddingSummary;
  roadmap: EmbeddingSummary;
  competitors: EmbeddingSummary;
  personas: EmbeddingSummary;
  productDocs: EmbeddingSummary;
}

interface EmbeddingCandidate {
  id: string;
  text: string;
  hash: string;
  projectId: string;
}

const BATCH_SIZE = 20;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function trimText(text: string, limit: number = 2000): string {
  return text.length > limit ? text.substring(0, limit) : text;
}

function prepareRoadmapForEmbedding(item: {
  recommendation_text?: string | null;
  why_matters?: string | null;
  implementation_strategy?: string | null;
  user_segments_affected?: string | null;
  priority_level?: string | null;
  status?: string | null;
}): string {
  const parts = [
    `Roadmap priority: ${item.priority_level ?? 'unknown'} | Status: ${item.status ?? 'unknown'}`,
    item.recommendation_text ? `Recommendation: ${item.recommendation_text}` : null,
    item.why_matters ? `Why it matters: ${item.why_matters}` : null,
    item.implementation_strategy ? `Implementation: ${item.implementation_strategy}` : null,
    item.user_segments_affected ? `Segments: ${item.user_segments_affected}` : null,
  ].filter(Boolean);

  return trimText(parts.join('\n\n'));
}

function prepareCompetitorForEmbedding(item: {
  name: string;
  category?: string | null;
  description?: string | null;
  status?: string | null;
  total_mentions?: number | null;
  avg_sentiment_vs_you?: string | number | null;
  avg_sentiment_about_them?: string | number | null;
}): string {
  const parts = [
    `Competitor: ${item.name}`,
    `Category: ${item.category ?? 'unspecified'} | Status: ${item.status ?? 'monitoring'}`,
    `Mentions: ${item.total_mentions ?? 0} | Sentiment vs you: ${item.avg_sentiment_vs_you ?? 'n/a'} | Sentiment about them: ${item.avg_sentiment_about_them ?? 'n/a'}`,
    item.description ? `Description: ${item.description}` : null,
  ].filter(Boolean);

  return trimText(parts.join('\n\n'));
}

function preparePersonaForEmbedding(item: {
  name: string;
  role?: string | null;
  description?: string | null;
  goals?: string | null;
  pain_points?: string | null;
}): string {
  const parts = [
    `Persona: ${item.name} (${item.role ?? 'role not set'})`,
    item.description ? `Description: ${item.description}` : null,
    item.goals ? `Goals: ${item.goals}` : null,
    item.pain_points ? `Pain Points: ${item.pain_points}` : null,
  ].filter(Boolean);

  return trimText(parts.join('\n\n'));
}

function prepareProductDocForEmbedding(item: {
  title: string;
  doc_type?: string | null;
  summary?: string | null;
  content?: string | null;
  source_url?: string | null;
}): string {
  const parts = [
    `Document: ${item.title} (${item.doc_type ?? 'internal'})`,
    item.summary ? `Summary: ${item.summary}` : null,
    item.source_url ? `Source: ${item.source_url}` : null,
    item.content ? `Content:\n${item.content}` : null,
  ].filter(Boolean);

  return trimText(parts.join('\n\n'));
}

async function processEmbeddingCandidates(
  table: string,
  idColumn: string,
  candidates: EmbeddingCandidate[]
): Promise<Pick<EmbeddingSummary, 'success' | 'errors'>> {
  const supabase = getServiceRoleClient();
  let success = 0;
  let errors = 0;

  if (candidates.length === 0) {
    return { success, errors };
  }

  const batches: EmbeddingCandidate[][] = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    batches.push(candidates.slice(i, i + BATCH_SIZE));
  }

  for (let index = 0; index < batches.length; index++) {
    const batch = batches[index];

    try {
      const embeddings = await generateEmbeddingsBatch(batch.map((candidate) => candidate.text));
      const payload = batch.map((candidate, idx) => ({
        [idColumn]: candidate.id,
        project_id: candidate.projectId,
        embedding: embeddings[idx],
        content_hash: candidate.hash,
      }));

      const { error } = await supabase.from(table).upsert(payload, {
        onConflict: idColumn,
      });

      if (error) {
        console.error(`[Embeddings] Error inserting into ${table}:`, error);
        errors += batch.length;
      } else {
        success += batch.length;
      }
    } catch (error) {
      console.error(`[Embeddings] Error processing batch for ${table}:`, error);
      errors += batch.length;
    }

    if (index < batches.length - 1) {
      await sleep(1000);
    }
  }

  return { success, errors };
}

async function generateRoadmapEmbeddings(projectId: string): Promise<EmbeddingSummary> {
  console.log('[Embeddings] Generating roadmap embeddings...');
  const supabase = getServiceRoleClient();
  const { data: items, error } = await supabase
    .from('roadmap_suggestions')
    .select(
      'id, project_id, recommendation_text, why_matters, implementation_strategy, user_segments_affected, priority_level, status'
    )
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to fetch roadmap suggestions: ${error.message}`);
  }

  if (!items || items.length === 0) {
    return { success: 0, errors: 0, total: 0, skipped: 0 };
  }

  const { data: existing, error: existingError } = await supabase
    .from('roadmap_item_embeddings')
    .select('roadmap_item_id, content_hash')
    .eq('project_id', projectId);

  if (existingError) {
    throw new Error(`Failed to fetch existing roadmap embeddings: ${existingError.message}`);
  }

  const existingMap = new Map<string, string | null>(
    (existing || []).map((row: any) => [row.roadmap_item_id, row.content_hash])
  );

  let skipped = 0;
  const candidates: EmbeddingCandidate[] = [];

  for (const item of items) {
    const text = prepareRoadmapForEmbedding(item);
    if (!text || text.trim().length === 0) {
      skipped += 1;
      continue;
    }

    const hash = generateContentHash(text);
    const existingHash = existingMap.get(item.id);

    if (existingHash && existingHash === hash) {
      skipped += 1;
      continue;
    }

    candidates.push({
      id: item.id,
      text,
      hash,
      projectId,
    });
  }

  const { success, errors } = await processEmbeddingCandidates(
    'roadmap_item_embeddings',
    'roadmap_item_id',
    candidates
  );

  return {
    success,
    errors,
    total: items.length,
    skipped,
  };
}

async function generateCompetitorEmbeddings(projectId: string): Promise<EmbeddingSummary> {
  console.log('[Embeddings] Generating competitor embeddings...');
  const supabase = getServiceRoleClient();
  const { data: items, error } = await supabase
    .from('competitors')
    .select(
      'id, project_id, name, category, description, status, total_mentions, avg_sentiment_vs_you, avg_sentiment_about_them'
    )
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to fetch competitors: ${error.message}`);
  }

  if (!items || items.length === 0) {
    return { success: 0, errors: 0, total: 0, skipped: 0 };
  }

  const { data: existing, error: existingError } = await supabase
    .from('competitor_embeddings')
    .select('competitor_id, content_hash')
    .eq('project_id', projectId);

  if (existingError) {
    throw new Error(`Failed to fetch existing competitor embeddings: ${existingError.message}`);
  }

  const existingMap = new Map<string, string | null>(
    (existing || []).map((row: any) => [row.competitor_id, row.content_hash])
  );

  let skipped = 0;
  const candidates: EmbeddingCandidate[] = [];

  for (const item of items) {
    const text = prepareCompetitorForEmbedding(item);
    if (!text || text.trim().length === 0) {
      skipped += 1;
      continue;
    }

    const hash = generateContentHash(text);
    const existingHash = existingMap.get(item.id);

    if (existingHash && existingHash === hash) {
      skipped += 1;
      continue;
    }

    candidates.push({
      id: item.id,
      text,
      hash,
      projectId,
    });
  }

  const { success, errors } = await processEmbeddingCandidates(
    'competitor_embeddings',
    'competitor_id',
    candidates
  );

  return {
    success,
    errors,
    total: items.length,
    skipped,
  };
}

async function generatePersonaEmbeddings(projectId: string): Promise<EmbeddingSummary> {
  console.log('[Embeddings] Generating persona embeddings...');
  const supabase = getServiceRoleClient();
  const { data: items, error } = await supabase
    .from('personas')
    .select('id, project_id, name, role, description, goals, pain_points')
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to fetch personas: ${error.message}`);
  }

  if (!items || items.length === 0) {
    return { success: 0, errors: 0, total: 0, skipped: 0 };
  }

  const { data: existing, error: existingError } = await supabase
    .from('persona_embeddings')
    .select('persona_id, content_hash')
    .eq('project_id', projectId);

  if (existingError) {
    throw new Error(`Failed to fetch existing persona embeddings: ${existingError.message}`);
  }

  const existingMap = new Map<string, string | null>(
    (existing || []).map((row: any) => [row.persona_id, row.content_hash])
  );

  let skipped = 0;
  const candidates: EmbeddingCandidate[] = [];

  for (const item of items) {
    const text = preparePersonaForEmbedding(item);
    if (!text || text.trim().length === 0) {
      skipped += 1;
      continue;
    }

    const hash = generateContentHash(text);
    const existingHash = existingMap.get(item.id);

    if (existingHash && existingHash === hash) {
      skipped += 1;
      continue;
    }

    candidates.push({
      id: item.id,
      text,
      hash,
      projectId,
    });
  }

  const { success, errors } = await processEmbeddingCandidates(
    'persona_embeddings',
    'persona_id',
    candidates
  );

  return {
    success,
    errors,
    total: items.length,
    skipped,
  };
}

async function generateProductDocEmbeddings(projectId: string): Promise<EmbeddingSummary> {
  console.log('[Embeddings] Generating product document embeddings...');
  const supabase = getServiceRoleClient();
  const { data: items, error } = await supabase
    .from('product_documents')
    .select('id, project_id, title, doc_type, summary, content, source_url')
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to fetch product documents: ${error.message}`);
  }

  if (!items || items.length === 0) {
    return { success: 0, errors: 0, total: 0, skipped: 0 };
  }

  const { data: existing, error: existingError } = await supabase
    .from('product_doc_embeddings')
    .select('product_doc_id, content_hash')
    .eq('project_id', projectId);

  if (existingError) {
    throw new Error(`Failed to fetch existing product document embeddings: ${existingError.message}`);
  }

  const existingMap = new Map<string, string | null>(
    (existing || []).map((row: any) => [row.product_doc_id, row.content_hash])
  );

  let skipped = 0;
  const candidates: EmbeddingCandidate[] = [];

  for (const item of items) {
    const text = prepareProductDocForEmbedding(item);
    if (!text || text.trim().length === 0) {
      skipped += 1;
      continue;
    }

    const hash = generateContentHash(text);
    const existingHash = existingMap.get(item.id);

    if (existingHash && existingHash === hash) {
      skipped += 1;
      continue;
    }

    candidates.push({
      id: item.id,
      text,
      hash,
      projectId,
    });
  }

  const { success, errors } = await processEmbeddingCandidates(
    'product_doc_embeddings',
    'product_doc_id',
    candidates
  );

  return {
    success,
    errors,
    total: items.length,
    skipped,
  };
}

export async function generateExpandedProjectEmbeddings(
  projectId: string
): Promise<ExpandedEmbeddingResult> {
  const feedback = await generateProjectEmbeddings(projectId);
  const roadmap = await generateRoadmapEmbeddings(projectId);
  const competitors = await generateCompetitorEmbeddings(projectId);
  const personas = await generatePersonaEmbeddings(projectId);
  const productDocs = await generateProductDocEmbeddings(projectId);

  return {
    feedback,
    roadmap,
    competitors,
    personas,
    productDocs,
  };
}
