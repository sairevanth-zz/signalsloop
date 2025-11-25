# Multi-Provider AI Migration Guide

This guide shows how to migrate from direct OpenAI calls to the new multi-provider AI router.

## Benefits

- **Cost Optimization**: Automatically use cheaper models (Llama) for simple tasks, saving up to 95% on costs
- **Long-Context Support**: Use Claude for documents >32K tokens (200K context window)
- **Automatic Fallbacks**: Graceful degradation if a provider is unavailable
- **Provider Diversity**: Reduce vendor lock-in

## Setup

### Environment Variables

Add API keys for the providers you want to use:

```bash
# .env.local
OPENAI_API_KEY=your-openai-key-here      # Required for OpenAI models
ANTHROPIC_API_KEY=your-anthropic-key     # Optional: for Claude models
GROQ_API_KEY=your-groq-key               # Optional: for Llama models via Groq
```

At minimum, you need `OPENAI_API_KEY`. Add others to enable multi-provider routing.

## Migration Examples

### Example 1: Sentiment Analysis (Classification Task)

**BEFORE** (Direct OpenAI call):
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeSentiment(text: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Classify sentiment as positive, negative, or neutral.' },
      { role: 'user', content: text }
    ],
    temperature: 0.3,
  });

  return response.choices[0].message.content;
}

// Cost: ~$0.15 per 1M input tokens
```

**AFTER** (Using router):
```typescript
import { complete } from '@/lib/ai/router';

async function analyzeSentiment(text: string) {
  const result = await complete({
    type: 'classification',  // Router will use Llama (ultra-fast, ultra-cheap)
    messages: [
      { role: 'system', content: 'Classify sentiment as positive, negative, or neutral.' },
      { role: 'user', content: text }
    ],
    options: { temperature: 0.3 },
    costSensitive: true,
  });

  return result.content;
}

// Cost: ~$0.05 per 1M input tokens (67% cheaper!)
// Latency: ~300ms (vs 1500ms with GPT-4o-mini)
```

### Example 2: Spec Generation (Long-Context Task)

**BEFORE** (Direct OpenAI call with context limits):
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateSpec(feedback: string[], context: string) {
  // Problem: GPT-4o has 128K context limit
  // If feedback + context > 128K tokens, this fails or requires chunking

  const combinedContext = context + '\n\n' + feedback.join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'Generate a technical spec...' },
      { role: 'user', content: combinedContext }
    ],
  });

  return response.choices[0].message.content;
}

// Cost: $2.50 per 1M input tokens
// Max context: 128K tokens
```

**AFTER** (Using router with Claude for long context):
```typescript
import { complete } from '@/lib/ai/router';

async function generateSpec(feedback: string[], context: string) {
  const combinedContext = context + '\n\n' + feedback.join('\n');

  const result = await complete({
    type: 'long-context',  // Router will use Claude (200K context window)
    messages: [
      { role: 'system', content: 'Generate a technical spec...' },
      { role: 'user', content: combinedContext }
    ],
    contextLength: Math.ceil(combinedContext.length / 4),  // Rough token estimate
    priority: 'high',
  });

  return result.content;
}

// Cost: $3.00 per 1M input tokens (slightly more, but handles 200K context)
// Max context: 200K tokens (56% more than GPT-4o)
// No chunking needed!
```

### Example 3: Feature Extraction (Structured Output)

**BEFORE** (Direct OpenAI call):
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractFeatures(feedback: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Extract features mentioned in feedback as JSON.' },
      { role: 'user', content: feedback }
    ],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}
```

**AFTER** (Using router):
```typescript
import { complete } from '@/lib/ai/router';

async function extractFeatures(feedback: string) {
  const result = await complete({
    type: 'extraction',  // Router chooses Llama (cheap) or GPT-4o-mini (reliable)
    messages: [
      { role: 'system', content: 'Extract features mentioned in feedback as JSON.' },
      { role: 'user', content: feedback }
    ],
    options: { responseFormat: 'json' },
    costSensitive: true,  // Prefer Llama if available
  });

  return JSON.parse(result.content);
}

