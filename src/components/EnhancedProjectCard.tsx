'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Share2,
  Map,
  Settings,
  Sparkles,
  Archive,
  Copy,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckSquare,
  Square,
  Crown,
  Shield,
  Users,
  Target,
  FileText,
  Brain
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro';
  created_at: string;
  posts_count?: number;
  votes_count?: number;
  last_activity?: string;
  weekly_posts_trend?: number;
  widget_installed?: boolean;
  is_owner?: boolean;
  member_role?: 'owner' | 'admin' | 'member';
}

interface EnhancedProjectCardProps {
  project: Project;
  index: number;
  isSelected?: boolean;
  onSelect?: (projectId: string, selected: boolean) => void;
  onArchive?: (projectId: string) => void;
  onDuplicate?: (projectId: string) => void;
  onShare?: (project: Project) => void;
  aiAvailable?: boolean;
}

export default function EnhancedProjectCard({
  project,
  index,
  isSelected = false,
  onSelect,
  onArchive,
  onDuplicate,
  onShare,
  aiAvailable = false
}: EnhancedProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getTrendIcon = (trend?: number) => {
    if (!trend) return <Minus className="w-3 h-3 text-gray-400" />;
    if (trend > 0) return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (trend < 0) return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  const getTrendText = (trend?: number) => {
    if (!trend) return 'No change';
    if (trend > 0) return `+${trend} this week`;
    if (trend < 0) return `${trend} this week`;
    return 'No change';
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(project.id);
    } else {
      toast.info('Duplicate feature coming soon!');
    }
  };

  const handleArchive = () => {
    if (onArchive) {
      onArchive(project.id);
    } else {
      toast.info('Archive feature coming soon!');
    }
  };

  return (
    <div
      className={`bg-white/90 backdrop-blur-sm rounded-xl border transition-all duration-300 hover:scale-[1.02] group relative ${isSelected
        ? 'border-blue-300 shadow-lg ring-2 ring-blue-100'
        : 'border-white/20 shadow-lg hover:shadow-xl'
        }`}
      style={{ animationDelay: `${index * 0.1}s` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* Selection checkbox */}
              {onSelect && (
                <button
                  onClick={() => onSelect(project.id, !isSelected)}
                  className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              )}
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                {project.name}
              </h3>
              {/* Role badge */}
              {!project.is_owner && project.member_role && (
                <Badge
                  variant="outline"
                  className={`ml-2 text-xs ${project.member_role === 'admin'
                    ? 'border-blue-500 text-blue-700 bg-blue-50'
                    : 'border-gray-400 text-gray-700 bg-gray-50'
                    }`}
                >
                  {project.member_role === 'admin' ? (
                    <><Shield className="w-3 h-3 mr-1 inline" />Admin</>
                  ) : (
                    <><Users className="w-3 h-3 mr-1 inline" />Member</>
                  )}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Created {formatDate(project.created_at)}
            </p>
            {project.last_activity && (
              <p className="text-xs text-gray-500 mt-1">
                Last activity: {formatDate(project.last_activity)}
              </p>
            )}
          </div>

          {/* Quick actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/app/roadmap?projectId=${project.id}`}>
                  <Map className="mr-2 h-4 w-4" />
                  AI Roadmap
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/app/user-stories?projectId=${project.id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  User Stories
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${project.slug}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats with trends */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-200 rounded-md flex items-center justify-center">
                  <Eye className="w-3 h-3 text-blue-600" />
                </div>
                <div className="text-lg font-bold text-blue-700">{project.posts_count || 0}</div>
              </div>
              {getTrendIcon(project.weekly_posts_trend)}
            </div>
            <div className="text-xs text-blue-600">Posts</div>
            {project.weekly_posts_trend !== undefined && (
              <div className="text-xs text-blue-500 mt-1">
                {getTrendText(project.weekly_posts_trend)}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-200 rounded-md flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                </div>
                <div className="text-lg font-bold text-green-700">{project.votes_count || 0}</div>
              </div>
            </div>
            <div className="text-xs text-green-600">Votes</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <div className="flex space-x-2">
            <Link href={`/${project.slug}/board`} className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all duration-200 hover:scale-105"
              >
                <Eye className="w-4 h-4 mr-1 transition-transform duration-200 group-hover:scale-110" />
                View Board
              </Button>
            </Link>

            <Link href={`/${project.slug}/competitive`}>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all duration-200 hover:scale-105"
                title="Competitive Intelligence"
              >
                <Target className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
              </Button>
            </Link>

            <Link href={`/${project.slug}/hunter`}>
              <Button
                variant="outline"
                size="sm"
                className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 border-blue-200 hover:from-blue-500/20 hover:to-purple-600/20 transition-all duration-200 hover:scale-105"
                title="AI Feedback Hunter"
              >
                <Brain className="w-4 h-4 text-blue-600 transition-transform duration-200 group-hover:scale-110" />
              </Button>
            </Link>

            <Link href={`/${project.slug}/roadmap`}>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all duration-200 hover:scale-105"
              >
                <Map className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
              </Button>
            </Link>
            <Link href={`/${project.slug}/settings`}>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all duration-200 hover:scale-105"
              >
                <Settings className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
