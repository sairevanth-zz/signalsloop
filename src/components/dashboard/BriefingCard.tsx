/**
 * BriefingCard - Main hero card displaying the AI-generated daily briefing
 * Enhanced with severity-categorized items (🔴🟡🔵🟢)
 * Now includes audio briefing player with TTS support
 */

'use client';

import React, { useState, useCallback } from 'react';
import { BentoCard } from './BentoCard';
import { Sparkles, AlertCircle, Zap, RefreshCw, AlertTriangle, Info, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DailyBriefingContent, BriefingItem } from '@/lib/ai/mission-control';
import type { Voice } from '@/lib/ai/tts/types';
import { AudioBriefingPlayer } from './AudioBriefingPlayer';
import Link from 'next/link';

interface BriefingCardProps {
  briefing: DailyBriefingContent;
  briefingId?: string;
  projectId?: string;
  userName?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const SEVERITY_CONFIG = {
  critical: {
    emoji: '🔴',
    label: 'CRITICAL',
    bgColor: 'bg-red-950/30',
    borderColor: 'border-red-900/50',
    textColor: 'text-red-200',
    labelColor: 'text-red-400',
    icon: AlertCircle
  },
  warning: {
    emoji: '🟡',
    label: 'ATTENTION',
    bgColor: 'bg-yellow-950/30',
    borderColor: 'border-yellow-900/50',
    textColor: 'text-yellow-200',
    labelColor: 'text-yellow-400',
    icon: AlertTriangle
  },
  info: {
    emoji: '🔵',
    label: 'INFO',
    bgColor: 'bg-blue-950/30',
    borderColor: 'border-blue-900/50',
    textColor: 'text-blue-200',
    labelColor: 'text-blue-400',
    icon: Info
  },
  success: {
    emoji: '🟢',
    label: 'GOOD NEWS',
    bgColor: 'bg-green-950/30',
    borderColor: 'border-green-900/50',
    textColor: 'text-green-200',
    labelColor: 'text-green-400',
    icon: CheckCircle2
  }
} as const;

function BriefingItemComponent({ item }: { item: BriefingItem }) {
  const config = SEVERITY_CONFIG[item.severity];
  const Icon = config.icon;

  const Component = item.action?.link ? Link : 'div';
  const linkProps = item.action?.link ? { href: item.action.link } : {};

  return (
    <Component
      {...linkProps}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-all',
        config.bgColor,
        config.borderColor,
        item.action?.link && 'cursor-pointer hover:opacity-80'
      )}
    >
      <span className="text-lg flex-shrink-0 mt-0.5">{config.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className={cn('font-medium', config.textColor)}>
          {item.title}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {item.description}
        </div>
        {item.action && (
          <div className="mt-2 flex items-center gap-2">
            <span className={cn('text-xs font-medium', config.labelColor)}>
              {item.action.label}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-500" />
          </div>
        )}
      </div>
    </Component>
  );
}