// Cost: ~$0.05 per 1M input tokens (if Llama used)
// Fallback: GPT-4o-mini if Llama unavailable
```

### Example 4: Complex Reasoning (Agent Decision Making)

**BEFORE**:
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeExperiment(data: ExperimentData) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'Analyze this experiment and recommend actions...' },
      { role: 'user', content: JSON.stringify(data) }
    ],
  });

  return response.choices[0].message.content;
}
```

**AFTER**:
```typescript
import { complete } from '@/lib/ai/router';

async function analyzeExperiment(data: ExperimentData) {
  const result = await complete({
    type: 'reasoning',  // Router uses GPT-4o or Claude depending on context
    messages: [
      { role: 'system', content: 'Analyze this experiment and recommend actions...' },
      { role: 'user', content: JSON.stringify(data) }
    ],
    priority: 'high',  // Use best available model
  });

  return result.content;
}

// Router automatically chooses:
// - GPT-4o for short context (<32K tokens)
// - Claude 3.5 Sonnet for long context (>32K tokens)
```

## Routing Logic Summary

| Task Type | Default Provider | Model | Why |
|-----------|-----------------|-------|-----|
| `classification` | Llama | llama-3.1-8b | Ultra-fast (300ms), ultra-cheap ($0.05/1M tokens) |
| `sentiment` | Llama | llama-3.1-8b | Same as classification |
| `extraction` | Llama/OpenAI | llama-3.1-8b or gpt-4o-mini | Structured output, cost-effective |
| `long-context` | Claude | claude-3-5-sonnet | 200K context window |
| `reasoning` | OpenAI/Claude | gpt-4o or claude-3-5-sonnet | Best reasoning ability |
| `generation` | OpenAI/Claude | gpt-4o or gpt-4o-mini | High-quality content |
| `conversation` | OpenAI | gpt-4o | Best conversational ability |

## Cost Estimation

You can estimate costs before making a request:

```typescript
import { estimateCost } from '@/lib/ai/router';

const request = {
  type: 'classification',
  messages: [
    { role: 'system', content: 'Classify sentiment.' },
    { role: 'user', content: 'I love this product!' }
  ],
};

const { provider, model, estimatedCost } = estimateCost(request, 50);
console.log(`Will use ${provider}/${model} - Estimated cost: $${estimatedCost.toFixed(6)}`);
// Output: "Will use llama/llama-3.1-8b - Estimated cost: $0.000003"
```

## Health Checks

Check which providers are available:

```typescript
import { getAIRouter } from '@/lib/ai/router';

const router = getAIRouter();

// Check all providers
const available = router.getAvailableProviders();
console.log('Available providers:', available);

// Check specific provider
const isClaudeAvailable = await router.checkProviderHealth('claude');
if (isClaudeAvailable) {
  console.log('Claude is ready for long-context tasks');
}
```

## Fallback Behavior

The router automatically falls back to other providers if the primary provider fails:

```typescript
// Default fallback chain: openai → claude → llama

// If Claude fails on a long-context task, router will try:
// 1. Claude (primary)
// 2. OpenAI (fallback 1)
// 3. Llama (fallback 2)

// You can customize this:
import { getAIRouter } from '@/lib/ai/router';

const router = getAIRouter({
  fallbackChain: ['llama', 'openai', 'claude'],  // Prefer Llama first
  enableCostOptimization: true,
});
```

## Best Practices

1. **Use task types accurately**: The router's intelligence depends on correct task classification
2. **Set `costSensitive: true`** for high-volume tasks (classification, sentiment)
3. **Provide `contextLength`** estimates for better routing decisions
4. **Use `priority: 'high'`** only when you need the best model (it costs more)
5. **Test with one provider first**, then add others incrementally

## Migration Checklist

- [ ] Add `ANTHROPIC_API_KEY` and `GROQ_API_KEY` to environment variables
- [ ] Replace direct OpenAI calls with `complete()` from router
- [ ] Classify each task as `classification`, `extraction`, `reasoning`, etc.
- [ ] Add `costSensitive: true` for high-volume simple tasks
- [ ] Test routing logic with `estimateCost()` before deploying
- [ ] Monitor provider availability in production with health checks
- [ ] Update error handling to account for fallback chains

## Next Steps

1. Start with low-risk tasks (sentiment analysis, classification)
2. Monitor costs and latency improvements
3. Gradually migrate complex tasks (spec generation, reasoning)
4. Add provider configuration UI for non-technical users
