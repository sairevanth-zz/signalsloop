/**
 * OpenAI Provider
 * Wrapper around OpenAI SDK with unified interface
 */

import OpenAI from 'openai';
import type {
  IAIProvider,
  AIProvider,
  AIModel,
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
  ModelCapabilities,
  MODEL_REGISTRY,
} from '../types';

export class OpenAIProvider implements IAIProvider {
  readonly provider: AIProvider = 'openai';
  readonly supportedModels: AIModel[] = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
  ];
  readonly supportsJSON = true;
  readonly maxContextLength = 128000;

  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult> {
    const model = (options?.model || 'gpt-4o-mini') as AIModel;

    if (!this.supportedModels.includes(model)) {
      throw new Error(`Model ${model} not supported by OpenAI provider`);
    }

    try {
      const response = await this.client.chat.completions.create({
        model,
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
        throw new Error('No response from OpenAI');
      }

      return {
        content: choice.message.content,
        provider: 'openai',
        model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        finishReason: this.mapFinishReason(choice.finish_reason),
      };
    } catch (error) {
      console.error('[OpenAI Provider] Error:', error);
      throw new Error(
        `OpenAI completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test with a minimal request
      await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
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
    if (!capabilities || capabilities.provider !== 'openai') {
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
