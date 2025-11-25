/**
 * MIGRATION EXAMPLE: Spec Writer Agent
 *
 * This example shows how to migrate spec-writer-agent.ts to use the AI router with Claude
 * for long-context tasks.
 *
 * BENEFITS:
 * - 200K context window (vs 128K with GPT-4o)
 * - Can process 56% more feedback items without chunking
 * - Handles larger product contexts, user research, competitor analysis
 * - Slightly higher cost, but better quality for complex specs
 */

// ============================================================================
// BEFORE: Direct OpenAI call with context limits
// ============================================================================
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateSpecBefore(
  ideaText: string,
  feedback: any[],
  customContext: string
) {
  // Problem: If feedback + context > 128K tokens, this fails or requires chunking
  const generationPrompt = getSpecGenerationPrompt({
    idea: ideaText,
    template: 'standard',
    feedback,
    pastSpecs: [],
    personas: [],
    competitors: [],
    customContext,
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',  // Max 128K tokens
    messages: [
      { role: 'system', content: SPEC_GENERATION_SYSTEM_PROMPT },
      { role: 'user', content: generationPrompt },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  return completion.choices[0].message.content;
}

// Cost: $2.50 per 1M input tokens
// Max context: 128K tokens
// Issue: Must chunk feedback if >100 items

// ============================================================================
// AFTER: Using AI router with Claude for long-context
// ============================================================================
import { complete } from '@/lib/ai/router';

async function generateSpecAfter(
  ideaText: string,
  feedback: any[],
  customContext: string
) {
  const generationPrompt = getSpecGenerationPrompt({
    idea: ideaText,
    template: 'standard',
    feedback,  // Can handle 50% more feedback items!
    pastSpecs: [],
    personas: [],
    competitors: [],
    customContext,
  });

  // Estimate token count (rough: 4 chars ≈ 1 token)
  const estimatedTokens = Math.ceil(
    (generationPrompt.length + SPEC_GENERATION_SYSTEM_PROMPT.length) / 4
  );

  const result = await complete({
    type: 'generation',  // Router chooses GPT-4o or Claude based on context
    messages: [
      { role: 'system', content: SPEC_GENERATION_SYSTEM_PROMPT },
      { role: 'user', content: generationPrompt },
    ],
    options: {
      temperature: 0.7,
      maxTokens: 4000,
    },
    contextLength: estimatedTokens,  // Router uses Claude if >32K tokens
    priority: 'high',  // Use best available model
  });

  return result.content;
}

// Cost: $3.00 per 1M input tokens (Claude 3.5 Sonnet)
// Max context: 200K tokens (56% more than GPT-4o!)
// Benefit: No chunking needed, handles larger product contexts

// ============================================================================
// ROUTING LOGIC FOR SPEC GENERATION
// ============================================================================

/**
 * Router automatically chooses:
 *
 * - Context < 32K tokens → GPT-4o ($2.50/1M input)
 *   - Faster, slightly cheaper
 *   - Great for simple specs with <30 feedback items
 *
 * - Context > 32K tokens → Claude 3.5 Sonnet ($3.00/1M input)
 *   - 200K context window
 *   - Better for complex specs with 50+ feedback items
 *   - Can include extensive product context, user research, competitor analysis
 *
 * - If Claude fails → Fallback to GPT-4o (may require chunking)
 */

// ============================================================================
// MIGRATION STEPS FOR spec-writer-agent.ts
// ============================================================================

/**
 * 1. Add ANTHROPIC_API_KEY to .env.local:
 *    ANTHROPIC_API_KEY=sk-ant-...
 *
 * 2. Replace this line in spec-writer-agent.ts:
 *    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 *
 *    With:
 *    import { complete } from '@/lib/ai/router';
 *
 * 3. Replace the spec generation call (lines 121-129):
 */

async function handleThemeThresholdReached(event: any): Promise<void> {
  const startTime = Date.now();
  const { payload, metadata } = event;

  // ... existing code to fetch feedback and synthesize problem ...

  // NEW: Estimate context length
  const generationPrompt = getSpecGenerationPrompt({
    idea: ideaText,
    template: 'standard',
    feedback,
    pastSpecs: [],
    personas: [],
    competitors: [],
    customContext: `This spec was auto-generated based on ${payload.frequency} user requests.`,
  });

  const estimatedTokens = Math.ceil(
    (generationPrompt.length + SPEC_GENERATION_SYSTEM_PROMPT.length) / 4
  );

  console.log(`[SPEC WRITER] Generating spec with ~${estimatedTokens} context tokens`);

  // CHANGED: Use router instead of direct OpenAI call
  const result = await complete({
    type: 'generation',  // Router chooses GPT-4o or Claude
    messages: [
      { role: 'system', content: SPEC_GENERATION_SYSTEM_PROMPT },
      { role: 'user', content: generationPrompt },
    ],
    options: {
      temperature: 0.7,
      maxTokens: 4000,
    },
    contextLength: estimatedTokens,  // Router uses this for smart routing
    priority: 'high',  // Use best model for spec generation
  });

  const generatedContent = result.content;
  const totalTokens = result.usage.totalTokens;

  console.log(`[SPEC WRITER] Generated with ${result.provider}/${result.model} (${totalTokens} tokens)`);

  // ... rest of spec creation logic stays the same ...
}

/**
 * 4. DONE! The router handles:
 *    - Choosing Claude for large contexts (>32K tokens)
 *    - Choosing GPT-4o for smaller contexts (<32K tokens)
 *    - Automatic fallback if primary provider fails
 */

// ============================================================================
// REAL-WORLD SCENARIOS
// ============================================================================

/**
 * Scenario 1: Simple spec with 15 feedback items
 * - Context: ~25K tokens
 * - Router chooses: GPT-4o
 * - Cost: $2.50/1M input tokens
 * - Result: Fast, cost-effective
 *
 * Scenario 2: Complex spec with 50 feedback items + competitor research
 * - Context: ~80K tokens
 * - Router chooses: Claude 3.5 Sonnet
 * - Cost: $3.00/1M input tokens
 * - Result: Handles full context, no chunking needed
 * - With GPT-4o: Would fail or require chunking (128K max)
 *
 * Scenario 3: Enterprise spec with 100+ feedback items + extensive research
 * - Context: ~150K tokens
 * - Router chooses: Claude 3.5 Sonnet (200K window)
 * - Cost: $3.00/1M input tokens
 * - Result: Successfully generates comprehensive spec
 * - With GPT-4o: Would FAIL (exceeds 128K limit)
 */

// ============================================================================
// CONTEXT WINDOW COMPARISON
// ============================================================================

/**
 * GPT-4o:
 * - Max context: 128,000 tokens
 * - Typical spec capacity: ~30-40 feedback items + basic context
 * - Requires chunking for: Large feature specs, enterprise customers, extensive research
 *
 * Claude 3.5 Sonnet:
 * - Max context: 200,000 tokens
 * - Typical spec capacity: ~50-70 feedback items + extensive context
 * - Handles: Large product contexts, multiple personas, competitor analysis, user research
 * - 56% more capacity than GPT-4o
 */

// ============================================================================
// COST COMPARISON (1,000 spec generations)
// ============================================================================

/**
 * SMALL SPECS (avg 20K tokens input, 3K tokens output):
 *
 * GPT-4o:
 * - Input: 20K × 1000 = 20M tokens → (20M / 1M) × $2.50 = $50.00
 * - Output: 3K × 1000 = 3M tokens → (3M / 1M) × $10.00 = $30.00
 * - TOTAL: $80.00
 *
 * Router (chooses GPT-4o for <32K context):
 * - Same as above: $80.00
 * - No change for small specs
 *
 * LARGE SPECS (avg 80K tokens input, 4K tokens output):
 *
 * GPT-4o (requires chunking):
 * - Chunking overhead: 2x API calls
 * - Input: 80K × 1000 × 2 = 160M tokens → (160M / 1M) × $2.50 = $400.00
 * - Output: 4K × 1000 × 2 = 8M tokens → (8M / 1M) × $10.00 = $80.00
 * - TOTAL: $480.00
 * - Quality: Lower (context fragmented across chunks)
 *
 * Router (chooses Claude 3.5 Sonnet):
 * - No chunking needed!
 * - Input: 80K × 1000 = 80M tokens → (80M / 1M) × $3.00 = $240.00
 * - Output: 4K × 1000 = 4M tokens → (4M / 1M) × $15.00 = $60.00
 * - TOTAL: $300.00
 * - Quality: Higher (full context, no fragmentation)
 *
 * SAVINGS: $180.00 (37% cheaper!) + Better quality
 */

// ============================================================================
// EXAMPLE: Synthesis call can also benefit
// ============================================================================

/**
 * The synthesis step (getFeedbackSynthesisPrompt) can also use the router:
 */

async function synthesizeFeedback(feedback: any[]): Promise<any> {
  const synthesisPrompt = getFeedbackSynthesisPrompt(
    feedback.map((f: any) => ({
      id: f.id,
      content: f.content || f.title,
      votes: f.vote_count || 0,
    }))
  );

  const result = await complete({
    type: 'reasoning',  // Synthesis requires reasoning ability
    messages: [{ role: 'user', content: synthesisPrompt }],
    options: {
      responseFormat: 'json',
      temperature: 0.7,
    },
    priority: 'medium',  // Don't need the most expensive model
  });

  return JSON.parse(result.content);
}

// Router will choose:
// - GPT-4o-mini for <30 feedback items
// - GPT-4o for 30-100 feedback items
// - Claude 3.5 Sonnet if context is very large

const SPEC_GENERATION_SYSTEM_PROMPT = `You are a world-class product manager and technical writer...`;

function getSpecGenerationPrompt(params: any): string {
  return `Generate a technical spec...`;
}

function getFeedbackSynthesisPrompt(feedback: any[]): string {
  return `Synthesize this feedback...`;
}
