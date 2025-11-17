'use client';

/**
 * User Stories Widget
 * Quick view of user stories for project dashboard
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, ArrowRight, Zap, Target, TrendingUp } from 'lucide-react';
import { UserStory } from '@/types/user-stories';

interface UserStoriesWidgetProps {
  projectId: string;
  limit?: number;
}

export function UserStoriesWidget({ projectId, limit = 3 }: UserStoriesWidgetProps) {
  const [stories, setStories] = useState<UserStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    total: number;
    ai_generated: number;
  } | null>(null);

  useEffect(() => {
    if (projectId) {
      loadStories();
    }
  }, [projectId]);

  async function loadStories() {
    setLoading(true);
    try {
      const response = await fetch(`/api/user-stories/${projectId}?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);

        // Calculate stats
        const total = data.stories?.length || 0;
        const aiGenerated = data.stories?.filter((s: UserStory) => s.generated_by_ai).length || 0;

        setStats({ total, ai_generated: aiGenerated });
      }
    } catch (error) {
      console.error('Error loading user stories:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            User Stories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            User Stories
          </CardTitle>
          <Link href={`/app/user-stories?projectId=${projectId}`}>
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-700">Total Stories</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-purple-700">AI Generated</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{stats.ai_generated}</p>
            </div>
          </div>
        )}

        {/* Recent Stories */}
        {stories.length > 0 ? (
          <div className="space-y-2">
            {stories.slice(0, limit).map((story) => (
              <div
                key={story.id}
                className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-sm line-clamp-2">{story.title}</h4>
                  {story.story_points && (
                    <Badge variant="outline" className="flex-shrink-0">
                      {story.story_points} pts
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                  {story.full_story}
                </p>
                <div className="flex items-center gap-2">
                  {story.generated_by_ai && (
                    <Badge variant="secondary" className="text-xs">
                      <Zap className="w-3 h-3 mr-1" />
                      AI
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      story.priority_level === 'critical'
                        ? 'border-red-300 text-red-700'
                        : story.priority_level === 'high'
                        ? 'border-orange-300 text-orange-700'
                        : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    {story.priority_level}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-4">No user stories yet</p>
            <Link href={`/app/user-stories?projectId=${projectId}`}>
              <Button size="sm">
                <Zap className="w-4 h-4 mr-2" />
                Generate Stories
              </Button>
            </Link>
          </div>
        )}

        {/* CTA */}
        {stories.length > 0 && (
          <Link href={`/app/user-stories?projectId=${projectId}`}>
            <Button variant="outline" className="w-full" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              Manage User Stories
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
