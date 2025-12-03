/**
 * Voice Recording Hook
 * React hook for recording audio using the MediaRecorder API
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  VoiceRecordingState,
  VoiceRecordingResult,
} from '@/types/ask';

interface UseVoiceRecordingOptions {
  onRecordingComplete?: (result: VoiceRecordingResult) => void;
  onError?: (error: Error) => void;
  maxDurationSeconds?: number; // Maximum recording duration
}

interface UseVoiceRecordingReturn {
  state: VoiceRecordingState;
  duration: number; // Current duration in seconds
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  error: Error | null;
  isSupported: boolean;
}

/**
 * Hook for recording voice audio using the MediaRecorder API
 *
 * @param options - Recording options
 * @returns Recording controls and state
 *
 * @example
 * const { state, duration, startRecording, stopRecording, isSupported } = useVoiceRecording({
 *   onRecordingComplete: (result) => {
 *     console.log('Recording complete:', result);
 *   },
 *   maxDurationSeconds: 60,
 * });
 */
export function useVoiceRecording(
  options: UseVoiceRecordingOptions = {}
): UseVoiceRecordingReturn {
  const {
    onRecordingComplete,
    onError,
    maxDurationSeconds = 300, // Default 5 minutes
  } = options;

  const [state, setState] = useState<VoiceRecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [isSupported] = useState(() => {
    // Check if MediaRecorder is supported
    return typeof window !== 'undefined' && 'mediaDevices' in navigator && 'MediaRecorder' in window;
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update duration every 100ms during recording
  useEffect(() => {
    if (state === 'recording') {
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(Math.floor(elapsed));

        // Auto-stop if max duration reached
        if (elapsed >= maxDurationSeconds) {
          stopRecording();
        }
      }, 100);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [state, maxDurationSeconds]);

  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      const err = new Error('MediaRecorder is not supported in this browser');
      setError(err);
      onError?.(err);
      return;
    }

    if (state === 'recording') {
      console.warn('Recording already in progress');
      return;
    }

    try {
      setState('processing');
      setError(null);
      setDuration(0);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      chunksRef.current = [];

      // Determine the best supported MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/mpeg',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('No supported audio MIME type found');
      }

      // Create MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle stop event
      mediaRecorder.onstop = () => {
        const duration = (Date.now() - startTimeRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: selectedMimeType });

        const result: VoiceRecordingResult = {
          blob,
          duration,
          mimeType: selectedMimeType,
        };

        // Clean up
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        setState('idle');
        onRecordingComplete?.(result);
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        const err = new Error('Recording failed');
        setError(err);
        setState('error');
        onError?.(err);

        // Clean up
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      setState('recording');

      console.log('Recording started with MIME type:', selectedMimeType);
    } catch (err) {
      console.error('Failed to start recording:', err);
      const error =
        err instanceof Error ? err : new Error('Failed to start recording');
      setError(error);
      setState('error');
      onError?.(error);

      // Clean up on error
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    }
  }, [isSupported, state, onRecordingComplete, onError]);

  /**
   * Stop recording and process the audio
   */
  const stopRecording = useCallback(() => {
    if (state !== 'recording' || !mediaRecorderRef.current) {
      return;
    }

    setState('processing');
    mediaRecorderRef.current.stop();
  }, [state]);

  /**
   * Cancel recording without processing
   */
  const cancelRecording = useCallback(() => {
    if (state !== 'recording' || !mediaRecorderRef.current) {
      return;
    }

    // Stop the media recorder
    mediaRecorderRef.current.stop();

    // Clear chunks so onstop handler doesn't process them
    chunksRef.current = [];

    // Clean up
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setState('idle');
    setDuration(0);
  }, [state]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  return {
    state,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    error,
    isSupported,
  };
}