export function BriefingCard({ briefing, briefingId, projectId, userName, onRefresh, isRefreshing }: BriefingCardProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [selectedVoice, setSelectedVoice] = useState<Voice>('nova');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleGenerateAudio = useCallback(async (voice: Voice) => {
    if (!projectId || !briefingId) return;
    
    setIsGeneratingAudio(true);
    try {
      const response = await fetch('/api/dashboard/briefing/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, briefingId, voice }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const data = await response.json();
      setAudioUrl(data.audioUrl);
      setAudioDuration(data.duration || 0);
      setSelectedVoice(voice);
    } catch (error) {
      console.error('Error generating audio:', error);
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [projectId, briefingId]);

  const handleVoiceChange = useCallback((voice: Voice) => {
    setSelectedVoice(voice);
    // If audio was already generated, regenerate with new voice
    if (audioUrl && projectId && briefingId) {
      handleGenerateAudio(voice);
    }
  }, [audioUrl, projectId, briefingId, handleGenerateAudio]);

  const hasCritical = briefing.critical_items?.length > 0;
  const hasWarning = briefing.warning_items?.length > 0;
  const hasInfo = briefing.info_items?.length > 0;
  const hasSuccess = briefing.success_items?.length > 0;
  const hasNewFormat = hasCritical || hasWarning || hasInfo || hasSuccess;

  return (
    <BentoCard colSpan={2} rowSpan={2} className="flex flex-col gap-6" data-tour="briefing-card">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {getGreeting()}{userName ? `, ${userName}` : ''}
            </h2>
            <p className="text-sm text-slate-400">Daily Intelligence Briefing</p>
          </div>
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-50"
            title="Regenerate briefing"
          >
            <RefreshCw className={cn('h-5 w-5', isRefreshing && 'animate-spin')} />
          </button>
        )}
      </div>

      {/* Briefing Text */}
      <div className="text-base leading-relaxed text-slate-200">
        {briefing.briefing_text}
      </div>

      {/* Audio Briefing Player */}
      {projectId && briefingId && (
        <AudioBriefingPlayer
          audioUrl={audioUrl || undefined}
          duration={audioDuration}
          voice={selectedVoice}
          isLoading={isGeneratingAudio}
          onGenerate={handleGenerateAudio}
          onVoiceChange={handleVoiceChange}
        />
      )}

      {/* NEW FORMAT: Severity-Categorized Items */}
      {hasNewFormat ? (
        <div className="flex flex-col gap-4">
          {/* Critical Items 🔴 */}
          {hasCritical && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>🔴 CRITICAL</span>
                <span className="ml-auto text-xs bg-red-900/50 px-2 py-0.5 rounded-full">
                  {briefing.critical_items.length}
                </span>
              </div>
              <div className="space-y-2">
                {briefing.critical_items.map((item, index) => (
                  <BriefingItemComponent key={index} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Warning Items 🟡 */}
          {hasWarning && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                <span>🟡 ATTENTION NEEDED</span>
                <span className="ml-auto text-xs bg-yellow-900/50 px-2 py-0.5 rounded-full">
                  {briefing.warning_items.length}
                </span>
              </div>
              <div className="space-y-2">
                {briefing.warning_items.slice(0, 3).map((item, index) => (
                  <BriefingItemComponent key={index} item={item} />
                ))}
                {briefing.warning_items.length > 3 && (
                  <div className="text-xs text-slate-400 px-4">
                    +{briefing.warning_items.length - 3} more items
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success Items 🟢 */}
          {hasSuccess && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>🟢 GOOD NEWS</span>
                <span className="ml-auto text-xs bg-green-900/50 px-2 py-0.5 rounded-full">
                  {briefing.success_items.length}
                </span>
              </div>
              <div className="space-y-2">
                {briefing.success_items.slice(0, 2).map((item, index) => (
                  <BriefingItemComponent key={index} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Info Items 🔵 (collapsed by default) */}
          {hasInfo && (
            <details className="group">
              <summary className="flex items-center gap-2 text-sm font-semibold text-blue-400 cursor-pointer list-none">
                <Info className="h-4 w-4" />
                <span>🔵 INSIGHTS</span>
                <span className="ml-auto text-xs bg-blue-900/50 px-2 py-0.5 rounded-full">
                  {briefing.info_items.length}
                </span>
                <span className="ml-2 text-xs text-slate-500 group-open:rotate-90 transition-transform">
                  ▶
                </span>
              </summary>
              <div className="mt-3 space-y-2">
                {briefing.info_items.map((item, index) => (
                  <BriefingItemComponent key={index} item={item} />
                ))}
              </div>
            </details>
          )}
        </div>
      ) : (
        /* LEGACY FORMAT: Fallback for old briefings */
        <>
          {/* Critical Alerts */}
          {briefing.critical_alerts.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>Critical Alerts</span>
              </div>
              <ul className="space-y-2">
                {briefing.critical_alerts.map((alert, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 rounded-lg bg-red-950/30 border border-red-900/50 px-3 py-2 text-sm text-red-200"
                  >
                    <span className="mt-0.5">🔴</span>
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Actions */}
          {briefing.recommended_actions.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-400">
                <Zap className="h-4 w-4" />
                <span>Recommended Actions</span>
              </div>
              <div className="grid gap-2">
                {briefing.recommended_actions.slice(0, 3).map((action, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm',
                      action.priority === 'high'
                        ? 'border-green-800 bg-green-950/30'
                        : action.priority === 'medium'
                        ? 'border-blue-800 bg-blue-950/30'
                        : 'border-slate-800 bg-slate-900/30'
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-medium text-white">{action.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </BentoCard>
  );
}
