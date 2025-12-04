import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';

interface StreamingComponent {
  type: string;
  order: number;
  props: any;
  data_query?: any;
}

interface StreamingState {
  status: string;
  components: StreamingComponent[];
  summary: string;
  followUpQuestions: string[];
  isStreaming: boolean;
  error: string | null;
  generationTime: number | null;
}

export function useStreamingQuery() {
  const [state, setState] = useState<StreamingState>({
    status: '',
    components: [],
    summary: '',
    followUpQuestions: [],
    isStreaming: false,
    error: null,
    generationTime: null,
  });

  const executeStreamingQuery = useCallback(
    async (query: string, role: string, projectId: string) => {
      setState({
        status: 'Connecting...',
        components: [],
        summary: '',
        followUpQuestions: [],
        isStreaming: true,
        error: null,
        generationTime: null,
      });

      try {
        // Get auth token
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch('/api/stakeholder/query-stream', {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, role, projectId }),
        });

        if (!response.ok) {
          throw new Error('Failed to start streaming');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete messages (ending with \n\n)
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || ''; // Keep incomplete message in buffer

          for (const message of messages) {
            if (!message.trim() || !message.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(message.slice(6)); // Remove 'data: ' prefix

              if (data.type === 'status') {
                setState((prev) => ({ ...prev, status: data.message }));
              } else if (data.type === 'plan') {
                setState((prev) => ({
                  ...prev,
                  status: `Generating ${data.componentCount} components...`,
                  summary: data.summary,
                }));
              } else if (data.type === 'component') {
                setState((prev) => ({
                  ...prev,
                  components: [...prev.components, data.component],
                  status: `Generated ${data.index + 1}/${data.total} components`,
                }));
              } else if (data.type === 'complete') {
                setState((prev) => ({
                  ...prev,
                  isStreaming: false,
                  status: 'Complete',
                  summary: data.summary,
                  followUpQuestions: data.followUpQuestions,
                  generationTime: data.generationTime,
                }));
              } else if (data.type === 'error') {
                setState((prev) => ({
                  ...prev,
                  isStreaming: false,
                  error: data.message,
                  status: 'Error',
                }));
              }
            } catch (parseError) {
              console.error('[Streaming] Failed to parse message:', parseError);
            }
          }
        }
      } catch (error: any) {
        console.error('[Streaming Query] Error:', error);
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: error.message,
          status: 'Failed',
        }));
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      status: '',
      components: [],
      summary: '',
      followUpQuestions: [],
      isStreaming: false,
      error: null,
      generationTime: null,
    });
  }, []);

  return {
    ...state,
    executeStreamingQuery,
    reset,
  };
}
