/**
 * Stage 4: Deduplication
 * Identifies and merges duplicate or near-duplicate feedback items
 * Before storing, dedupe similar feedback to avoid noise
 */

import OpenAI from 'openai';

export interface DeduplicationResult {
    duplicateGroups: Array<{
        primaryId: string;        // Keep this one
        duplicateIds: string[];   // Merge/discard these
        reason: string;
    }>;
    uniqueItems: string[];
}

interface FeedbackItem {
    id: string;
    content: string;
    title?: string;
    platform: string;
    author_username?: string;
    platform_url?: string;
}

/**
 * Build the deduplication system prompt
 */
function buildDeduplicationSystemPrompt(productName: string): string {
    return `You are identifying duplicate or near-duplicate feedback items.

Given these feedback items about ${productName}, identify which ones are duplicates or substantially the same.

═══════════════════════════════════════════════════════════════
DUPLICATES INCLUDE:
═══════════════════════════════════════════════════════════════

- Same person posting same feedback in multiple places
- Multiple people reporting the exact same bug (same error, same steps)
- Cross-posts of the same content
- Paraphrased versions of the same feedback

═══════════════════════════════════════════════════════════════
NOT DUPLICATES (keep separate):
═══════════════════════════════════════════════════════════════

- Different people with similar opinions (aggregate these, don't dedupe)
- Same feature request from different users (count separately - validates demand)
- Similar bugs with different details (might be different root causes)
- Same topic but different specific feedback

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT:
═══════════════════════════════════════════════════════════════

{
  "duplicate_groups": [
    {
      "primary_id": "item_1",
      "duplicate_ids": ["item_3", "item_7"],
      "reason": "Same user posted same bug report on Reddit and HN"
    }
  ],
  "unique_items": ["item_2", "item_4", "item_5", "item_6"]
}

═══════════════════════════════════════════════════════════════
RULES:
═══════════════════════════════════════════════════════════════

1. When in doubt, keep items SEPARATE (false merge is worse than missing a dupe)
2. Same author + same topic = likely duplicate
3. Different authors + same opinion = NOT duplicate (validates the feedback)
4. Prefer keeping items with more engagement/detail as "primary"`;
}

/**
 * Build the user prompt with items to dedupe
 */
function buildDeduplicationUserPrompt(items: FeedbackItem[]): string {
    const itemsFormatted = items.map(item => ({
        id: item.id,
        author: item.author_username || 'unknown',
        platform: item.platform,
        title: item.title || '',
        content: item.content.slice(0, 500), // Truncate for token efficiency
    }));

    return `Identify duplicates in these ${items.length} items:

${JSON.stringify(itemsFormatted, null, 2)}

Return JSON with duplicate_groups and unique_items.`;
}

/**
 * Deduplicate feedback items using AI
 */
export async function deduplicateFeedback(
    items: FeedbackItem[],
    productName: string,
    openaiApiKey?: string
): Promise<DeduplicationResult> {
    // If less than 2 items, nothing to dedupe
    if (items.length < 2) {
        return {
            duplicateGroups: [],
            uniqueItems: items.map(i => i.id),
        };
    }

    const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn('[Deduplication] No OpenAI API key, skipping deduplication');
        return {
            duplicateGroups: [],
            uniqueItems: items.map(i => i.id),
        };
    }

    const openai = new OpenAI({ apiKey });

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: buildDeduplicationSystemPrompt(productName) },
                { role: 'user', content: buildDeduplicationUserPrompt(items) },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2, // Low temperature for consistent deduplication
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');

        return {
            duplicateGroups: (result.duplicate_groups || []).map((group: any) => ({
                primaryId: group.primary_id,
                duplicateIds: group.duplicate_ids || [],
                reason: group.reason || 'Duplicate content detected',
            })),
            uniqueItems: result.unique_items || items.map(i => i.id),
        };
    } catch (error) {
        console.error('[Deduplication] Error:', error);
        // On error, return all items as unique (safe fallback)
        return {
            duplicateGroups: [],
            uniqueItems: items.map(i => i.id),
        };
    }
}

/**
 * Simple hash-based deduplication (no AI, faster)
 * Use this for quick pre-filtering before AI deduplication
 */
export function quickDedupeByHash(items: FeedbackItem[]): {
    unique: FeedbackItem[];
    duplicates: FeedbackItem[];
} {
    const seen = new Map<string, FeedbackItem>();
    const duplicates: FeedbackItem[] = [];

    for (const item of items) {
        // Create a simple hash from normalized content
        const normalized = item.content
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 200); // First 200 chars

        const key = `${item.author_username || 'anon'}:${normalized}`;

        if (seen.has(key)) {
            duplicates.push(item);
        } else {
            seen.set(key, item);
        }
    }

    return {
        unique: Array.from(seen.values()),
        duplicates,
    };
}

/**
 * Merge duplicate feedback items
 * Takes the primary item and adds metadata about duplicates
 */
export function mergeDuplicates(
    items: FeedbackItem[],
    dedupeResult: DeduplicationResult
): FeedbackItem[] {
    const duplicateIds = new Set<string>();

    // Collect all duplicate IDs
    for (const group of dedupeResult.duplicateGroups) {
        for (const id of group.duplicateIds) {
            duplicateIds.add(id);
        }
    }

    // Return only non-duplicate items
    return items.filter(item => !duplicateIds.has(item.id));
}
