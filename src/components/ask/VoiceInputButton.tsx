/**
 * Voice Input Button Component
 * Button for recording and transcribing voice input
 */

'use client';

import React, { useState } from 'react';
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import type { VoiceRecordingResult, TranscribeResponse } from '@/types/ask';

interface VoiceInputButtonProps {
  onTranscriptionComplete: (transcription: string, duration: number) => void;
  disabled?: boolean;
  maxDurationSeconds?: number;
  className?: string;
}

/**
 * Button component for voice input with recording and transcription
 *
 * @param props - Component props
 * @returns Voice input button component
 *
 * @example
 * <VoiceInputButton
 *   onTranscriptionComplete={(text, duration) => {
 *     setInputValue(text);
 *   }}
 *   maxDurationSeconds={60}
 * />
 */
export function VoiceInputButton({
  onTranscriptionComplete,
  disabled = false,
  maxDurationSeconds = 120, // Default 2 minutes
  className = '',
}: VoiceInputButtonProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const {
    state,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    error: recordingError,
    isSupported,
  } = useVoiceRecording({
    onRecordingComplete: handleRecordingComplete,
    maxDurationSeconds,
  });

  /**
   * Handle recording completion and transcribe
   */
  async function handleRecordingComplete(result: VoiceRecordingResult) {
    try {
      setIsTranscribing(true);
      setTranscribeError(null);

      // Create form data for API request
      const formData = new FormData();
      formData.append('audio', result.blob, 'recording.webm');

      // Call transcription API
      const response = await fetch('/api/ask/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data: TranscribeResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to transcribe audio');
      }

      if (data.transcription) {
        onTranscriptionComplete(
          data.transcription.text,
          data.transcription.duration
        );
      }
    } catch (error) {
      console.error('Transcription error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to transcribe audio';
      setTranscribeError(errorMessage);
    } finally {
      setIsTranscribing(false);
    }
  }

  /**
   * Handle button click - start or stop recording
   */
  const handleClick = () => {
    if (state === 'recording') {
      stopRecording();
    } else {
      startRecording();
    }
  };

  /**
   * Format duration as MM:SS
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing' || isTranscribing;
  const hasError = recordingError || transcribeError;
  const isDisabled = disabled || isProcessing;

  return (
    <div className="relative">
      {/* Main Button */}
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`
          flex items-center justify-center
          rounded-full p-2
          transition-all duration-200
          ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/50 animate-pulse'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
          ${className}
        `}
        title={isRecording ? 'Stop recording' : 'Start recording'}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isProcessing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isRecording ? (
          <Square className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>

      {/* Duration Display */}
      {isRecording && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="bg-red-500 text-white text-xs font-medium px-3 py-1 rounded-full shadow-lg">
            {formatDuration(duration)}
          </div>
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full shadow-lg">
            Transcribing...
          </div>
        </div>
      )}

      {/* Error Message */}
      {hasError && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64">
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-xs px-3 py-2 rounded-lg shadow-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Recording Error</div>
              <div className="text-red-300/80 mt-0.5">
                {(recordingError || transcribeError)?.message ||
                  recordingError?.toString() ||
                  transcribeError}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel button (only shown while recording) */}
      {isRecording && (
        <button
          type="button"
          onClick={cancelRecording}
          className="absolute -right-10 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white transition-colors"
          title="Cancel recording"
        >
          Cancel
        </button>
      )}

      {/* Max duration warning */}
      {isRecording && duration >= maxDurationSeconds * 0.9 && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 text-xs px-3 py-1 rounded-full">
            {maxDurationSeconds - duration}s remaining
          </div>
        </div>
      )}
    </div>
  );
}
