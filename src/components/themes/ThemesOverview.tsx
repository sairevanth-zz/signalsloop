'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThemeCard, ThemeCardSkeleton } from './ThemeCard';
import { ThemesOverviewProps, Theme, ThemeSortOption } from '@/types/themes';
import {
  filterThemesBySearch,
  filterThemesBySentiment,
  sortThemes,
} from '@/lib/themes/utils';
import {
  Search,
  RefreshCw,
  Filter,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * ThemesOverview Component
 * Main dashboard showing all themes with filtering and sorting
 */
export function ThemesOverview({
  projectId,
  initialThemes = [],
  limit = 10,
  className = '',
}: ThemesOverviewProps) {
  const [themes, setThemes] = useState<Theme[]>(initialThemes);
  const [filteredThemes, setFilteredThemes] = useState<Theme[]>(initialThemes);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<ThemeSortOption>('frequency_desc');
  const [showAll, setShowAll] = useState(false);

  // Load themes on mount
  useEffect(() => {
    loadThemes();
  }, [projectId]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [themes, searchTerm, sentimentFilter, sortBy]);

  const loadThemes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/detect-themes?projectId=${projectId}`);
      const data = await response.json();

      if (data.success) {
        setThemes(data.themes || []);
      } else {
        throw new Error(data.error || 'Failed to load themes');
      }
    } catch (error) {
      console.error('Error loading themes:', error);
      toast.error('Failed to load themes');
    } finally {
      setLoading(false);
    }
  };

  const analyzeThemes = async (force: boolean = false) => {
    setAnalyzing(true);
    try {
      const response = await fetch('/api/detect-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, force }),
      });

      const data = await response.json();

      if (data.success) {
        setThemes(data.themes || []);
        toast.success(
          `Analysis complete! ${data.newCount} new themes, ${data.updatedCount} updated.`
        );
      } else {
        throw new Error(data.error || 'Failed to analyze themes');
      }
    } catch (error) {
      console.error('Error analyzing themes:', error);
      toast.error('Failed to analyze themes');
    } finally {
      setAnalyzing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...themes];

    // Search filter
    if (searchTerm) {
      filtered = filterThemesBySearch(filtered, searchTerm);
    }

    // Sentiment filter
    if (sentimentFilter !== 'all') {
      filtered = filterThemesBySentiment(
        filtered,
        sentimentFilter as 'positive' | 'negative' | 'neutral' | 'mixed'
      );
    }

    // Sort
    filtered = sortThemes(filtered, sortBy);

    setFilteredThemes(filtered);
  };

  const displayedThemes = showAll ? filteredThemes : filteredThemes.slice(0, limit);
  const hasMore = filteredThemes.length > limit;
  const emergingCount = themes.filter(t => t.is_emerging).length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Theme Patterns</h2>
          <p className="text-sm text-gray-600 mt-1">
            Discover recurring themes and patterns in your feedback
          </p>
        </div>
        <Button
          onClick={() => analyzeThemes(false)}
          disabled={analyzing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
          {analyzing ? 'Analyzing...' : 'Re-analyze Themes'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Themes</p>
                <p className="text-2xl font-bold text-gray-900">{themes.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Filter className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Emerging Themes</p>
                <p className="text-2xl font-bold text-orange-600">{emergingCount}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Mentions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {themes.reduce((sum, t) => sum + t.frequency, 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search themes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Sentiment Filter */}
            <div className="w-full md:w-48">
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiments</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="w-full md:w-48">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as ThemeSortOption)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="frequency_desc">Most Mentions</SelectItem>
                  <SelectItem value="frequency_asc">Least Mentions</SelectItem>
                  <SelectItem value="sentiment_desc">Most Positive</SelectItem>
                  <SelectItem value="sentiment_asc">Most Negative</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <ThemeCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredThemes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No themes found
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {themes.length === 0
                  ? "We haven't detected any themes yet. Click 'Re-analyze Themes' to start analyzing your feedback."
                  : 'Try adjusting your filters or search term.'}
              </p>
              {themes.length === 0 && (
                <Button
                  onClick={() => analyzeThemes(false)}
                  disabled={analyzing}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
                  Analyze Themes Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {displayedThemes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                showTrend
                onClick={(theme) => {
                  // Navigate to theme details page
                  window.location.href = `/themes/${theme.id}`;
                }}
              />
            ))}
          </div>

          {/* Show More Button */}
          {hasMore && !showAll && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => setShowAll(true)}
                className="gap-2"
              >
                Show All {filteredThemes.length} Themes
              </Button>
            </div>
          )}

          {showAll && hasMore && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => setShowAll(false)}
                className="gap-2"
              >
                Show Less
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
