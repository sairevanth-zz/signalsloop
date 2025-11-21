/**
 * Feedback Embeddings Generation for Semantic Search
 * Generates and stores embeddings for feedback items to enable semantic search
 */

import { createClient } from '@supabase/supabase-js';
import {
  generateEmbedding,
  generateEmbeddingsBatch,
  generateContentHash,
} from '@/lib/specs/embeddings';

// ============================================================================
// Service Role Client (Admin Access)
// ============================================================================

/**
 * Get Supabase client with service role key for admin operations
 * This bypasses RLS policies and should only be used in secure server contexts
 */
function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for service role client');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Prepare feedback content for embedding
 * Combines title and content into a single text representation
 */
function prepareFeedbackForEmbedding(feedback: {
  title: string;
  content: string;
  category?: string;
  status?: string;
}): string {
  let text = `Title: ${feedback.title}\n\n`;

  if (feedback.category) {
    text += `Category: ${feedback.category}\n`;
  }

  if (feedback.status) {
    text += `Status: ${feedback.status}\n`;
  }

  text += `\nContent:\n${feedback.content}`;

  // Limit to ~2000 characters to stay within reasonable token limits
  return text.substring(0, 2000);
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Main Embedding Functions
// ============================================================================

/**
 * Generate embeddings for all feedback in a project
 *
 * This function:
 * 1. Fetches all feedback items without embeddings
 * 2. Generates embeddings in batches to avoid rate limits
 * 3. Stores embeddings with content hash for deduplication
 * 4. Processes 20 items at a time with 1 second delay between batches
 *
 * @param projectId - Project UUID to generate embeddings for
 * @returns Object with success count, error count, and total processed
 */
export async function generateProjectEmbeddings(projectId: string): Promise<{
  success: number;
  errors: number;
  total: number;
  skipped: number;
}> {
  console.log(`[Embeddings] Starting embedding generation for project: ${projectId}`);

  const supabase = getServiceRoleClient();
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  try {
    // Fetch all feedback items that don't have embeddings yet
    const { data: feedbackItems, error: fetchError } = await supabase
      .from('posts')
      .select('id, title, content, category, status, project_id')
      .eq('project_id', projectId)
      .not('content', 'is', null)
      .not('title', 'is', null);

    if (fetchError) {
      console.error('[Embeddings] Error fetching feedback items:', fetchError);
      throw new Error(`Failed to fetch feedback items: ${fetchError.message}`);
    }

    if (!feedbackItems || feedbackItems.length === 0) {
      console.log('[Embeddings] No feedback items found for project');
      return { success: 0, errors: 0, total: 0, skipped: 0 };
    }

    console.log(`[Embeddings] Found ${feedbackItems.length} feedback items`);

    // Check which ones already have embeddings
    const { data: existingEmbeddings } = await supabase
      .from('feedback_embeddings')
      .select('feedback_id')
      .eq('project_id', projectId);

    const existingFeedbackIds = new Set(
      existingEmbeddings?.map((e) => e.feedback_id) || []
    );

    // Filter out items that already have embeddings
    const itemsToProcess = feedbackItems.filter(
      (item) => !existingFeedbackIds.has(item.id)
    );

    skippedCount = feedbackItems.length - itemsToProcess.length;

    if (itemsToProcess.length === 0) {
      console.log('[Embeddings] All feedback items already have embeddings');
      return { success: 0, errors: 0, total: feedbackItems.length, skipped: skippedCount };
    }

    console.log(
      `[Embeddings] Processing ${itemsToProcess.length} items (${skippedCount} already have embeddings)`
    );

    // Process in batches of 20
    const BATCH_SIZE = 20;
    const batches: typeof itemsToProcess[] = [];

    for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
      batches.push(itemsToProcess.slice(i, i + BATCH_SIZE));
    }

    console.log(`[Embeddings] Processing ${batches.length} batches`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(
        `[Embeddings] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)`
      );

      try {
        // Prepare texts for embedding
        const textsToEmbed = batch.map((item) =>
          prepareFeedbackForEmbedding(item)
        );

        // Generate embeddings in batch
        const embeddings = await generateEmbeddingsBatch(textsToEmbed);

        // Store embeddings in database
        const embeddingsToInsert = batch.map((item, index) => ({
          feedback_id: item.id,
          project_id: projectId,
          embedding: embeddings[index],
          content_hash: generateContentHash(
            prepareFeedbackForEmbedding(item)
          ),
        }));

        const { error: insertError } = await supabase
          .from('feedback_embeddings')
          .upsert(embeddingsToInsert, {
            onConflict: 'feedback_id',
          });

        if (insertError) {
          console.error('[Embeddings] Error inserting embeddings:', insertError);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
          console.log(
            `[Embeddings] Successfully processed batch ${batchIndex + 1}/${batches.length}`
          );
        }
      } catch (batchError) {
        console.error(
          `[Embeddings] Error processing batch ${batchIndex + 1}:`,
          batchError
        );
        errorCount += batch.length;
      }

      // Rate limiting: Wait 1 second between batches (except for the last batch)
      if (batchIndex < batches.length - 1) {
        console.log('[Embeddings] Waiting 1 second before next batch...');
        await sleep(1000);
      }
    }

    const result = {
      success: successCount,
      errors: errorCount,
      total: feedbackItems.length,
      skipped: skippedCount,
    };

    console.log('[Embeddings] Embedding generation complete:', result);
    return result;
  } catch (error) {
    console.error('[Embeddings] Fatal error during embedding generation:', error);
    throw error;
  }
}

