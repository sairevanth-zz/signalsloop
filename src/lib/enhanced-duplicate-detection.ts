/**
 * Advanced Duplicate Detection System
 * Multi-stage analysis for identifying similar feedback
 */

import { withCache } from './ai-cache-manager';
import { getOpenAI } from './openai-client';

const MODELS = {
  DUPLICATE_DETECTION: process.env.DUPLICATE_MODEL || 'gpt-4o-mini',
  DUPLICATE_EMBEDDING: 'text-embedding-3-small',
};

export interface DuplicateCandidate {
  id: string;
  title: string;
  description: string;
  embedding?: number[];
  category?: string;
  voteCount: number;
  createdAt: Date;
}

export interface DuplicateAnalysis {
  isDuplicate: boolean;
  duplicateType: 'exact' | 'semantic' | 'partial' | 'related' | 'none';
  confidence: number;
  similarityScore: number;
  mergeRecommendation: 'merge' | 'link' | 'keep_separate';
  mergedTitle?: string;
  mergedDescription?: string;
  explanation: string;
  commonThemes: string[];
  differences: string[];
}

export interface DuplicateCluster {
  primaryPost: DuplicateCandidate;
  duplicates: Array<{
    post: DuplicateCandidate;
    analysis: DuplicateAnalysis;
  }>;
  clusterTheme: string;
  totalVotes: number;
  recommendedAction: string;
}

// Similarity thresholds for different stages
const THRESHOLDS = {
  exact: 0.95,      // Nearly identical
  semantic: 0.85,   // Same issue, different wording
  partial: 0.70,    // Partially overlapping (balanced threshold)
  related: 0.60,    // Related but distinct
};

/**
 * Generate embedding for a post
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await getOpenAI().embeddings.create({
      model: MODELS.DUPLICATE_EMBEDDING,
      input: text.slice(0, 8000), // Limit input size
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation error:', error);
    return [];
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}

/**
 * Perform semantic analysis on potential duplicates
 */
async function analyzeSemanticDuplicatesInternal(
  post1: DuplicateCandidate,
  post2: DuplicateCandidate,
  similarityScore: number
): Promise<DuplicateAnalysis> {
  const systemPrompt = `You are an expert at identifying duplicate feedback in a SaaS product feedback system. Analyze whether these posts are duplicates, considering:

1. Root Problem: Are users describing the same underlying issue?
2. Solution Space: Would implementing one request satisfy both users?
3. User Intent: Are the users trying to achieve the same goal?
4. Business Impact: Would these be treated as one item in planning?

Similarity Score: ${(similarityScore * 100).toFixed(1)}%

Provide detailed analysis to help product managers decide whether to merge, link, or keep separate.`;

  const userPrompt = `Analyze these feedback posts for duplication:

POST 1:
Title: "${post1.title}"
Description: "${post1.description}"
Category: ${post1.category || 'uncategorized'}
Votes: ${post1.voteCount}

POST 2:
Title: "${post2.title}"
Description: "${post2.description}"
Category: ${post2.category || 'uncategorized'}
Votes: ${post2.voteCount}

Return JSON with this structure:
{
  "isDuplicate": true/false,
  "duplicateType": "exact|semantic|partial|related|none",
  "confidence": 0.0-1.0,
  "mergeRecommendation": "merge|link|keep_separate",
  "mergedTitle": "suggested title if merging",
  "mergedDescription": "combined description if merging",
  "explanation": "clear explanation for product team",
  "commonThemes": ["theme1", "theme2"],
  "differences": ["diff1", "diff2"]
}`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: MODELS.DUPLICATE_DETECTION,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 400,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    const analysis = JSON.parse(content) as DuplicateAnalysis;
    analysis.similarityScore = similarityScore;

    return analysis;

  } catch (error) {
    console.error('Semantic analysis error:', error);
    return getFallbackDuplicateAnalysis(post1, post2, similarityScore);
  }
}

/**
 * Main duplicate detection function
 */
export async function detectDuplicates(
  newPost: DuplicateCandidate,
  existingPosts: DuplicateCandidate[],
  options: {
    threshold?: number;
    maxResults?: number;
    includeRelated?: boolean;
  } = {}
): Promise<Array<{ post: DuplicateCandidate; analysis: DuplicateAnalysis }>> {
  const {
    threshold = THRESHOLDS.related,
    maxResults = 5,
    includeRelated = false
  } = options;

  // Generate embedding for new post
  const newPostText = `${newPost.title} ${newPost.description}`;
  const newEmbedding = await generateEmbedding(newPostText);

  if (newEmbedding.length === 0) {
    return [];
  }

  // Calculate similarities with existing posts
  const similarities: Array<{
    post: DuplicateCandidate;
    score: number;
  }> = [];

  for (const existingPost of existingPosts) {
    // Skip if same post
    if (existingPost.id === newPost.id) continue;

    // Generate or use cached embedding
    const existingText = `${existingPost.title} ${existingPost.description}`;
    const existingEmbedding = existingPost.embedding ||
      await generateEmbedding(existingText);

    if (existingEmbedding.length === 0) continue;

    const similarity = cosineSimilarity(newEmbedding, existingEmbedding);

    if (similarity >= threshold) {
      similarities.push({
        post: existingPost,
        score: similarity
      });
    }
  }

  // Sort by similarity score
  similarities.sort((a, b) => b.score - a.score);

  // Analyze top candidates
  const results = [];
  const topCandidates = similarities.slice(0, maxResults);

  for (const candidate of topCandidates) {
    // Skip related items if not requested
    if (!includeRelated && candidate.score < THRESHOLDS.partial) {
      continue;
    }

    const analysis = await analyzeSemanticDuplicates(
      newPost,
      candidate.post,
      candidate.score
    );

    results.push({
      post: candidate.post,
      analysis
    });
  }

  return results;
}

