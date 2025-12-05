/**
 * ProductHealthScoreCard - Displays composite product health score
 * Combines sentiment, feedback, roadmap, and competitive metrics
 */

'use client';

import React, { useState } from 'react';
import { BentoCard } from './BentoCard';
import { Heart, TrendingUp, TrendingDown, Minus, Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { ProductHealthScore } from '@/lib/ai/product-health-score';
import { getHealthScoreDisplay, getTrendDisplay } from '@/lib/ai/product-health-score';

interface ProductHealthScoreCardProps {
  healthScore: ProductHealthScore;
}

export function ProductHealthScoreCard({ healthScore }: ProductHealthScoreCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const { emoji, color, label } = getHealthScoreDisplay(healthScore.rating);
  const trendDisplay = getTrendDisplay(healthScore.trend);

  // Get trend icon
  const TrendIcon =
    healthScore.trend === 'improving'
      ? TrendingUp
      : healthScore.trend === 'declining'
      ? TrendingDown
      : Minus;

  return (
    <BentoCard colSpan={2} data-tour="health-score">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-400" />
            <h3 className="font-semibold text-white">Product Health Score</h3>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            <Info className="h-3 w-3" />
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Score Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Score */}
            <div>
              <div className="text-5xl font-bold text-white">{healthScore.overall_score}</div>
              <div className="text-sm text-slate-500 mt-1">out of 100</div>
            </div>

            {/* Rating */}
            <div className="flex flex-col gap-1">
              <div className="text-2xl">{emoji}</div>
              <div className={`text-sm font-medium ${color}`}>{label}</div>
            </div>
          </div>

          {/* Trend */}
          <div className="flex flex-col items-end gap-1">
            <div className={`flex items-center gap-1 ${trendDisplay.color}`}>
              <TrendIcon className="h-5 w-5" />
              <span className="text-sm font-medium">{trendDisplay.label}</span>
            </div>
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-2 gap-4">
          {/* Strengths */}
          <div className="rounded-lg border border-green-800/30 bg-green-950/20 p-3">
            <div className="text-xs font-medium text-green-400 mb-2">Strengths</div>
            <ul className="space-y-1">
              {healthScore.strengths.slice(0, 2).map((strength, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-1">
                  <span className="text-green-400">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="rounded-lg border border-orange-800/30 bg-orange-950/20 p-3">
            <div className="text-xs font-medium text-orange-400 mb-2">Areas to Improve</div>
            <ul className="space-y-1">
              {healthScore.weaknesses.slice(0, 2).map((weakness, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-1">
                  <span className="text-orange-400">!</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommendations */}
        {healthScore.recommendations.length > 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <div className="text-xs font-medium text-blue-400 mb-2">Recommended Actions</div>
            <ul className="space-y-1">
              {healthScore.recommendations.slice(0, 2).map((rec, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-1">
                  <span className="text-blue-400">→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Component Breakdown (Expandable) */}
        {showDetails && (
          <div className="border-t border-slate-800 pt-4 space-y-3 animate-in fade-in duration-200">
            <div className="text-xs font-medium text-slate-400 mb-2">Score Components</div>

            {/* Sentiment */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Sentiment ({Math.round(healthScore.components.sentiment.weight * 100)}%)
                </span>
                <span className="text-white font-medium">
                  {healthScore.components.sentiment.score}/100
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-500 transition-all duration-500"
                  style={{ width: `${healthScore.components.sentiment.score}%` }}
                />
              </div>
            </div>

            {/* Roadmap */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Roadmap ({Math.round(healthScore.components.roadmap.weight * 100)}%)
                </span>
                <span className="text-white font-medium">
                  {healthScore.components.roadmap.score}/100
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${healthScore.components.roadmap.score}%` }}
                />
              </div>
            </div>

            {/* Feedback */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Feedback ({Math.round(healthScore.components.feedback.weight * 100)}%)
                </span>
                <span className="text-white font-medium">
                  {healthScore.components.feedback.score}/100
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 transition-all duration-500"
                  style={{ width: `${healthScore.components.feedback.score}%` }}
                />
              </div>
            </div>

            {/* Competitive */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Competitive ({Math.round(healthScore.components.competitive.weight * 100)}%)
                </span>
                <span className="text-white font-medium">
                  {healthScore.components.competitive.score}/100
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{ width: `${healthScore.components.competitive.score}%` }}
                />
              </div>
            </div>

            <div className="text-xs text-slate-500 mt-3">
              Health score is calculated using a weighted algorithm that prioritizes customer sentiment (40%),
              roadmap execution (30%), feedback volume (20%), and competitive position (10%).
            </div>
          </div>
        )}
      </div>
    </BentoCard>
  );
}
