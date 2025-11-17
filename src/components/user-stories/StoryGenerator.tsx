'use client';

/**
 * Story Generator Component
 * Generate user stories from themes using AI
 */

import { useState } from 'react';
import { Theme } from '@/types/themes';
import { UserStory } from '@/types/user-stories';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, CheckCircle, XCircle } from 'lucide-react';

interface StoryGeneratorProps {
  theme: Theme;
  projectId: string;
  onStoryGenerated?: (story: UserStory) => void;
  onCancel?: () => void;
}

export function StoryGenerator({
  theme,
  projectId,
  onStoryGenerated,
  onCancel,
}: StoryGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedStory, setGeneratedStory] = useState<UserStory | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/user-stories/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme_id: theme.id,
          project_id: projectId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate user story');
      }

      setGeneratedStory(data.story);

      if (onStoryGenerated) {
        onStoryGenerated(data.story);
      }
    } catch (err) {
      console.error('Error generating story:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setGenerating(false);
    }
  }

  if (generatedStory) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold">User story generated successfully!</span>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">{generatedStory.title}</h3>
          <p className="text-gray-700 mb-3">{generatedStory.full_story}</p>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{generatedStory.story_points} points</span>
            <span>•</span>
            <span>{generatedStory.acceptance_criteria.length} acceptance criteria</span>
            <span>•</span>
            <span className="capitalize">{generatedStory.priority_level} priority</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => onCancel?.()}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Theme Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold mb-1">{theme.theme_name}</h3>
        <p className="text-sm text-gray-700 mb-2">{theme.description}</p>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{theme.frequency} occurrences</span>
          <span>•</span>
          <span>Sentiment: {theme.avg_sentiment.toFixed(2)}</span>
          {theme.is_emerging && (
            <>
              <span>•</span>
              <span className="text-orange-600 font-medium">Emerging Theme</span>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-900">Generation Failed</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="flex-1"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Story...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate User Story
            </>
          )}
        </Button>
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={generating}
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Info */}
      {!generating && !error && (
        <div className="text-xs text-gray-600 bg-gray-50 rounded p-3">
          <p className="font-medium mb-1">What will be generated:</p>
          <ul className="space-y-0.5 ml-4">
            <li>• Professional user story format (As a... I want... So that...)</li>
            <li>• 3-5 specific acceptance criteria with details</li>
            <li>• Story point estimate (Fibonacci scale)</li>
            <li>• Priority level and technical notes</li>
            <li>• Definition of done checklist</li>
          </ul>
        </div>
      )}
    </div>
  );
}
