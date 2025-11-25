/**
 * Smart AI Router
 * Intelligently routes requests to the best provider based on task type,
 * context length, cost sensitivity, and availability
 */

import { OpenAIProvider } from './providers/openai';
import { ClaudeProvider } from './providers/claude';
import { LlamaProvider } from './providers/llama';
import type {
  IAIProvider,
  AIProvider,
  AIModel,
  AITaskType,
  AITaskRequest,
  AICompletionResult,
  RouterConfig,
  DEFAULT_ROUTER_CONFIG,
  MODEL_REGISTRY,
} from './types';

export class AIRouter {
  private providers: Map<AIProvider, IAIProvider>;
  private config: RouterConfig;

  constructor(config?: Partial<RouterConfig>) {
    this.config = { ...DEFAULT_ROUTER_CONFIG, ...config };
    this.providers = new Map();

    // Initialize providers
    try {
      this.providers.set('openai', new OpenAIProvider());
    } catch (error) {
      console.warn('[AI Router] OpenAI provider not available:', error);
    }

    try {
      this.providers.set('claude', new ClaudeProvider());
    } catch (error) {
      console.warn('[AI Router] Claude provider not available:', error);
    }

    try {
      this.providers.set('llama', new LlamaProvider());
    } catch (error) {
      console.warn('[AI Router] Llama provider not available:', error);
    }
  }

