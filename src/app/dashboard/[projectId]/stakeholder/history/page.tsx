'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  History,
  Star,
  Clock,
  TrendingUp,
  Filter,
  Search,
  ChevronDown,
  Play,
  Trash2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface QueryHistory {
  id: string;
  query_text: string;
  user_role: string;
  created_at: string;
  generation_time_ms: number;
  rating?: number;
  is_favorite?: boolean;
  component_count: number;
}

export default function StakeholderHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [queries, setQueries] = useState<QueryHistory[]>([]);
  const [filteredQueries, setFilteredQueries] = useState<QueryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    fetchQueryHistory();
  }, [projectId]);

  useEffect(() => {
    applyFilters();
  }, [queries, roleFilter, sortBy, showFavoritesOnly]);

  const fetchQueryHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stakeholder/history?projectId=${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch history');

      const data = await response.json();
      setQueries(data.queries || []);
    } catch (error) {
      console.error('[History] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...queries];

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(q => q.user_role === roleFilter);
    }

    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(q => q.is_favorite);
    }

    // Sort
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'performance') {
      filtered.sort((a, b) => a.generation_time_ms - b.generation_time_ms);
    }

    setFilteredQueries(filtered);
  };

  const toggleFavorite = async (queryId: string) => {
    try {
      const response = await fetch('/api/stakeholder/history/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId, projectId })
      });

      if (response.ok) {
        setQueries(prev => prev.map(q =>
          q.id === queryId ? { ...q, is_favorite: !q.is_favorite } : q
        ));
      }
    } catch (error) {
      console.error('[History] Error toggling favorite:', error);
    }
  };

  const rerunQuery = (query: QueryHistory) => {
    // Navigate back to main page with query pre-filled
    router.push(`/dashboard/${projectId}/stakeholder?query=${encodeURIComponent(query.query_text)}&role=${query.user_role}`);
  };

  const deleteQuery = async (queryId: string) => {
    if (!confirm('Are you sure you want to delete this query from history?')) return;

    try {
      const response = await fetch(`/api/stakeholder/history/${queryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setQueries(prev => prev.filter(q => q.id !== queryId));
      }
    } catch (error) {
      console.error('[History] Error deleting query:', error);
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      ceo: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      sales: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      engineering: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      marketing: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      customer_success: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      product: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <History className="w-8 h-8 text-purple-600" />
            Query History
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Browse and re-run your past stakeholder queries
          </p>
        </div>

        <Button
          onClick={() => router.push(`/dashboard/${projectId}/stakeholder`)}
          variant="outline"
        >
          New Query
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="ceo">CEO</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="customer_success">Customer Success</SelectItem>
              <SelectItem value="product">Product</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="performance">Fastest</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className="gap-2"
          >
            <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            Favorites Only
          </Button>

          <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
            {filteredQueries.length} {filteredQueries.length === 1 ? 'query' : 'queries'}
          </div>
        </div>
      </Card>

      {/* Query List */}
      {loading ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading query history...</p>
        </Card>
      ) : filteredQueries.length === 0 ? (
        <Card className="p-12 text-center">
          <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No queries found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {showFavoritesOnly
              ? 'You haven\'t favorited any queries yet'
              : 'Start asking questions to build your query history'}
          </p>
          <Button onClick={() => router.push(`/dashboard/${projectId}/stakeholder`)}>
            Ask Your First Question
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQueries.map((query) => (
            <Card key={query.id} className="p-4 hover:border-purple-300 dark:hover:border-purple-600 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getRoleColor(query.user_role)} variant="secondary">
                      {query.user_role.replace('_', ' ')}
                    </Badge>

                    {query.rating && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: query.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                      <Clock className="w-3 h-3" />
                      {new Date(query.created_at).toLocaleDateString()} at{' '}
                      {new Date(query.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <p className="text-gray-900 dark:text-gray-100 font-medium mb-2">
                    {query.query_text}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span>{query.component_count} components</span>
                    <span>•</span>
                    <span>{query.generation_time_ms}ms</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleFavorite(query.id)}
                    className="gap-2"
                  >
                    <Star
                      className={`w-4 h-4 ${query.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
                    />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rerunQuery(query)}
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Re-run
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteQuery(query.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
