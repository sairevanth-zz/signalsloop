/**
 * Inbox List Component
 * Main list view for unified feedback inbox
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  UnifiedFeedbackItem,
  InboxFilters,
  InboxStats,
  FeedbackCategory,
  FeedbackStatus,
  IntegrationType,
  INTEGRATION_CONFIGS,
} from '@/lib/inbox/types';
import {
  Search,
  RefreshCw,
  Loader2,
  Star,
  Archive,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  MessageSquare,
  ChevronDown,
  Filter,
  Inbox,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  User,
  Building,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface InboxListProps {
  projectId: string;
  onItemSelect?: (item: UnifiedFeedbackItem) => void;
  selectedItemId?: string;
  className?: string;
}

const CATEGORY_META: Record<FeedbackCategory, { label: string; emoji: string; color: string }> = {
  bug: { label: 'Bug', emoji: '🐛', color: 'bg-red-100 text-red-800' },
  feature_request: { label: 'Feature', emoji: '✨', color: 'bg-purple-100 text-purple-800' },
  praise: { label: 'Praise', emoji: '🎉', color: 'bg-green-100 text-green-800' },
  complaint: { label: 'Complaint', emoji: '😤', color: 'bg-orange-100 text-orange-800' },
  question: { label: 'Question', emoji: '❓', color: 'bg-blue-100 text-blue-800' },
  churn_risk: { label: 'Churn Risk', emoji: '⚠️', color: 'bg-yellow-100 text-yellow-800' },
  other: { label: 'Other', emoji: '📝', color: 'bg-gray-100 text-gray-800' },
};

const STATUS_META: Record<FeedbackStatus, { label: string; icon: any }> = {
  new: { label: 'New', icon: Inbox },
  read: { label: 'Read', icon: CheckCircle },
  starred: { label: 'Starred', icon: Star },
  replied: { label: 'Replied', icon: MessageSquare },
  archived: { label: 'Archived', icon: Archive },
  converted: { label: 'Converted', icon: CheckCircle },
  spam: { label: 'Spam', icon: Trash2 },
};

export function InboxList({
  projectId,
  onItemSelect,
  selectedItemId,
  className,
}: InboxListProps) {
  const [items, setItems] = useState<UnifiedFeedbackItem[]>([]);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Selected items for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('originalCreatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  const observerTarget = useRef<HTMLDivElement>(null);
  
  // Fetch inbox items
  const loadItems = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        projectId,
        page: reset ? '1' : page.toString(),
        limit: '20',
        sortField,
        sortDirection,
      });
      
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (sourceFilter !== 'all') params.append('sourceType', sourceFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`/api/inbox/items?${params}`);
      const data = await response.json();
      
      if (data.items) {
        setItems(prev => reset ? data.items : [...prev, ...data.items]);
        setHasMore(data.hasMore);
        setTotal(data.total);
        setPage(prev => reset ? 2 : prev + 1);
      }
    } catch (error) {
      console.error('[InboxList] Error loading items:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, page, statusFilter, categoryFilter, sourceFilter, searchQuery, sortField, sortDirection]);
  
  // Fetch stats
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/inbox/stats?projectId=${projectId}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('[InboxList] Error loading stats:', error);
    }
  }, [projectId]);
  
  // Initial load
  useEffect(() => {
    loadItems(true);
    loadStats();
  }, []);
  
  // Reload on filter changes
  useEffect(() => {
    setPage(1);
    loadItems(true);
  }, [statusFilter, categoryFilter, sourceFilter, sortField, sortDirection]);
  
  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadItems(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadItems();
        }
      },
      { threshold: 0.1 }
    );
    
    const target = observerTarget.current;
    if (target) observer.observe(target);
    
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasMore, loading, loadItems]);
  
  // Handle item actions
  const handleAction = async (itemId: string, action: string, data?: any) => {
    try {
      const response = await fetch(`/api/inbox/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      });
      
      if (response.ok) {
        const updatedItem = await response.json();
        setItems(prev => prev.map(item => 
          item.id === itemId ? updatedItem : item
        ));
      }
    } catch (error) {
      console.error('[InboxList] Action failed:', error);
    }
  };
  
  // Bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedIds.size === 0) return;
    
    try {
      await fetch('/api/inbox/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: Array.from(selectedIds),
          action,
        }),
      });
      
      setSelectedIds(new Set());
      loadItems(true);
    } catch (error) {
      console.error('[InboxList] Bulk action failed:', error);
    }
  };
  
  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };
  
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  
  const getSentimentColor = (score?: number) => {
    if (score === undefined || score === null) return 'text-gray-500';
    if (score > 0.3) return 'text-green-600';
    if (score < -0.3) return 'text-red-600';
    return 'text-gray-600';
  };
  
  const getSourceIcon = (sourceType: IntegrationType) => {
    const config = INTEGRATION_CONFIGS[sourceType];
    return config?.name || sourceType;
  };

  return (
    <div className={className}>
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.newItems}</div>
            <div className="text-sm text-gray-500">New</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.unreadItems}</div>
            <div className="text-sm text-gray-500">Unread</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.starredItems}</div>
            <div className="text-sm text-gray-500">Starred</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.itemsToday}</div>
            <div className="text-sm text-gray-500">Today</div>
          </Card>
        </div>
      )}
      
      {/* Search and Actions Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search feedback..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {(statusFilter !== 'all' || categoryFilter !== 'all' || sourceFilter !== 'all') && (
            <Badge variant="secondary" className="ml-2">Active</Badge>
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPage(1);
            loadItems(true);
            loadStats();
          }}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-4 mb-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.emoji} {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Source</label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {Object.entries(INTEGRATION_CONFIGS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Sort By</label>
              <Select 
                value={`${sortField}-${sortDirection}`} 
                onValueChange={(v) => {
                  const [field, dir] = v.split('-');
                  setSortField(field);
                  setSortDirection(dir as 'asc' | 'desc');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="originalCreatedAt-desc">Newest First</SelectItem>
                  <SelectItem value="originalCreatedAt-asc">Oldest First</SelectItem>
                  <SelectItem value="urgencyScore-desc">Most Urgent</SelectItem>
                  <SelectItem value="sentimentScore-asc">Most Negative</SelectItem>
                  <SelectItem value="engagementScore-desc">Most Engagement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}
      
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="text-sm text-blue-800">
            {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('markRead')}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('archive')}
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
      
      {/* Items List */}
      <div className="space-y-2">
        {/* List Header */}
        <div className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <Checkbox
            checked={items.length > 0 && selectedIds.size === items.length}
            onCheckedChange={toggleSelectAll}
          />
          <div className="flex-1">Feedback</div>
          <div className="w-24 text-center">Category</div>
          <div className="w-24 text-center">Source</div>
          <div className="w-24 text-right">Time</div>
          <div className="w-10"></div>
        </div>
        
        {loading && items.length === 0 ? (
          <Card className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Loading inbox...</p>
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center">
            <Inbox className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">No feedback found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Connect integrations to start receiving feedback'}
            </p>
          </Card>
        ) : (
          items.map((item) => (
            <InboxListItem
              key={item.id}
              item={item}
              isSelected={selectedIds.has(item.id)}
              isActive={selectedItemId === item.id}
              onSelect={() => toggleSelect(item.id)}
              onClick={() => onItemSelect?.(item)}
              onAction={(action, data) => handleAction(item.id, action, data)}
            />
          ))
        )}
        
        {/* Load More */}
        {hasMore && (
          <div ref={observerTarget} className="py-8 text-center">
            {loading && <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />}
          </div>
        )}
        
        {!hasMore && items.length > 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            Showing all {total} items
          </div>
        )}
      </div>
    </div>
  );
}

