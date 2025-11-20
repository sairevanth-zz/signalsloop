/**
 * Hook for AI Spec Generation with Streaming
 */

import { useState, useCallback, useRef } from 'react';
import type {
  GenerateSpecRequest,
  GeneratedSpecResult,
  GenerationProgress,
  GenerationEvent,
} from '@/types/specs';

// ============================================================================
// useSpecGeneration - Stream spec generation with progress
// ============================================================================

export function useSpecGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    step: 'idle',
    progress: 0,
    message: 'Preparing...',
  });
  const [result, setResult] = useState<GeneratedSpecResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const generateSpec = useCallback(async (request: GenerateSpecRequest) => {
    try {
      setIsGenerating(true);
      setError(null);
      setResult(null);
      setProgress({
        step: 'idle',
        progress: 0,
        message: 'Starting generation...',
      });

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/specs/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream available');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode the chunk
        buffer += decoder.decode(value, { stream: true });

        // Process complete events
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData = line.substring(6);

            try {
              const event: GenerationEvent = JSON.parse(eventData);

              if (event.type === 'progress') {
                setProgress(event.data as GenerationProgress);
              } else if (event.type === 'complete') {
                setResult(event.data as GeneratedSpecResult);
                setProgress({
                  step: 'complete',
                  progress: 100,
                  message: 'Generation complete!',
                });
              } else if (event.type === 'error') {
                const errorData = event.data as { error: string };
                throw new Error(errorData.error);
              }
            } catch (parseError) {
              console.error('Error parsing event:', parseError);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Generation cancelled');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
      setProgress({
        step: 'error',
        progress: 0,
        message: 'Generation failed',
      });
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, []);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress({
      step: 'idle',
      progress: 0,
      message: 'Preparing...',
    });
    setResult(null);
    setError(null);
  }, []);

  return {
    generateSpec,
    cancelGeneration,
    reset,
    isGenerating,
    progress,
    result,
    error,
  };
}