/**
 * Handle embedding generation for a single new feedback item
 *
 * This function should be called when new feedback is created.
 * Can be triggered via:
 * - Supabase database webhook on posts insert
 * - API endpoint after creating feedback
 * - Manual script
 *
 * @param feedbackId - UUID of the feedback item
 * @returns Success status
 */
export async function handleNewFeedback(feedbackId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log(`[Embeddings] Generating embedding for feedback: ${feedbackId}`);

  const supabase = getServiceRoleClient();

  try {
    // Fetch the feedback item
    const { data: feedback, error: fetchError } = await supabase
      .from('posts')
      .select('id, title, content, category, status, project_id')
      .eq('id', feedbackId)
      .single();

    if (fetchError || !feedback) {
      console.error('[Embeddings] Error fetching feedback item:', fetchError);
      return {
        success: false,
        error: `Failed to fetch feedback item: ${fetchError?.message || 'Not found'}`,
      };
    }

    // Validate required fields
    if (!feedback.title || !feedback.content) {
      console.warn('[Embeddings] Feedback item missing title or content, skipping');
      return {
        success: false,
        error: 'Feedback item missing required fields (title or content)',
      };
    }

    // Check if embedding already exists
    const { data: existingEmbedding } = await supabase
      .from('feedback_embeddings')
      .select('id, content_hash')
      .eq('feedback_id', feedbackId)
      .single();

    // Prepare content for embedding
    const textToEmbed = prepareFeedbackForEmbedding(feedback);
    const contentHash = generateContentHash(textToEmbed);

    // Skip if content hasn't changed
    if (existingEmbedding && existingEmbedding.content_hash === contentHash) {
      console.log('[Embeddings] Content unchanged, skipping embedding generation');
      return { success: true };
    }

    // Generate embedding
    const embedding = await generateEmbedding(textToEmbed);

    // Store embedding in database
    const { error: upsertError } = await supabase
      .from('feedback_embeddings')
      .upsert(
        {
          feedback_id: feedbackId,
          project_id: feedback.project_id,
          embedding: embedding,
          content_hash: contentHash,
        },
        {
          onConflict: 'feedback_id',
        }
      );

    if (upsertError) {
      console.error('[Embeddings] Error storing embedding:', upsertError);
      return {
        success: false,
        error: `Failed to store embedding: ${upsertError.message}`,
      };
    }

    console.log(`[Embeddings] Successfully generated embedding for feedback: ${feedbackId}`);
    return { success: true };
  } catch (error) {
    console.error('[Embeddings] Error generating embedding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update embedding for an existing feedback item
 * Useful when feedback content is edited
 *
 * @param feedbackId - UUID of the feedback item
 * @returns Success status
 */
export async function updateFeedbackEmbedding(feedbackId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log(`[Embeddings] Updating embedding for feedback: ${feedbackId}`);

  // This is essentially the same as handleNewFeedback
  // since upsert will update if exists
  return handleNewFeedback(feedbackId);
}

/**
 * Delete embedding for a feedback item
 * Useful when feedback is deleted
 *
 * @param feedbackId - UUID of the feedback item
 * @returns Success status
 */
export async function deleteFeedbackEmbedding(feedbackId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log(`[Embeddings] Deleting embedding for feedback: ${feedbackId}`);

  const supabase = getServiceRoleClient();

  try {
    const { error: deleteError } = await supabase
      .from('feedback_embeddings')
      .delete()
      .eq('feedback_id', feedbackId);

    if (deleteError) {
      console.error('[Embeddings] Error deleting embedding:', deleteError);
      return {
        success: false,
        error: `Failed to delete embedding: ${deleteError.message}`,
      };
    }

    console.log(`[Embeddings] Successfully deleted embedding for feedback: ${feedbackId}`);
    return { success: true };
  } catch (error) {
    console.error('[Embeddings] Error deleting embedding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
