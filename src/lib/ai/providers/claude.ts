/**
 * Claude (Anthropic) Provider
 * Wrapper around Anthropic SDK with unified interface
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  IAIProvider,
  AIProvider,
  AIModel,
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
  MODEL_REGISTRY,
} from '../types';

const CLAUDE_MODEL_MAP: Record<string, string> = {
  'claude-3-opus': 'claude-3-opus-20240229',
  'claude-3-sonnet': 'claude-3-sonnet-20240229',
  'claude-3-haiku': 'claude-3-haiku-20240307',
  'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
};

export class ClaudeProvider implements IAIProvider {
  readonly provider: AIProvider = 'claude';
  readonly supportedModels: AIModel[] = [
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku',
    'claude-3-5-sonnet',
  ];
  readonly supportsJSON = true;
  readonly maxContextLength = 200000;

  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult> {
    const model = (options?.model || 'claude-3-5-sonnet') as AIModel;

    if (!this.supportedModels.includes(model)) {
      throw new Error(`Model ${model} not supported by Claude provider`);
    }

    try {
      // Claude requires system message to be separate
      const systemMessage = messages.find((m) => m.role === 'system');
      const conversationMessages = messages.filter((m) => m.role !== 'system');

      // Convert to Claude format
      const claudeMessages = conversationMessages.map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));

      const response = await this.client.messages.create({
        model: CLAUDE_MODEL_MAP[model] || model,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature ?? 0.7,
        top_p: options?.topP,
        stop_sequences: options?.stopSequences,
        system: systemMessage?.content,
        messages: claudeMessages,
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      return {
        content: textContent.text,
        provider: 'claude',
        model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason: this.mapStopReason(response.stop_reason),
      };
    } catch (error) {
      console.error('[Claude Provider] Error:', error);
      throw new Error(
        `Claude completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test with a minimal request
      await this.client.messages.create({
        model: CLAUDE_MODEL_MAP['claude-3-haiku'],
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
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
    if (!capabilities || capabilities.provider !== 'claude') {
      return 0;
    }

    const inputCost = (promptTokens / 1_000_000) * capabilities.costPer1MInputTokens;
    const outputCost = (completionTokens / 1_000_000) * capabilities.costPer1MOutputTokens;

    return inputCost + outputCost;
  }

  private mapStopReason(
    reason: string | null
  ): 'stop' | 'length' | 'content_filter' | 'error' {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      default:
        return 'error';
    }
  }
}
