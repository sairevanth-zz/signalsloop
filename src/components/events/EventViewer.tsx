/**
 * Event Viewer Dashboard
 * Real-time event monitoring with filtering and replay capabilities
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  RefreshCw,
  Filter,
  Eye,
  Play,
  Clock,
  AlertCircle,
  CheckCircle2,
  Radio,
  Search,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DomainEvent {
  id: string;
  type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, any>;
  metadata: Record<string, any>;
  version: number;
  created_at: string;
}

interface EventViewerProps {
  projectId: string;
}

export function EventViewer({ projectId }: EventViewerProps) {
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DomainEvent | null>(null);

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [aggregateTypeFilter, setAggregateTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('24h');

  // Real-time subscription
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [projectId, eventTypeFilter, aggregateTypeFilter, timeRange]);

  const loadEvents = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams({
        project_id: projectId,
        time_range: timeRange,
      });

      if (eventTypeFilter !== 'all') {
        params.append('event_type', eventTypeFilter);
      }
      if (aggregateTypeFilter !== 'all') {
        params.append('aggregate_type', aggregateTypeFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/events/viewer?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        toast.error('Failed to load events');
      }
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Error loading events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReplayEvent = async (eventId: string) => {
    try {
      const response = await fetch('/api/events/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      });

      if (response.ok) {
        toast.success('Event replayed successfully');
      } else {
        toast.error('Failed to replay event');
      }
    } catch (error) {
      console.error('Error replaying event:', error);
      toast.error('Error replaying event');
    }
  };

  const getEventTypeColor = (type: string) => {
    if (type.includes('created')) return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (type.includes('updated')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (type.includes('deleted')) return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (type.includes('analyzed')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (type.includes('drafted')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const filteredEvents = events.filter(event => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        event.type.toLowerCase().includes(search) ||
        event.aggregate_type.toLowerCase().includes(search) ||
        JSON.stringify(event.payload).toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-500" />
            Event Viewer
          </h2>
          <p className="text-gray-500 mt-1">
            Monitor and debug system events in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsLive(!isLive)}
            variant={isLive ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <Radio className={`h-4 w-4 ${isLive ? 'animate-pulse' : ''}`} />
            {isLive ? 'Live' : 'Paused'}
          </Button>
          <Button
            onClick={loadEvents}
            variant="outline"
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{events.length}</div>
              <div className="text-sm text-gray-500">Total Events</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {new Set(events.map(e => e.type)).size}
              </div>
              <div className="text-sm text-gray-500">Event Types</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {timeRange === '1h' ? '1h' : timeRange === '24h' ? '24h' : '7d'}
              </div>
              <div className="text-sm text-gray-500">Time Range</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {events.filter(e => e.metadata?.error).length}
              </div>
              <div className="text-sm text-gray-500">Failed Events</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-gray-500 mb-2 block">Event Type</label>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="feedback.created">Feedback Created</SelectItem>
                <SelectItem value="sentiment.analyzed">Sentiment Analyzed</SelectItem>
                <SelectItem value="spec.auto_drafted">Spec Drafted</SelectItem>
                <SelectItem value="theme.threshold_reached">Theme Threshold</SelectItem>
                <SelectItem value="competitor.mentioned">Competitor Mentioned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-500 mb-2 block">Aggregate Type</label>
            <Select value={aggregateTypeFilter} onValueChange={setAggregateTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All aggregates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Aggregates</SelectItem>
                <SelectItem value="post">Post</SelectItem>
                <SelectItem value="spec">Spec</SelectItem>
                <SelectItem value="theme">Theme</SelectItem>
                <SelectItem value="competitor">Competitor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-500 mb-2 block">Time Range</label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-500 mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Events List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Events ({filteredEvents.length})</h3>
        </div>

        <div className="space-y-2">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No events found matching your filters</p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={getEventTypeColor(event.type)}>
                        {event.type}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {event.aggregate_type} • {event.aggregate_id.substring(0, 8)}
                      </span>
                      {event.metadata?.correlation_id && (
                        <span className="text-xs text-blue-500">
                          Chain: {event.metadata.correlation_id.substring(0, 8)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {JSON.stringify(event.payload).substring(0, 100)}...
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.created_at), 'MMM d, HH:mm:ss')}
                      </span>
                      {event.metadata?.source && (
                        <span>Source: {event.metadata.source}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReplayEvent(event.id);
                      }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <Card
            className="w-full max-w-3xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Event Details</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedEvent(null)}
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Event ID</label>
                  <div className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {selectedEvent.id}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <div className="mt-1">
                    <Badge variant="outline" className={getEventTypeColor(selectedEvent.type)}>
                      {selectedEvent.type}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Aggregate Type</label>
                    <div className="text-sm">{selectedEvent.aggregate_type}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Aggregate ID</label>
                    <div className="text-sm font-mono">{selectedEvent.aggregate_id}</div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Payload</label>
                  <pre className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto">
                    {JSON.stringify(selectedEvent.payload, null, 2)}
                  </pre>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Metadata</label>
                  <pre className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleReplayEvent(selectedEvent.id)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Replay Event
                  </Button>
                  <Button onClick={() => setSelectedEvent(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