  /**
   * Main entry point: route and execute an AI task
   */
  async complete(request: AITaskRequest): Promise<AICompletionResult> {
    const { provider, model } = this.route(request);

    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not available`);
    }

    try {
      return await providerInstance.complete(request.messages, {
        ...request.options,
        model,
      });
    } catch (error) {
      console.error(`[AI Router] Provider ${provider} failed:`, error);

      // Try fallback chain
      for (const fallbackProvider of this.config.fallbackChain) {
        if (fallbackProvider === provider) continue; // Skip the failed provider

        const fallback = this.providers.get(fallbackProvider);
        if (fallback) {
          try {
            console.log(`[AI Router] Falling back to ${fallbackProvider}`);
            // Use a default model from the fallback provider
            const fallbackModel = this.getDefaultModelForProvider(fallbackProvider);
            return await fallback.complete(request.messages, {
              ...request.options,
              model: fallbackModel,
            });
          } catch (fallbackError) {
            console.error(`[AI Router] Fallback ${fallbackProvider} also failed:`, fallbackError);
          }
        }
      }

      throw error; // All fallbacks failed
    }
  }

  /**
   * Smart routing logic
   */
  private route(request: AITaskRequest): { provider: AIProvider; model: AIModel } {
    // If smart routing is disabled, use default provider
    if (!this.config.enableSmartRouting) {
      return {
        provider: this.config.defaultProvider,
        model: this.getDefaultModelForProvider(this.config.defaultProvider),
      };
    }

    const { type, contextLength = 0, costSensitive = false, requiresJSON = false, priority = 'medium' } = request;

    // ========================================================================
    // LONG-CONTEXT TASKS → Claude (200K context window)
    // ========================================================================
    if (type === 'long-context' || contextLength > 32000) {
      // Use Claude for long documents
      if (this.providers.has('claude')) {
        return {
          provider: 'claude',
          model: costSensitive ? 'claude-3-haiku' : 'claude-3-5-sonnet',
        };
      }
      // Fallback to OpenAI gpt-4o (128K context)
      return { provider: 'openai', model: 'gpt-4o' };
    }

    // ========================================================================
    // SIMPLE CLASSIFICATION/SENTIMENT → Llama (ultra-fast, ultra-cheap)
    // ========================================================================
    if (type === 'classification' || type === 'sentiment') {
      if (this.providers.has('llama')) {
        return {
          provider: 'llama',
          model: contextLength < 4000 ? 'llama-3.1-8b' : 'llama-3.1-70b',
        };
      }
      // Fallback to OpenAI mini
      return { provider: 'openai', model: 'gpt-4o-mini' };
    }

    // ========================================================================
    // EXTRACTION → Llama or OpenAI mini (structured output)
    // ========================================================================
    if (type === 'extraction') {
      if (costSensitive && this.providers.has('llama')) {
        return { provider: 'llama', model: 'llama-3.1-8b' };
      }
      return { provider: 'openai', model: 'gpt-4o-mini' };
    }

    // ========================================================================
    // COMPLEX REASONING → OpenAI or Claude
    // ========================================================================
    if (type === 'reasoning') {
      if (contextLength > 32000 && this.providers.has('claude')) {
        return { provider: 'claude', model: 'claude-3-5-sonnet' };
      }
      return {
        provider: 'openai',
        model: priority === 'high' ? 'gpt-4o' : 'gpt-4o-mini',
      };
    }

    // ========================================================================
    // GENERATION (content creation) → OpenAI or Claude
    // ========================================================================
    if (type === 'generation') {
      // High-quality generation: Claude or GPT-4
      if (priority === 'high' && !costSensitive) {
        if (this.providers.has('claude')) {
          return { provider: 'claude', model: 'claude-3-5-sonnet' };
        }
        return { provider: 'openai', model: 'gpt-4o' };
      }
      // Cost-effective generation: GPT-4o-mini
      return { provider: 'openai', model: 'gpt-4o-mini' };
    }

    // ========================================================================
    // CONVERSATION → OpenAI (best conversational ability)
    // ========================================================================
    if (type === 'conversation') {
      return { provider: 'openai', model: 'gpt-4o' };
    }

    // ========================================================================
    // EMBEDDING → OpenAI only (text-embedding-3-small)
    // ========================================================================
    if (type === 'embedding') {
      return { provider: 'openai', model: 'gpt-4o-mini' }; // Placeholder
    }

    // ========================================================================
    // DEFAULT FALLBACK
    // ========================================================================
    return {
      provider: this.config.defaultProvider,
      model: this.getDefaultModelForProvider(this.config.defaultProvider),
    };
  }

  /**
   * Get default model for a provider
   */
  private getDefaultModelForProvider(provider: AIProvider): AIModel {
    switch (provider) {
      case 'openai':
        return 'gpt-4o-mini';
      case 'claude':
        return 'claude-3-5-sonnet';
      case 'llama':
        return 'llama-3.1-8b';
      default:
        return 'gpt-4o-mini';
    }
  }

  /**
   * Estimate cost for a task before executing
   */
  estimateCost(
    request: AITaskRequest,
    estimatedCompletionTokens: number = 500
  ): { provider: AIProvider; model: AIModel; estimatedCost: number } {
    const { provider, model } = this.route(request);
    const providerInstance = this.providers.get(provider);

    if (!providerInstance) {
      return { provider, model, estimatedCost: 0 };
    }

    const estimatedPromptTokens = this.estimatePromptTokens(request.messages);
    const estimatedCost = providerInstance.estimateCost(
      estimatedPromptTokens,
      estimatedCompletionTokens,
      model
    );

    return { provider, model, estimatedCost };
  }

  /**
   * Rough estimation of prompt tokens (4 chars ≈ 1 token)
   */
  private estimatePromptTokens(messages: { content: string }[]): number {
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a specific provider is available
   */
  async checkProviderHealth(provider: AIProvider): Promise<boolean> {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) return false;

    try {
      return await providerInstance.isAvailable();
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

let routerInstance: AIRouter | null = null;

export function getAIRouter(config?: Partial<RouterConfig>): AIRouter {
  if (!routerInstance) {
    routerInstance = new AIRouter(config);
  }
  return routerInstance;
}

// ============================================================================
// Convenience functions
// ============================================================================

export async function complete(request: AITaskRequest): Promise<AICompletionResult> {
  const router = getAIRouter();
  return router.complete(request);
}

export function estimateCost(
  request: AITaskRequest,
  estimatedCompletionTokens?: number
): ReturnType<AIRouter['estimateCost']> {
  const router = getAIRouter();
  return router.estimateCost(request, estimatedCompletionTokens);
}
