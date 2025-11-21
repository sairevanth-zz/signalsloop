/**
 * Spec Card Component
 * Reusable card for displaying specs in various contexts
 */

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  MessageSquare,
  MoreVertical,
  Download,
  Edit2,
  Trash2,
  Eye,
  Clock,
} from 'lucide-react';
import type { Spec, SpecStatus } from '@/types/specs';
import { getStatusColorScheme, SPEC_STATUS_LABELS } from '@/types/specs';

interface SpecCardProps {
  spec: Spec;
  projectSlug: string;
  onEdit?: (spec: Spec) => void;
  onView?: (spec: Spec) => void;
  onExport?: (spec: Spec) => void;
  onDelete?: (spec: Spec) => void;
  onStatusChange?: (spec: Spec, newStatus: SpecStatus) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export function SpecCard({
  spec,
  projectSlug,
  onEdit,
  onView,
  onExport,
  onDelete,
  onStatusChange,
  showActions = true,
  compact = false,
  className = '',
}: SpecCardProps) {
  const statusColors = getStatusColorScheme(spec.status);

  const handleClick = () => {
    if (onView) {
      onView(spec);
    }
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow ${className}`}>
      <CardContent className={compact ? 'p-4' : 'p-6'}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <Link
              href={`/${projectSlug}/specs/${spec.id}`}
              className="hover:underline"
            >
              <h3
                className={`font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 ${
                  compact ? 'text-sm' : 'text-lg'
                }`}
              >
                {spec.title}
              </h3>
            </Link>
            <Badge
              className={`${statusColors.bg} ${statusColors.text} text-xs`}
            >
              {SPEC_STATUS_LABELS[spec.status]}
            </Badge>
          </div>

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(spec)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(spec)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.(spec)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onStatusChange?.(spec, 'review')}
                  disabled={spec.status === 'review'}
                >
                  Mark as Review
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onStatusChange?.(spec, 'approved')}
                  disabled={spec.status === 'approved'}
                >
                  Mark as Approved
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(spec)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className={`space-y-2 ${compact ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            {new Date(spec.created_at).toLocaleDateString()}
          </div>

          {spec.linked_feedback_ids.length > 0 && (
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              {spec.linked_feedback_ids.length} feedback item
              {spec.linked_feedback_ids.length !== 1 ? 's' : ''}
            </div>
          )}

          {spec.generation_time_ms && (
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Generated in {(spec.generation_time_ms / 1000).toFixed(1)}s
            </div>
          )}
        </div>

        {!compact && (
          <Link href={`/${projectSlug}/specs/${spec.id}`}>
            <Button variant="outline" className="w-full mt-4">
              View Spec
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
