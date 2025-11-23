'use client';

/**
 * Roadmap Dashboard Component
 *
 * Main dashboard displaying prioritized roadmap suggestions with:
 * - Filtering by priority levels
 * - Sorting options
 * - Search functionality
 * - Quick actions (export, regenerate)
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Download,
  RefreshCw,
  Search,
  ArrowUpDown,
  Filter,
  Sparkles
} from 'lucide-react';
import { RecommendationCard } from './RecommendationCard';
import { PriorityMatrix } from './PriorityMatrix';
import { ExportDialog } from './ExportDialog';
import { PriorityHistoryViewer } from './PriorityHistoryViewer';
import { toast } from 'sonner';

interface RoadmapSuggestion {
  id: string;
  priority_score: number;
  priority_level: 'critical' | 'high' | 'medium' | 'low';
  reasoning_text?: string;
  why_matters?: string;
  business_impact_text?: string;
  implementation_strategy?: string;
  recommendation_text?: string;
  frequency_score: number;
  sentiment_score: number;
  business_impact_score: number;
  effort_score: number;
  competitive_score: number;
  pinned: boolean;
  status: string;
  themes: {
    theme_name: string;
    frequency: number;
    avg_sentiment: number;
    first_seen: string;
  };
}

interface RoadmapDashboardProps {
  projectId: string;
}

export function RoadmapDashboard({ projectId }: RoadmapDashboardProps) {
  const [suggestions, setSuggestions] = useState<RoadmapSuggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<RoadmapSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Filters
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([
    'critical',
    'high',
    'medium',
    'low'
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'priority_score' | 'theme_name'>('priority_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Fetch suggestions
  useEffect(() => {
    fetchSuggestions();
  }, [projectId]);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [suggestions, selectedPriorities, searchQuery, sortBy, sortOrder]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token'); // Adjust based on auth implementation
      const response = await fetch(
        `/api/roadmap/suggestions?projectId=${projectId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setSuggestions(data.suggestions || []);
      } else {
        toast.error('Failed to load roadmap suggestions');
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast.error('Error loading roadmap');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...suggestions];

    // Filter by priority
    filtered = filtered.filter(s => selectedPriorities.includes(s.priority_level));

    // Search in theme names
    if (searchQuery) {
      filtered = filtered.filter(s =>
        s.themes?.theme_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let compareA, compareB;

      if (sortBy === 'priority_score') {
        compareA = Number(a.priority_score);
        compareB = Number(b.priority_score);
      } else {
        compareA = a.themes?.theme_name || '';
        compareB = b.themes?.theme_name || '';
      }

      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });

    // Pinned items always on top
    filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

    setFilteredSuggestions(filtered);
  };

  const handleGenerateRoadmap = async (withReasoning: boolean = false) => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/roadmap/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          generateReasoning: withReasoning
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        fetchSuggestions();
      } else {
        toast.error('Failed to generate roadmap');
      }
    } catch (error) {
      console.error('Error generating roadmap:', error);
      toast.error('Error generating roadmap');
    } finally {
      setGenerating(false);
    }
  };

  const togglePriority = (priority: string) => {
    setSelectedPriorities(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const priorityColors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading roadmap suggestions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Roadmap Suggestions</h1>
          <p className="text-gray-600 mt-1">
            Prioritized product roadmap based on {suggestions.length} feedback themes
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowExportDialog(true)}
            disabled={suggestions.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button
            onClick={() => handleGenerateRoadmap(false)}
            disabled={generating}
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Roadmap
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search themes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority_score">Priority Score</SelectItem>
              <SelectItem value="theme_name">Theme Name</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleSortOrder}
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>

          {/* View Mode */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
            <Button
              variant={viewMode === 'matrix' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('matrix')}
            >
              Matrix
            </Button>
          </div>
        </div>

        {/* Priority Filters */}
        <div className="flex items-center gap-4">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Priority:
          </Label>

          {(['critical', 'high', 'medium', 'low'] as const).map(priority => (
            <label key={priority} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedPriorities.includes(priority)}
                onCheckedChange={() => togglePriority(priority)}
              />
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${priorityColors[priority]}`} />
                <span className="text-sm capitalize">{priority}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Priority Change History */}
      <PriorityHistoryViewer projectId={projectId} days={30} />

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <p className="text-gray-500">No roadmap suggestions found.</p>
              <Button
                className="mt-4"
                onClick={() => handleGenerateRoadmap(false)}
                disabled={generating}
              >
                Generate Roadmap
              </Button>
            </div>
          ) : (
            filteredSuggestions.map((suggestion) => (
              <RecommendationCard
                key={suggestion.id}
                suggestion={suggestion}
                projectId={projectId}
                onUpdate={fetchSuggestions}
              />
            ))
          )}
        </div>
      ) : (
        <PriorityMatrix
          suggestions={filteredSuggestions}
          onSelectSuggestion={(id) => {
            // Scroll to suggestion in list view
            setViewMode('list');
            setTimeout(() => {
              document.getElementById(`suggestion-${id}`)?.scrollIntoView({
                behavior: 'smooth'
              });
            }, 100);
          }}
        />
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          projectId={projectId}
          onClose={() => setShowExportDialog(false)}
          selectedPriorities={selectedPriorities}
        />
      )}
    </div>
  );
}
