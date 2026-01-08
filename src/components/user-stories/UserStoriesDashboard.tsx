'use client';

/**
 * User Stories Dashboard
 * Main component for managing AI-generated user stories
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Zap, FileText, TrendingUp, AlertCircle, ArrowRight, Lightbulb } from 'lucide-react';
import { UserStory, UserStoryWithDetails } from '@/types/user-stories';
import { Theme } from '@/types/themes';
import { StoryCard } from './StoryCard';
import { StoryGenerator } from './StoryGenerator';
import Link from 'next/link';

interface UserStoriesDashboardProps {
  projectId: string;
  slug?: string;
}

export function UserStoriesDashboard({ projectId, slug }: UserStoriesDashboardProps) {
  const [stories, setStories] = useState<UserStoryWithDetails[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    total: number;
    ai_generated: number;
    exported_to_jira: number;
  } | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  async function loadData() {
    setLoading(true);
    try {
      // Load user stories first
      let currentStories: UserStoryWithDetails[] = [];
      const storiesRes = await fetch(`/api/user-stories/${projectId}`);
      if (storiesRes.ok) {
        const storiesData = await storiesRes.json();
        currentStories = storiesData.stories || [];
        setStories(currentStories);

        // Calculate stats
        const total = currentStories.length;
        const aiGenerated = currentStories.filter((s: UserStory) => s.generated_by_ai).length;
        const exported = currentStories.filter((s: UserStory) => s.exported_to_jira).length;

        setStats({
          total,
          ai_generated: aiGenerated,
          exported_to_jira: exported,
        });
      }

      // Load themes that don't have stories yet
      const themesRes = await fetch(`/api/themes?projectId=${projectId}`);
      if (themesRes.ok) {
        const themesData = await themesRes.json();
        // Filter themes that don't have stories yet (use freshly fetched stories)
        const themesWithoutStories = (themesData.themes || []).filter(
          (theme: Theme) =>
            !currentStories.some((story: UserStory) => story.theme_id === theme.id)
        );
        setThemes(themesWithoutStories);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleGenerateFromTheme(theme: Theme) {
    setSelectedTheme(theme);
    setShowGenerator(true);
  }

  function handleStoryGenerated(story: UserStory) {
    setShowGenerator(false);
    setSelectedTheme(null);
    loadData(); // Reload data
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading user stories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Stories</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">AI Generated</p>
                <p className="text-3xl font-bold">{stats.ai_generated}</p>
              </div>
              <Zap className="w-10 h-10 text-purple-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Exported to Jira</p>
                <p className="text-3xl font-bold">{stats.exported_to_jira}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600 opacity-20" />
            </div>
          </div>
        </div>
      )}

      {/* Story Generator Modal */}
      {showGenerator && selectedTheme && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Generate User Story</h2>
              <StoryGenerator
                theme={selectedTheme}
                projectId={projectId}
                onStoryGenerated={handleStoryGenerated}
                onCancel={() => {
                  setShowGenerator(false);
                  setSelectedTheme(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Available Themes for Story Generation */}
      {themes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <Zap className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">
                Generate Stories from Themes
              </h3>
              <p className="text-sm text-blue-800 mb-4">
                {themes.length} themes available for user story generation
              </p>
              <div className="space-y-2">
                {themes.slice(0, 5).map((theme) => (
                  <div
                    key={theme.id}
                    className="flex items-center justify-between bg-white p-3 rounded border border-blue-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{theme.theme_name}</p>
                      <p className="text-sm text-gray-600">{theme.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {theme.frequency} occurrences • Sentiment:{' '}
                        {theme.avg_sentiment.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleGenerateFromTheme(theme)}
                      size="sm"
                      className="ml-4"
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      Generate
                    </Button>
                  </div>
                ))}
              </div>
              {themes.length > 5 && (
                <p className="text-sm text-blue-700 mt-3">
                  +{themes.length - 5} more themes available
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Stories List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">User Stories</h2>
          {stories.length > 0 && (
            <p className="text-sm text-gray-600">
              {stories.length} {stories.length === 1 ? 'story' : 'stories'}
            </p>
          )}
        </div>

        {stories.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No User Stories Yet</h3>
            <p className="text-gray-600 mb-6">
              Generate your first user story from a feedback theme using AI
            </p>
            {themes.length > 0 ? (
              <Button onClick={() => handleGenerateFromTheme(themes[0])}>
                <Zap className="w-4 h-4 mr-2" />
                Generate from Theme
              </Button>
            ) : (
              <div className="max-w-2xl mx-auto">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Lightbulb className="w-8 h-8 text-blue-600 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">How to Generate User Stories</h4>
                        <p className="text-sm text-gray-700 mb-4">
                          User stories are generated from feedback themes. Follow these steps:
                        </p>
                        <ol className="text-sm text-gray-700 space-y-2 mb-4">
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-blue-600">1.</span>
                            <span>Collect feedback from your users (via widget or manual entry)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-blue-600">2.</span>
                            <span>Go to your board and use AI to categorize feedback into themes</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-blue-600">3.</span>
                            <span>Return here to generate sprint-ready user stories from those themes</span>
                          </li>
                        </ol>
                        <Button asChild className="w-full sm:w-auto">
                          <Link href={slug ? `/${slug}` : '/app'}>
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Go to Dashboard
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                showTheme={true}
                onUpdate={loadData}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