// Individual list item component
interface InboxListItemProps {
  item: UnifiedFeedbackItem;
  isSelected: boolean;
  isActive: boolean;
  onSelect: () => void;
  onClick: () => void;
  onAction: (action: string, data?: any) => void;
}

function InboxListItem({
  item,
  isSelected,
  isActive,
  onSelect,
  onClick,
  onAction,
}: InboxListItemProps) {
  const categoryMeta = CATEGORY_META[item.category || 'other'];
  
  return (
    <Card
      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
        isActive ? 'ring-2 ring-blue-500' : ''
      } ${!item.readAt ? 'bg-blue-50/30' : ''} ${
        item.urgencyScore && item.urgencyScore >= 4 ? 'border-l-4 border-l-red-500' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(e) => {
            e.stopPropagation?.();
            onSelect();
          }}
          onClick={(e) => e.stopPropagation()}
        />
        
        {/* Star Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction('toggleStarred');
          }}
          className={`p-1 rounded hover:bg-gray-200 ${
            item.starred ? 'text-yellow-500' : 'text-gray-300 hover:text-gray-500'
          }`}
        >
          <Star className="h-4 w-4" fill={item.starred ? 'currentColor' : 'none'} />
        </button>
        
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Author */}
            <span className="font-medium text-gray-900 truncate">
              {item.authorName || item.authorUsername || item.authorEmail || 'Anonymous'}
            </span>
            
            {/* Customer company */}
            {item.customer?.company && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Building className="h-3 w-3" />
                {item.customer.company}
              </span>
            )}
            
            {/* Unread indicator */}
            {!item.readAt && (
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </div>
          
          {/* Title and content preview */}
          {item.title && (
            <div className="font-medium text-gray-800 text-sm truncate">{item.title}</div>
          )}
          <div className="text-gray-600 text-sm line-clamp-2">
            {item.aiSummary || item.content}
          </div>
          
          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="text-xs text-gray-400">+{item.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
        
        {/* Category Badge */}
        <div className="w-24 flex justify-center">
          {item.category && (
            <span className={`text-xs px-2 py-1 rounded-full ${categoryMeta.color}`}>
              {categoryMeta.emoji} {categoryMeta.label}
            </span>
          )}
        </div>
        
        {/* Source */}
        <div className="w-24 text-center">
          <span className="text-xs text-gray-500 capitalize">
            {INTEGRATION_CONFIGS[item.sourceType]?.name || item.sourceType}
          </span>
        </div>
        
        {/* Time */}
        <div className="w-24 text-right text-xs text-gray-500">
          {formatDistanceToNow(new Date(item.originalCreatedAt), { addSuffix: true })}
        </div>
        
        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAction('markRead')}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Read
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('toggleStarred')}>
              <Star className="h-4 w-4 mr-2" />
              {item.starred ? 'Unstar' : 'Star'}
            </DropdownMenuItem>
            {item.sourceUrl && (
              <DropdownMenuItem asChild>
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction('archive')}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onAction('spam')}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Mark as Spam
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