/**
 * Detect clusters of related feedback
 */
export async function detectDuplicateClusters(
  posts: DuplicateCandidate[],
  options: {
    minClusterSize?: number;
    clusterThreshold?: number;
  } = {}
): Promise<DuplicateCluster[]> {
  const {
    minClusterSize = 2,
    clusterThreshold = THRESHOLDS.partial
  } = options;

  const clusters: Map<string, DuplicateCluster> = new Map();
  const processedPosts = new Set<string>();

  // Generate embeddings for all posts
  const postsWithEmbeddings = await Promise.all(
    posts.map(async (post) => ({
      ...post,
      embedding: await generateEmbedding(`${post.title} ${post.description}`)
    }))
  );

  // Find clusters using similarity threshold only (skip AI analysis for clustering)
  for (const post of postsWithEmbeddings) {
    if (processedPosts.has(post.id)) continue;
    if (!post.embedding || post.embedding.length === 0) continue;

    // Find similar posts based on embedding similarity
    const similarPosts: Array<{
      post: DuplicateCandidate;
      analysis: DuplicateAnalysis;
    }> = [];

    for (const otherPost of postsWithEmbeddings) {
      if (otherPost.id === post.id) continue;
      if (processedPosts.has(otherPost.id)) continue;
      if (!otherPost.embedding || otherPost.embedding.length === 0) continue;

      // Check if title is specific enough for exact matching (not generic)
      const isGenericTitle = post.title.split(/\s+/).length <= 3 || post.title.length < 20;

      // Only auto-match exact titles if they're specific enough
      const exactTitleMatch = !isGenericTitle &&
        post.title.trim().toLowerCase() === otherPost.title.trim().toLowerCase();

      const similarity = cosineSimilarity(post.embedding, otherPost.embedding);

      // Consider it a duplicate if exact title match (for specific titles) OR similarity exceeds threshold
      if (exactTitleMatch || similarity >= clusterThreshold) {
        // Perform AI analysis only for similar posts
        const analysis = await analyzeSemanticDuplicates(
          post,
          otherPost,
          exactTitleMatch ? 1.0 : similarity  // Treat exact title match as 100% similar
        );

        similarPosts.push({
          post: otherPost,
          analysis
        });
      }
    }

    if (similarPosts.length >= minClusterSize - 1) {
      // Create new cluster
      const cluster: DuplicateCluster = {
        primaryPost: post,
        duplicates: similarPosts,
        clusterTheme: await extractClusterTheme([post, ...similarPosts.map(s => s.post)]),
        totalVotes: post.voteCount + similarPosts.reduce((sum, s) => sum + s.post.voteCount, 0),
        recommendedAction: getClusterAction(similarPosts)
      };

      clusters.set(post.id, cluster);
      processedPosts.add(post.id);
      similarPosts.forEach(s => processedPosts.add(s.post.id));
    }
  }

  return Array.from(clusters.values())
    .sort((a, b) => b.totalVotes - a.totalVotes);
}

async function extractClusterTheme(posts: DuplicateCandidate[]): Promise<string> {
  const titles = posts.map(p => p.title).join(', ');

  try {
    const response = await getOpenAI().chat.completions.create({
      model: MODELS.DUPLICATE_DETECTION,
      messages: [
        {
          role: 'system',
          content: 'Extract the common theme from these feedback titles in 5 words or less:'
        },
        { role: 'user', content: titles }
      ],
      temperature: 0.3,
      max_tokens: 20,
    });

    return response.choices[0]?.message?.content || 'Related Feedback';
  } catch {
    return 'Related Feedback';
  }
}

function getClusterAction(similarPosts: Array<{ analysis: DuplicateAnalysis }>): string {
  const mergeCount = similarPosts.filter(s => s.analysis.mergeRecommendation === 'merge').length;
  const linkCount = similarPosts.filter(s => s.analysis.mergeRecommendation === 'link').length;

  if (mergeCount > similarPosts.length / 2) {
    return 'Merge all into single feature request';
  } else if (linkCount > similarPosts.length / 2) {
    return 'Link as related features';
  } else {
    return 'Review individually for consolidation opportunities';
  }
}

function getFallbackDuplicateAnalysis(
  post1: DuplicateCandidate,
  post2: DuplicateCandidate,
  similarityScore: number
): DuplicateAnalysis {
  let duplicateType: DuplicateAnalysis['duplicateType'] = 'none';
  let mergeRecommendation: DuplicateAnalysis['mergeRecommendation'] = 'keep_separate';

  if (similarityScore >= THRESHOLDS.exact) {
    duplicateType = 'exact';
    mergeRecommendation = 'merge';
  } else if (similarityScore >= THRESHOLDS.semantic) {
    duplicateType = 'semantic';
    mergeRecommendation = 'merge';
  } else if (similarityScore >= THRESHOLDS.partial) {
    duplicateType = 'partial';
    mergeRecommendation = 'link';
  } else if (similarityScore >= THRESHOLDS.related) {
    duplicateType = 'related';
    mergeRecommendation = 'keep_separate';
  }

  return {
    isDuplicate: duplicateType !== 'none' && duplicateType !== 'related',
    duplicateType,
    confidence: similarityScore,
    similarityScore,
    mergeRecommendation,
    explanation: `Based on ${(similarityScore * 100).toFixed(1)}% similarity`,
    commonThemes: [],
    differences: []
  };
}

// Export cached version
export const analyzeSemanticDuplicates = withCache(
  analyzeSemanticDuplicatesInternal,
  'duplicateDetection',
  (post1, post2) => ({
    id1: post1.id,
    id2: post2.id
  })
);
