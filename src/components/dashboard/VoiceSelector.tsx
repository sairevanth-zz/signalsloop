/**
 * VoiceSelector - Component for selecting TTS voice
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { VOICE_OPTIONS, type Voice, getVoiceById } from '@/lib/ai/tts/types';

interface VoiceSelectorProps {
  value: Voice;
  onChange: (voice: Voice) => void;
  compact?: boolean;
  className?: string;
}

export function VoiceSelector({
  value,
  onChange,
  compact = false,
  className,
}: VoiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedVoice = getVoiceById(value);

  if (compact) {
    return (
      <div className={cn('relative', className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
        >
          <Mic className="w-3 h-3" />
          <span>{selectedVoice?.name || 'Voice'}</span>
          <ChevronDown className={cn(
            'w-3 h-3 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              
              {/* Dropdown */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full mt-1 z-50 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
              >
                {VOICE_OPTIONS.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => {
                      onChange(voice.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-slate-700/50 transition-colors',
                      value === voice.id && 'bg-purple-500/20 text-purple-300'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{voice.name}</span>
                      <span className="text-xs text-slate-500">{voice.accent}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{voice.description}</p>
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <label className="text-sm font-medium text-slate-300">Voice</label>
      <div className="grid grid-cols-2 gap-2">
        {VOICE_OPTIONS.map((voice) => (
          <button
            key={voice.id}
            onClick={() => onChange(voice.id)}
            className={cn(
              'flex flex-col items-start p-3 rounded-lg border transition-all text-left',
              value === voice.id
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
            )}
          >
            <div className="flex items-center gap-2 w-full">
              <span className={cn(
                'font-medium',
                value === voice.id ? 'text-purple-300' : 'text-white'
              )}>
                {voice.name}
              </span>
              <span className="text-xs text-slate-500 ml-auto">{voice.gender}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{voice.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-1.5 py-0.5 text-xs bg-slate-700 rounded text-slate-300">
                {voice.accent}
              </span>
              <span className="px-1.5 py-0.5 text-xs bg-slate-700 rounded text-slate-300">
                {voice.style}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Standalone voice preview button
 */
export function VoicePreviewButton({
  voice,
  className,
}: {
  voice: Voice;
  className?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const playPreview = async () => {
    if (isPlaying || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/dashboard/briefing/audio/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice }),
      });

      if (!response.ok) throw new Error('Failed to generate preview');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };

      setIsPlaying(true);
      await audio.play();
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={playPreview}
      disabled={isPlaying || isLoading}
      className={cn(
        'text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50',
        className
      )}
    >
      {isLoading ? 'Loading...' : isPlaying ? 'Playing...' : 'Preview'}
    </button>
  );
}
