/**
 * Llama Provider (via Groq)
 * Ultra-fast, cost-effective inference for simple tasks
 */

import Groq from 'groq-sdk';
import type {
  IAIProvider,
  AIProvider,
  AIModel,
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
  MODEL_REGISTRY,
} from '../types';

const GROQ_MODEL_MAP: Record<string, string> = {
  'llama-3.1-70b': 'llama-3.1-70b-versatile',
  'llama-3.1-8b': 'llama-3.1-8b-instant',
  'llama-3-70b': 'llama3-70b-8192',
  'llama-3-8b': 'llama3-8b-8192',
};

export class LlamaProvider implements IAIProvider {
  readonly provider: AIProvider = 'llama';
  readonly supportedModels: AIModel[] = [
    'llama-3.1-70b',
    'llama-3.1-8b',
    'llama-3-70b',
    'llama-3-8b',
  ];
  readonly supportsJSON = true;
  readonly maxContextLength = 128000;

  private client: Groq;

  constructor(apiKey?: string) {
    this.client = new Groq({
      apiKey: apiKey || process.env.GROQ_API_KEY,
    });
  }

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult> {
    const model = (options?.model || 'llama-3.1-8b') as AIModel;

    if (!this.supportedModels.includes(model)) {
      throw new Error(`Model ${model} not supported by Llama provider`);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: GROQ_MODEL_MAP[model] || model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
        stop: options?.stopSequences,
        response_format:
          options?.responseFormat === 'json'
            ? { type: 'json_object' }
            : undefined,
      });

      const choice = response.choices[0];
      if (!choice || !choice.message.content) {
        throw new Error('No response from Llama/Groq');
      }

      return {
        content: choice.message.content,
        provider: 'llama',
        model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        finishReason: this.mapFinishReason(choice.finish_reason),
      };
    } catch (error) {
      console.error('[Llama Provider] Error:', error);
      throw new Error(
        `Llama completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test with a minimal request using fastest model
      await this.client.chat.completions.create({
        model: GROQ_MODEL_MAP['llama-3.1-8b'],
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });
      return true;
    } catch {
      return false;
    }
  }

  estimateCost(
    promptTokens: number,
    completionTokens: number,
    model: AIModel
  ): number {
    const capabilities = MODEL_REGISTRY[model];
    if (!capabilities || capabilities.provider !== 'llama') {
      return 0;
    }

    const inputCost = (promptTokens / 1_000_000) * capabilities.costPer1MInputTokens;
    const outputCost = (completionTokens / 1_000_000) * capabilities.costPer1MOutputTokens;

    return inputCost + outputCost;
  }

  private mapFinishReason(
    reason: string | null | undefined
  ): 'stop' | 'length' | 'content_filter' | 'error' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'error';
    }
  }
}
