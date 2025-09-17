'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import {
  useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  MessageSquare, 
  Calendar, 
  Clock,
  CheckCircle,
  Target,
  Zap,
  TrendingUp,
  GripVertical
} from 'lucide-react';
import VoteButton from '@/components/VoteButton';
import { CategoryBadge } from '@/components/CategoryBadge';

interface RoadmapPost {
  id: string;
  title: string;
  description?: string;
  author_email?: string;
  status: 'open' | 'planned' | 'in_progress' | 'done' | 'declined';
  created_at: string;
  vote_count: number;
  comment_count: number;
  category?: string;
  estimated_completion?: string;
  completion_date?: string;
  ai_categorized?: boolean;
  ai_confidence?: number;
  ai_reasoning?: string;
}

interface DragDropRoadmapProps {
  posts: Record<string, RoadmapPost[]>;
  onPostMove: (postId: string, newStatus: string) => void;
  onVoteChange: (postId: string, newCount: number) => void;
  projectSlug: string;
}

const statusColumns = {
  open: {
    title: 'Ideas',
    description: 'Community suggestions under consideration',
    color: 'border-gray-300 bg-gray-50',
    headerColor: 'border-gray-300 bg-gray-100',
    icon: <TrendingUp className="w-5 h-5" />,
  },
  planned: {
    title: 'Planned',
    description: 'Features we\'re planning to build',
    icon: <Target className="w-5 h-5" />,
    color: 'border-blue-300 bg-blue-50',
    headerColor: 'border-blue-300 bg-blue-100',
  },
  in_progress: {
    title: 'In Progress',
    description: 'Currently being developed',
    icon: <Zap className="w-5 h-5" />,
    color: 'border-orange-300 bg-orange-50',
    headerColor: 'border-orange-300 bg-orange-100',
  },
  done: {
    title: 'Completed',
    description: 'Features that have been shipped',
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'border-green-300 bg-green-50',
    headerColor: 'border-green-300 bg-green-100',
  }
};

interface SortablePostProps {
  post: RoadmapPost;
  onVoteChange: (postId: string, newCount: number) => void;
}

function SortablePost({ post, onVoteChange }: SortablePostProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card 
        className="hover:shadow-lg transition-all duration-200 cursor-pointer bg-white/90 backdrop-blur-sm border-white/20 hover:scale-[1.02]"
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab hover:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                {post.title}
              </h3>
              
              {post.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {post.description}
                </p>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {post.vote_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {post.comment_count}
                  </span>
                </div>
                
                {post.category && (
                  <CategoryBadge category={post.category} />
                )}
              </div>

              <div className="flex items-center justify-between">
                <VoteButton
                  postId={post.id}
                  initialVoteCount={post.vote_count}
                  onVoteChange={(count) => onVoteChange(post.id, count)}
                  onShowNotification={(message, type) => console.log(`${type}: ${message}`)}
                  size="sm"
                  variant="compact"
                />
                
                <div className="text-xs text-gray-500">
                  <span>
                    {post.status === 'done' && post.completion_date
                      ? new Date(post.completion_date).toLocaleDateString()
                      : new Date(post.created_at).toLocaleDateString()
                    }
                  </span>
                </div>
              </div>

              {/* Estimated completion for planned/in-progress */}
              {(post.status === 'planned' || post.status === 'in_progress') && post.estimated_completion && (
                <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>ETA: {post.estimated_completion}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface DroppableColumnProps {
  status: string;
  config: any;
  statusPosts: RoadmapPost[];
  onVoteChange: (postId: string, newCount: number) => void;
}

function DroppableColumn({ status, config, statusPosts, onVoteChange }: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`rounded-xl border-2 ${config.color} min-h-96 shadow-lg backdrop-blur-sm transition-colors ${
        isOver ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      }`}
    >
      {/* Column Header */}
      <div className={`p-6 rounded-t-xl border-b ${config.headerColor}`}>
        <div className="flex items-center gap-2 mb-2">
          {config.icon}
          <h3 className="font-semibold text-gray-900">{config.title}</h3>
          <Badge variant="secondary" className="ml-auto">
            {statusPosts.length}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          {config.description}
        </p>
      </div>

      {/* Column Content */}
      <div className="p-6 space-y-4">
        <SortableContext items={statusPosts.map(post => post.id)} strategy={verticalListSortingStrategy}>
          {statusPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                {config.icon}
              </div>
              <p className="text-sm">
                {status === 'open' ? 'No ideas yet' :
                 status === 'planned' ? 'Nothing planned' :
                 status === 'in_progress' ? 'Nothing in progress' :
                 'Nothing completed'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Drag posts here to move them
              </p>
            </div>
          ) : (
            statusPosts.map((post) => (
              <SortablePost
                key={post.id}
                post={post}
                onVoteChange={onVoteChange}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default function DragDropRoadmap({ 
  posts, 
  onPostMove, 
  onVoteChange,
  projectSlug 
}: DragDropRoadmapProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    console.log('Drag end:', { activeId: active.id, overId: over?.id });
    
    if (active.id !== over?.id && over?.id) {
      // Find which column the item was dropped on
      const targetStatus = over.id as string;
      console.log('Moving post', active.id, 'to status', targetStatus);
      onPostMove(active.id as string, targetStatus);
    }
    
    setActiveId(null);
  }

  const activePost = activeId ? 
    Object.values(posts).flat().find(post => post.id === activeId) : 
    null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {Object.entries(statusColumns).map(([status, config]) => {
          const statusPosts = posts[status] || [];
          
          return (
            <DroppableColumn
              key={status}
              status={status}
              config={config}
              statusPosts={statusPosts}
              onVoteChange={onVoteChange}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activePost ? (
          <div className="opacity-90">
            <Card className="w-80 shadow-xl">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <GripVertical className="w-4 h-4 text-gray-400 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-2">
                      {activePost.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>👍 {activePost.vote_count}</span>
                      <span>💬 {activePost.comment_count}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
