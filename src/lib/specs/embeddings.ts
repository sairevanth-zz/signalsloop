/**
 * Embedding Generation for Spec RAG
 */

import OpenAI from 'openai';
import crypto from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * Generate embedding for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate content hash for change detection
 */
export function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Prepare spec content for embedding (extract key information)
 */
export function prepareSpecForEmbedding(spec: {
  title: string;
  content: string;
  input_idea?: string;
}): string {
  let text = `Title: ${spec.title}\n\n`;

  if (spec.input_idea) {
    text += `Original Idea: ${spec.input_idea}\n\n`;
  }

  // Extract just the key sections for embedding (to stay within token limits)
  // Problem statement and user stories are most important for similarity
  text += extractKeyContent(spec.content);

  return text;
}

/**
 * Extract key content sections from spec markdown
 */
function extractKeyContent(markdown: string): string {
  const sections = [
    'Problem Statement',
    'User Stories',
    'Executive Summary',
    'Problem Statement & Opportunity',
    'Bug Description',
    'API Overview',
  ];

  let extracted = '';

  sections.forEach((sectionName) => {
    const sectionRegex = new RegExp(`##\\s+${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
    const match = markdown.match(sectionRegex);

    if (match && match[1]) {
      extracted += `${sectionName}:\n${match[1].trim()}\n\n`;
    }
  });

  // If no sections found, use first 1000 chars
  if (extracted.length === 0) {
    extracted = markdown.substring(0, 1000);
  }

  // Limit to ~2000 chars to avoid token limits
  return extracted.substring(0, 2000);
}

// ============================================================================
// Batch Embedding Operations
// ============================================================================

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  // OpenAI supports up to 2048 inputs per request for embeddings
  const batchSize = 2048;
  const batches: string[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    batches.push(texts.slice(i, i + batchSize));
  }

  const allEmbeddings: number[][] = [];

  for (const batch of batches) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
        encoding_format: 'float',
      });

      allEmbeddings.push(...response.data.map((d) => d.embedding));
    } catch (error) {
      console.error('Error generating embeddings batch:', error);
      throw new Error('Failed to generate embeddings batch');
    }
  }

  return allEmbeddings;
}

// ============================================================================
// Similarity Calculation
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
