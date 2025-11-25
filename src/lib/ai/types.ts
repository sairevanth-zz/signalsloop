/**
 * Multi-Provider AI Abstraction Types
 * Unified interface for OpenAI, Claude, and Llama
 */

// ============================================================================
// Core Types
// ============================================================================

export type AIProvider = 'openai' | 'claude' | 'llama';

export type AIModel =
  // OpenAI models
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  // Claude models
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'claude-3-haiku'
  | 'claude-3-5-sonnet'
  // Llama models (via Groq)
  | 'llama-3.1-70b'
  | 'llama-3.1-8b'
  | 'llama-3-70b'
  | 'llama-3-8b';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  responseFormat?: 'text' | 'json';
}

export interface AICompletionResult {
  content: string;
  provider: AIProvider;
  model: AIModel;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
}

// ============================================================================
// Task Types for Smart Routing
// ============================================================================

export type AITaskType =
  | 'classification'     // Simple yes/no, categorization (use Llama)
  | 'sentiment'          // Sentiment analysis (use Llama)
  | 'extraction'         // Extract structured data (use Llama/OpenAI)
  | 'generation'         // Generate text (use OpenAI/Claude)
  | 'long-context'       // Long document analysis (use Claude)
  | 'reasoning'          // Complex reasoning (use OpenAI/Claude)
  | 'conversation'       // Chat/conversational (use OpenAI/Claude)
  | 'embedding';         // Text embedding (use OpenAI)

export interface AITaskRequest {
  type: AITaskType;
  messages: AIMessage[];
  options?: AICompletionOptions;

  // Routing hints
  contextLength?: number;  // Approximate token count of context
  costSensitive?: boolean; // Prefer cheaper models if possible
  requiresJSON?: boolean;  // Must support JSON mode
  priority?: 'low' | 'medium' | 'high'; // Latency vs cost trade-off
}

// ============================================================================
// Provider Interface
// ============================================================================

export interface IAIProvider {
  readonly provider: AIProvider;
  readonly supportedModels: AIModel[];
  readonly supportsJSON: boolean;
  readonly maxContextLength: number;

  /**
   * Create a chat completion
   */
  complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult>;

  /**
   * Test if the provider is configured and available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Estimate cost for a completion (in USD)
   */
  estimateCost(promptTokens: number, completionTokens: number, model: AIModel): number;
}

// ============================================================================
// Model Capabilities & Pricing
// ============================================================================

export interface ModelCapabilities {
  provider: AIProvider;
  model: AIModel;
  maxContextLength: number;
  supportsJSON: boolean;
  costPer1MInputTokens: number;  // USD per 1M input tokens
  costPer1MOutputTokens: number; // USD per 1M output tokens
  avgLatencyMs: number;          // Typical latency
  bestFor: AITaskType[];         // Tasks this model excels at
}

export const MODEL_REGISTRY: Record<AIModel, ModelCapabilities> = {
  // OpenAI models
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    maxContextLength: 128000,
    supportsJSON: true,
    costPer1MInputTokens: 2.50,
    costPer1MOutputTokens: 10.00,
    avgLatencyMs: 2000,
    bestFor: ['reasoning', 'generation', 'conversation'],
  },
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    maxContextLength: 128000,
    supportsJSON: true,
    costPer1MInputTokens: 0.15,
    costPer1MOutputTokens: 0.60,
    avgLatencyMs: 1500,
    bestFor: ['classification', 'extraction', 'sentiment'],
  },
  'gpt-4-turbo': {
    provider: 'openai',
    model: 'gpt-4-turbo',
    maxContextLength: 128000,
    supportsJSON: true,
    costPer1MInputTokens: 10.00,
    costPer1MOutputTokens: 30.00,
    avgLatencyMs: 3000,
    bestFor: ['reasoning', 'generation'],
  },
  'gpt-3.5-turbo': {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    maxContextLength: 16385,
    supportsJSON: true,
    costPer1MInputTokens: 0.50,
    costPer1MOutputTokens: 1.50,
    avgLatencyMs: 800,
    bestFor: ['classification', 'conversation'],
  },

  // Claude models
  'claude-3-opus': {
    provider: 'claude',
    model: 'claude-3-opus',
    maxContextLength: 200000,
    supportsJSON: true,
    costPer1MInputTokens: 15.00,
    costPer1MOutputTokens: 75.00,
    avgLatencyMs: 4000,
    bestFor: ['long-context', 'reasoning', 'generation'],
  },
  'claude-3-5-sonnet': {
    provider: 'claude',
    model: 'claude-3-5-sonnet',
    maxContextLength: 200000,
    supportsJSON: true,
    costPer1MInputTokens: 3.00,
    costPer1MOutputTokens: 15.00,
    avgLatencyMs: 2500,
    bestFor: ['long-context', 'reasoning', 'generation'],
  },
  'claude-3-sonnet': {
    provider: 'claude',
    model: 'claude-3-sonnet',
    maxContextLength: 200000,
    supportsJSON: true,
    costPer1MInputTokens: 3.00,
    costPer1MOutputTokens: 15.00,
    avgLatencyMs: 2500,
    bestFor: ['long-context', 'conversation'],
  },
  'claude-3-haiku': {
    provider: 'claude',
    model: 'claude-3-haiku',
    maxContextLength: 200000,
    supportsJSON: true,
    costPer1MInputTokens: 0.25,
    costPer1MOutputTokens: 1.25,
    avgLatencyMs: 1000,
    bestFor: ['classification', 'extraction', 'sentiment'],
  },

  // Llama models (via Groq)
  'llama-3.1-70b': {
    provider: 'llama',
    model: 'llama-3.1-70b',
    maxContextLength: 128000,
    supportsJSON: true,
    costPer1MInputTokens: 0.59,
    costPer1MOutputTokens: 0.79,
    avgLatencyMs: 500, // Groq is FAST
    bestFor: ['classification', 'extraction', 'reasoning'],
  },
  'llama-3.1-8b': {
    provider: 'llama',
    model: 'llama-3.1-8b',
    maxContextLength: 128000,
    supportsJSON: true,
    costPer1MInputTokens: 0.05,
    costPer1MOutputTokens: 0.08,
    avgLatencyMs: 300, // Ultra-fast
    bestFor: ['classification', 'sentiment', 'extraction'],
  },
  'llama-3-70b': {
    provider: 'llama',
    model: 'llama-3-70b',
    maxContextLength: 8192,
    supportsJSON: true,
    costPer1MInputTokens: 0.59,
    costPer1MOutputTokens: 0.79,
    avgLatencyMs: 500,
    bestFor: ['classification', 'extraction'],
  },
  'llama-3-8b': {
    provider: 'llama',
    model: 'llama-3-8b',
    maxContextLength: 8192,
    supportsJSON: true,
    costPer1MInputTokens: 0.05,
    costPer1MOutputTokens: 0.08,
    avgLatencyMs: 300,
    bestFor: ['classification', 'sentiment'],
  },
};

// ============================================================================
// Routing Configuration
// ============================================================================

export interface RouterConfig {
  // Default provider when no routing rules match
  defaultProvider: AIProvider;

  // Enable smart routing (if false, always use defaultProvider)
  enableSmartRouting: boolean;

  // Cost optimization: prefer cheaper models when quality difference is minimal
  enableCostOptimization: boolean;

  // Fallback chain if primary provider fails
  fallbackChain: AIProvider[];
}

export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  defaultProvider: 'openai',
  enableSmartRouting: true,
  enableCostOptimization: true,
  fallbackChain: ['openai', 'claude', 'llama'],
};
