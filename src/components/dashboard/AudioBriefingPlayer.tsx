/**
 * AudioBriefingPlayer - Audio player component for daily briefings
 * Features: Play/pause, progress bar, speed control, download, waveform visualization
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, RotateCcw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Voice } from '@/lib/ai/tts/types';
import { VoiceSelector } from './VoiceSelector';

interface AudioBriefingPlayerProps {
  audioUrl?: string;
  duration?: number;
  voice?: Voice;
  isLoading?: boolean;
  onGenerate?: (voice: Voice) => void;
  onVoiceChange?: (voice: Voice) => void;
  className?: string;
}

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function AudioBriefingPlayer({
  audioUrl,
  duration = 0,
  voice = 'nova',
  isLoading = false,
  onGenerate,
  onVoiceChange,
  className,
}: AudioBriefingPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState(duration);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);

  // Update duration when audio metadata loads
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setActualDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  // Sync playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, audioUrl]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = clickPosition * actualDuration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [actualDuration]);

  const handleRestart = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!audioUrl) return;

    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `briefing-${new Date().toISOString().split('T')[0]}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [audioUrl]);

  const cycleSpeed = useCallback(() => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    setPlaybackSpeed(PLAYBACK_SPEEDS[nextIndex]);
  }, [playbackSpeed]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = actualDuration > 0 ? (currentTime / actualDuration) * 100 : 0;

  // If no audio URL and can generate
  if (!audioUrl && onGenerate) {
    return (
      <div className={cn(
        'flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20',
        className
      )}>
        <button
          onClick={() => onGenerate(voice)}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              Generate Audio Briefing
            </>
          )}
        </button>
        
        {onVoiceChange && (
          <VoiceSelector
            value={voice}
            onChange={onVoiceChange}
            compact
          />
        )}
        
        <span className="text-xs text-slate-400 ml-auto">
          ~2-3 min to generate
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col gap-3 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20',
      className
    )} data-tour="audio-player">
      {/* Main Controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={togglePlay}
          disabled={!audioUrl || isLoading}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </motion.button>

        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs text-slate-400 w-10 text-right font-mono">
            {formatTime(currentTime)}
          </span>
          
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden cursor-pointer group"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full relative"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            >
              {/* Playhead */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          </div>

          <span className="text-xs text-slate-400 w-10 font-mono">
            {formatTime(actualDuration)}
          </span>
        </div>
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Restart */}
          <button
            onClick={handleRestart}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Volume */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          {/* Volume Slider */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              setIsMuted(false);
            }}
            className="w-16 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full"
          />

          {/* Speed Control */}
          <button
            onClick={cycleSpeed}
            className="px-2 py-1 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
            title="Playback speed"
          >
            {playbackSpeed}x
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Selector */}
          {onVoiceChange && (
            <VoiceSelector
              value={voice}
              onChange={onVoiceChange}
              compact
            />
          )}

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={!audioUrl}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors disabled:opacity-50"
            title="Download audio"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}
    </div>
  );
}
